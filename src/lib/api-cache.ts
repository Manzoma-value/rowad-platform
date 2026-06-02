// ─────────────────────────────────────────────────────────────────────
// cachedFetch — client-side fetch with TTL + in-flight de-duplication
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
//   4. invalidate / clear — explicit invalidation after mutations.
// ─────────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: unknown;
  ts: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export async function cachedFetch<T>(
  url: string,
  ttlMs = 300_000, // 5 minutes default
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(url);

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
      const res = await fetch(url);
      if (!res.ok) {
        // Stale-while-error: prefer returning known-good data over throwing.
        if (hit) return hit.data as T;
        throw new Error(`Request failed: ${res.status} ${url}`);
      }
      const data = (await res.json()) as T;
      cache.set(url, { data, ts: Date.now() });
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
}

/**
 * Drop everything matching a prefix — handy after big mutations:
 *   invalidatePrefix("/api/school-admin")
 */
export function invalidatePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/** Nuke the entire client cache (e.g. on logout). */
export function clearCache(): void {
  cache.clear();
  inflight.clear();
}
