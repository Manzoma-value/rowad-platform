// ─────────────────────────────────────────────────────────────────────
// Subdomain → tenant resolution.
//
// Each school lives on its own subdomain: <slug>.manzoma.sa
// A few subdomains are RESERVED for the main / owner experience and are
// NOT treated as tenant schools:
//   - rowad        → the white-label owner/demo host
//   - www / app / admin / "" (apex) → main site
//
// This helper is pure (no Next.js imports) so it runs in middleware AND in
// the browser (the school landing page uses it to build clean links).
// ─────────────────────────────────────────────────────────────────────

/** The apex domain in production. Override via env for other environments. */
export const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase() || "manzoma.sa";

/** Subdomains that are NOT tenant schools (main site / owner console). */
const RESERVED = new Set(["", "www", "app", "admin", "rowad"]);

/** The reserved host used for the investor/demo white-label experience. */
export const WHITE_LABEL_HOST = "rowad";

/** The school slug whose demo data powers school-admin views on rowad.manzoma.sa. */
export const WHITE_LABEL_DEMO_SCHOOL_SLUG =
  process.env.NEXT_PUBLIC_WHITE_LABEL_DEMO_SCHOOL_SLUG?.toLowerCase() ||
  "rowad-demo";

/** Closed accounts allowed to authenticate on the investor/demo host. */
export const WHITE_LABEL_ADMIN_EMAIL = "admin@manzoma.sa";

export const WHITE_LABEL_TEACHER_EMAIL = "teacher@manzoma.sa";

export const WHITE_LABEL_STUDENT_EMAIL = "student@manzoma.sa";

export type WhiteLabelRole = "SCHOOL_ADMIN" | "TEACHER" | "STUDENT";

export function whiteLabelRoleForEmail(
  email: string | null | undefined,
): WhiteLabelRole | null {
  const normalized = email?.trim().toLowerCase();
  if (normalized === WHITE_LABEL_ADMIN_EMAIL) return "SCHOOL_ADMIN";
  if (normalized === WHITE_LABEL_TEACHER_EMAIL) return "TEACHER";
  if (normalized === WHITE_LABEL_STUDENT_EMAIL) return "STUDENT";
  return null;
}

export function isWhiteLabelAccountAllowed(email: string | null | undefined): boolean {
  return whiteLabelRoleForEmail(email) !== null;
}

export function isWhiteLabelAccountRoleAllowed(
  email: string | null | undefined,
  role: string | null | undefined,
): boolean {
  return whiteLabelRoleForEmail(email) === role;
}

export interface HostInfo {
  /** The school slug when this host is a tenant subdomain, else null. */
  slug: string | null;
  /** True when this host maps to a specific school subdomain. */
  isTenant: boolean;
}

const NOT_TENANT: HostInfo = { slug: null, isTenant: false };

/**
 * Extract the tenant slug from a Host header value.
 *
 * Examples (ROOT_DOMAIN = "manzoma.sa"):
 *   rowad-albania.manzoma.sa  → { slug: "rowad-albania", isTenant: true }
 *   rowad.manzoma.sa          → { slug: null, isTenant: false }   (owner host)
 *   manzoma.sa                → { slug: null, isTenant: false }   (apex)
 *   rowad-albania.localhost   → { slug: "rowad-albania", isTenant: true }  (dev)
 *   localhost:3000            → { slug: null, isTenant: false }
 *   abc.vercel.app            → { slug: null, isTenant: false }   (preview)
 */
export function parseHost(rawHost: string | null | undefined): HostInfo {
  if (!rawHost) return NOT_TENANT;

  const host = rawHost.split(":")[0].trim().toLowerCase(); // strip :port
  if (!host) return NOT_TENANT;

  let sub: string;

  if (host.endsWith("." + ROOT_DOMAIN)) {
    sub = host.slice(0, -(ROOT_DOMAIN.length + 1));
  } else if (host === ROOT_DOMAIN) {
    sub = "";
  } else if (host.endsWith(".localhost")) {
    // local dev: rowad-albania.localhost:3000 (Chrome resolves *.localhost → 127.0.0.1)
    sub = host.slice(0, -".localhost".length);
  } else if (host === "localhost") {
    sub = "";
  } else {
    // Vercel preview deploys (*.vercel.app), raw IPs, unknown hosts → main site.
    return NOT_TENANT;
  }

  // Defensive: if somehow a multi-label subdomain arrives, take the first label.
  sub = sub.split(".")[0];

  if (RESERVED.has(sub)) return NOT_TENANT;
  return { slug: sub, isTenant: true };
}

function subdomainFromHost(rawHost: string | null | undefined): string | null {
  if (!rawHost) return null;

  const host = rawHost.split(":")[0].trim().toLowerCase();
  if (!host) return null;

  let sub: string;

  if (host.endsWith("." + ROOT_DOMAIN)) {
    sub = host.slice(0, -(ROOT_DOMAIN.length + 1));
  } else if (host === ROOT_DOMAIN) {
    sub = "";
  } else if (host.endsWith(".localhost")) {
    sub = host.slice(0, -".localhost".length);
  } else if (host === "localhost") {
    sub = "";
  } else {
    return null;
  }

  return sub.split(".")[0] ?? "";
}

export function isWhiteLabelHost(rawHost: string | null | undefined): boolean {
  return subdomainFromHost(rawHost) === WHITE_LABEL_HOST;
}

/**
 * The school slug that should scope school-bound data for the current host.
 * Tenant subdomains use their own slug. The reserved rowad host uses a demo
 * school so admins can present a clean white-label environment.
 */
export function preferredSchoolSlugFromHost(rawHost: string | null | undefined): string | null {
  const tenant = parseHost(rawHost);
  if (tenant.slug) return tenant.slug;
  if (isWhiteLabelHost(rawHost)) return WHITE_LABEL_DEMO_SCHOOL_SLUG;
  return null;
}

/**
 * Bind a school-scoped public token or request body to the current hostname.
 * Unknown/apex hosts remain unscoped for previews and owner tooling; tenant
 * and white-label hosts may only resolve records belonging to their mapped
 * school.
 */
export function isSchoolSlugAllowedOnHost(
  rawHost: string | null | undefined,
  schoolSlug: string | null | undefined,
): boolean {
  const expectedSlug = preferredSchoolSlugFromHost(rawHost);
  if (!expectedSlug) return true;
  return schoolSlug?.trim().toLowerCase() === expectedSlug;
}

/**
 * Build the absolute base URL for a given school slug, e.g.
 *   originForSlug("rowad-albania", "https:")  → "https://rowad-albania.manzoma.sa"
 * Used when we must redirect a user to their correct subdomain.
 */
export function originForSlug(slug: string, protocol = "https:"): string {
  return `${protocol}//${slug}.${ROOT_DOMAIN}`;
}
