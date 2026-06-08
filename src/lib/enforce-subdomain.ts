// Client-side guard: keep a school's users on their own subdomain.
//
// A SCHOOL_ADMIN / TEACHER / STUDENT who lands on the main/owner host
// (rowad.manzoma.sa) or on the wrong school's subdomain is redirected to their
// own school subdomain (<slug>.manzoma.sa), preserving the current path.
//
// Sessions are stored per-subdomain, so after the redirect the user signs in on
// their subdomain (intended multi-tenant behavior).
//
// SAFE BY DESIGN:
//  - Runs only in the browser.
//  - Only acts on the real production root domain — never on localhost, Vercel
//    previews, raw IPs, or any non-manzoma host (so local dev is untouched).
//  - No-op when already on the correct subdomain (prevents redirect loops).

import { parseHost, ROOT_DOMAIN } from "@/lib/tenant-host";

export function enforceTenantSubdomain(slug?: string | null): void {
  if (typeof window === "undefined") return;
  if (!slug) return;

  const host = window.location.host.toLowerCase(); // may include :port
  const hostname = host.split(":")[0];

  // Only enforce on the real root domain (skip localhost / previews / IPs / dev).
  const onRootDomain = hostname === ROOT_DOMAIN || hostname.endsWith("." + ROOT_DOMAIN);
  if (!onRootDomain) return;

  // Current subdomain's slug (null for the apex / reserved owner host).
  const current = parseHost(host).slug;
  if (current === slug) return; // already correct → nothing to do

  const target = `${window.location.protocol}//${slug}.${ROOT_DOMAIN}${window.location.pathname}${window.location.search}`;
  window.location.replace(target);
}
