// ─────────────────────────────────────────────────────────────────────
// cachedFetch — per-user client-side TTL cache with in-flight de-duplication
//                and sessionStorage persistence (survives hard refresh)
//
// Performance wins over a bare fetch():
//   1. TTL cache — repeated calls within the TTL return the cached value
//      with zero network round-trip.
//   2. In-flight dedupe — if two components request the same URL at the
//      same time (e.g. layout + page both calling /api/student), the
//      second one piggybacks on the first response. One request, two
//      consumers.
//   3. Stale-while-error — transient failures can use a cached value;
//      authorization failures must never expose an old response.
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
const inflight = new Map<string, { promise: Promise<unknown>; marker: symbol }>();

// Versioned so older URL-only entries can never be reused across accounts.
const SS_PREFIX = "cf:v2:";
let generation = 0;

function keyFor(userId: string, url: string): string {
  return `${userId}:${url}`;
}

async function currentUserId(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const { createClient } = await import("@/lib/supabase/client");
  const { data } = await createClient().auth.getSession();
  return data.session?.user.id ?? null;
}

function ssAvailable(): boolean {
  try {
    return typeof window !== "undefined" && !!window.sessionStorage;
  } catch {
    return false;
  }
}

function ssGet(key: string): CacheEntry | null {
  if (!ssAvailable()) return null;
  try {
    const raw = window.sessionStorage.getItem(SS_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    return Number.isFinite(entry?.ts) ? entry : null;
  } catch {
    return null;
  }
}

function ssSet(key: string, entry: CacheEntry): void {
  if (!ssAvailable()) return;
  const storageKey = SS_PREFIX + key;
  const value = JSON.stringify(entry);
  if (value.length > 2_000_000) return;
  try {
    window.sessionStorage.setItem(storageKey, value);
  } catch {
    // A large admin list can fill the browser's small sessionStorage quota.
    // Evict the oldest cache entries and retry before falling back to memory.
    try {
      const entries: { key: string; ts: number }[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const candidate = window.sessionStorage.key(i);
        if (!candidate?.startsWith(SS_PREFIX) || candidate === storageKey) continue;
        try {
          const stored = JSON.parse(window.sessionStorage.getItem(candidate) ?? "null") as CacheEntry | null;
          entries.push({ key: candidate, ts: stored?.ts ?? 0 });
        } catch {
          entries.push({ key: candidate, ts: 0 });
        }
      }
      entries.sort((a, b) => a.ts - b.ts);
      for (const candidate of entries) {
        window.sessionStorage.removeItem(candidate.key);
        try {
          window.sessionStorage.setItem(storageKey, value);
          return;
        } catch {
          // The next oldest entry may provide enough space.
        }
      }
    } catch {
      // Storage may be disabled entirely; the in-memory cache still works.
    }
    // One response may itself exceed the quota; the in-memory cache still works.
  }
}

function ssDeleteMatching(matches: (key: string) => boolean): void {
  if (!ssAvailable()) return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith(SS_PREFIX) && matches(key.slice(SS_PREFIX.length))) toRemove.push(key);
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
      if (key?.startsWith("cf:")) toRemove.push(key);
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
  const userId = await currentUserId();
  // Never persist an unauthenticated response under a shared key.
  if (!userId) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Request failed: ${response.status} ${url}`);
    return response.json() as Promise<T>;
  }
  const key = keyFor(userId, url);
  const now = Date.now();
  let hit = cache.get(key);

  // ── 0. Rehydrate from sessionStorage if in-memory miss ──
  if (!hit) {
    const ss = ssGet(key);
    if (ss) {
      hit = ss;
      cache.set(key, ss);
    }
  }

  // ── 1. Fresh cache hit ──
  if (hit && now - hit.ts < ttlMs) {
    return hit.data as T;
  }

  // ── 2. In-flight dedupe ──
  // Two components mounting in the same tick used to fire two requests;
  // now the second one awaits the first one's promise.
  const pending = inflight.get(key);
  if (pending) return pending.promise as Promise<T>;

  // ── 3. Fire a new request and remember the promise ──
  const requestGeneration = generation;
  const marker = Symbol(url);
  const promise = (async () => {
    try {
      // One automatic retry on transient failures (network error or 5xx).
      // Serverless cold-starts and stale DB sockets recover on the second
      // attempt; without this, one hiccup meant a dead page until the user
      // manually refreshed. 4xx responses are semantic — never retried.
      let res: Response | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          res = await fetch(url, { cache: "no-store" });
        } catch {
          res = null; // network-level failure
        }
        if (res && (res.ok || res.status < 500)) break;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
      }
      if (requestGeneration !== generation) {
        if (inflight.get(key)?.marker === marker) inflight.delete(key);
        return cachedFetch<T>(url, ttlMs);
      }
      if (!res || !res.ok) {
        if (res?.status === 401 || res?.status === 403) {
          invalidateCache(url);
          throw new Error(`Request failed: ${res.status} ${url}`);
        }
        // Stale-while-error: prefer returning known-good data over throwing.
        if (hit && (!res || res.status >= 500) && (await currentUserId()) === userId) {
          return hit.data as T;
        }
        throw new Error(`Request failed: ${res?.status ?? "network"} ${url}`);
      }
      const data = (await res.json()) as T;
      if ((await currentUserId()) !== userId) {
        throw new Error(`Session changed while loading ${url}`);
      }
      const entry = { data, ts: Date.now() };
      if (requestGeneration === generation) {
        cache.set(key, entry);
        ssSet(key, entry);
      }
      return data;
    } finally {
      // Always clear the in-flight marker so the next miss can refetch.
      if (inflight.get(key)?.marker === marker) inflight.delete(key);
    }
  })();

  inflight.set(key, { promise, marker });
  return promise;
}

/** Drop a specific URL from the cache (call after mutating that resource). */
export function invalidateCache(url: string): void {
  generation++;
  for (const key of cache.keys()) if (key.endsWith(`:${url}`)) cache.delete(key);
  for (const key of inflight.keys()) if (key.endsWith(`:${url}`)) inflight.delete(key);
  ssDeleteMatching((key) => key.endsWith(`:${url}`));
}

/**
 * Drop everything matching a prefix — handy after big mutations:
 *   invalidatePrefix("/api/school-admin")
 */
export function invalidatePrefix(prefix: string): void {
  generation++;
  for (const key of cache.keys()) {
    if (key.slice(key.indexOf(":") + 1).startsWith(prefix)) cache.delete(key);
  }
  for (const key of inflight.keys()) {
    if (key.slice(key.indexOf(":") + 1).startsWith(prefix)) inflight.delete(key);
  }
  ssDeleteMatching((key) => key.slice(key.indexOf(":") + 1).startsWith(prefix));
}

/** Nuke the entire client cache (e.g. on logout). */
export function clearCache(): void {
  generation++;
  cache.clear();
  inflight.clear();
  ssClearAll();
}
