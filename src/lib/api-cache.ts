// ─────────────────────────────────────────────────────────────────────
// cachedFetch — client-side fetch with TTL + in-flight de-duplication
//                + sessionStorage persistence (survives hard refresh)
//
// Performance wins over a bare fetch():
//   1. TTL cache — repeated calls within the TTL return the cached value
//      with zero network round-trip.
//   2. In-flight dedupe — if two components request the same URL at the
//      same time (e.g. layout + page both calling /api/student), the
//      second one piggybacks on the first response. One request, two
//      consumers.
//   3. Stale-while-error — if the network fails but we have a cached
//      value, we return it instead of throwing.
//   4. sessionStorage persistence — on a hard refresh the in-memory
//      cache is wiped, but `cachedFetch` will rehydrate it from
//      sessionStorage so the next page render skips the round-trip.
//   5. invalidate / clear — explicit invalidation after mutations also
//      removes the persisted entries.
// ─────────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: unknown;
  ts: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

const SS_PREFIX = "cf:"; // sessionStorage key prefix

function ssAvailable(): boolean {
  try {
    return typeof window !== "undefined" && !!window.sessionStorage;
  } catch {
    return false;
  }
}

function ssGet(url: string): CacheEntry | null {
  if (!ssAvailable()) return null;
  try {
    const raw = window.sessionStorage.getItem(SS_PREFIX + url);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

function ssSet(url: string, entry: CacheEntry): void {
  if (!ssAvailable()) return;
  try {
    window.sessionStorage.setItem(SS_PREFIX + url, JSON.stringify(entry));
  } catch {
    // Quota exceeded or JSON cycle — fail silently, in-memory cache is enough.
  }
}

function ssDelete(url: string): void {
  if (!ssAvailable()) return;
  try {
    window.sessionStorage.removeItem(SS_PREFIX + url);
  } catch {
    /* ignore */
  }
}

function ssDeletePrefix(prefix: string): void {
  if (!ssAvailable()) return;
  try {
    const full = SS_PREFIX + prefix;
    const toRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith(full)) toRemove.push(key);
    }
    for (const k of toRemove) window.sessionStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

function ssClearAll(): void {
  if (!ssAvailable()) return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith(SS_PREFIX)) toRemove.push(key);
    }
    for (const k of toRemove) window.sessionStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

export async function cachedFetch<T>(
  url: string,
  ttlMs = 300_000, // 5 minutes default
): Promise<T> {
  const now = Date.now();
  let hit = cache.get(url);

  // ── 0. Rehydrate from sessionStorage if in-memory miss ──
  if (!hit) {
    const ss = ssGet(url);
    if (ss) {
      hit = ss;
      cache.set(url, ss);
    }
  }

  // ── 1. Fresh cache hit ──
  if (hit && now - hit.ts < ttlMs) {
    return hit.data as T;
  }

  // ── 2. In-flight dedupe ──
  // Two components mounting in the same tick used to fire two requests;
  // now the second one awaits the first one's promise.
  const pending = inflight.get(url);
  if (pending) return pending as Promise<T>;

  // ── 3. Fire a new request and remember the promise ──
  const promise = (async () => {
    try {
      // One automatic retry on transient failures (network error or 5xx).
      // Serverless cold-starts and stale DB sockets recover on the second
      // attempt; without this, one hiccup meant a dead page until the user
      // manually refreshed. 4xx responses are semantic — never retried.
      let res: Response | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          res = await fetch(url);
        } catch {
          res = null; // network-level failure
        }
        if (res && (res.ok || res.status < 500)) break;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
      }
      if (!res || !res.ok) {
        // Stale-while-error: prefer returning known-good data over throwing.
        if (hit) return hit.data as T;
        throw new Error(`Request failed: ${res?.status ?? "network"} ${url}`);
      }
      const data = (await res.json()) as T;
      const entry = { data, ts: Date.now() };
      cache.set(url, entry);
      ssSet(url, entry);
      return data;
    } finally {
      // Always clear the in-flight marker so the next miss can refetch.
      inflight.delete(url);
    }
  })();

  inflight.set(url, promise);
  return promise;
}

/** Drop a specific URL from the cache (call after mutating that resource). */
export function invalidateCache(url: string): void {
  cache.delete(url);
  ssDelete(url);
}

/**
 * Drop everything matching a prefix — handy after big mutations:
 *   invalidatePrefix("/api/school-admin")
 */
export function invalidatePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
  ssDeletePrefix(prefix);
}

/** Nuke the entire client cache (e.g. on logout). */
export function clearCache(): void {
  cache.clear();
  inflight.clear();
  ssClearAll();
}
