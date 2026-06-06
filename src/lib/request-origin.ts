// Resolve the absolute origin of an incoming request — the exact scheme + host
// the browser used (e.g. https://rowad-albania.manzoma.sa).
//
// Critical for multi-tenant auth: confirmation / reset emails must link back to
// the SAME subdomain the user signed up on, otherwise the session cookie set
// during /auth/callback lands on the wrong domain and login silently fails.
//
// We prefer the browser-sent Origin header, then reconstruct from the forwarded
// host (Vercel/Cloudflare set x-forwarded-proto), and only fall back to the
// configured site URL as a last resort.
export function requestOrigin(req: Request): string {
  const origin = req.headers.get("origin");
  if (origin) return origin;

  const host = req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
