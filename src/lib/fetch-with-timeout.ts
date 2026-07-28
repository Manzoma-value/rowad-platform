/**
 * fetch() + JSON parse with a hard timeout, one retry, and support for an
 * external AbortSignal (so a caller can cancel a stale in-flight request,
 * e.g. when the user switches stages before the first request lands).
 *
 * Why this exists: nothing in the codebase previously bounded how long a
 * game-data fetch could take. On a slow or momentarily-dead connection
 * (Supabase pooler cold starts are a known, documented issue in
 * src/lib/prisma.ts) the request would simply never resolve — the UI's
 * loading/submitting flag stayed true forever, which reads to a user as
 * the app having frozen. This guarantees every call either succeeds or
 * throws within a bounded time.
 */
export class FetchTimeoutError extends Error {
  constructor(url: string) {
    super(`Timed out requesting ${url}`);
    this.name = "FetchTimeoutError";
  }
}

type FetchJsonOptions = RequestInit & {
  /** Per-attempt timeout in ms. Default 12s. */
  timeoutMs?: number;
  /** Extra attempts after the first failure. Default 1 (i.e. up to 2 tries total). */
  retries?: number;
};

export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const { timeoutMs = 12_000, retries = 1, signal: externalSignal, ...init } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (externalSignal?.aborted) throw new DOMException("Aborted", "AbortError");

    const controller = new AbortController();
    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener("abort", onExternalAbort);
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal, cache: init.cache ?? "no-store" });
      if (!response.ok) throw new Error(`http_${response.status}`);
      return (await response.json()) as T;
    } catch (error) {
      if (externalSignal?.aborted) throw error; // deliberate cancellation — never retry
      if (controller.signal.aborted && !(error instanceof Error && error.message.startsWith("http_"))) {
        lastError = new FetchTimeoutError(url);
      } else {
        lastError = error;
      }
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        continue;
      }
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("fetch_failed");
}
