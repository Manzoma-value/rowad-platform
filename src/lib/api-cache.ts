const cache = new Map<string, { data: unknown; ts: number }>();

export async function cachedFetch<T>(
  url: string,
  ttlMs = 60_000  // 1 minute default
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(url);
  
  if (hit && now - hit.ts < ttlMs) {
    return hit.data as T;
  }
  
  const res = await fetch(url);
  const data = await res.json();
  cache.set(url, { data, ts: now });
  return data as T;
}

export function invalidateCache(url: string) {
  cache.delete(url);
}

export function clearCache() {
  cache.clear();
}