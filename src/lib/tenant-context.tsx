"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { cachedFetch } from "@/lib/api-cache";
import { defaultFeatures, type FeatureKey, type Features } from "@/lib/features";

/* ─────────────────────────────────────────────────────────────────────
   Tenant context — provides the current school's identity, branding
   colors, and resolved feature flags to any component in a role layout.

   Mount <TenantProvider> inside each tenant-scoped role layout (student /
   teacher / school-admin). The owner area is NOT tenant-scoped and must
   not mount it.
   ───────────────────────────────────────────────────────────────────── */

export interface Tenant {
  id: string;
  name: string;
  name_alt: string | null;
  slug: string;
  language: string;
  colors: { bg: string; primary: string; secondary: string };
  features: Features;
}

interface TenantContextValue {
  tenant: Tenant | null;
  /** True until the first /api/tenant response resolves. */
  loading: boolean;
  /** True if the feature is enabled for this school. Defaults to ON while loading. */
  hasFeature: (key: FeatureKey) => boolean;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  loading: true,
  // While we don't know yet, assume enabled so enabled modules never flash off.
  hasFeature: () => true,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Cached + in-flight-deduped: the provider + any sibling that also reads
    // /api/tenant share a single network request. 60s TTL so a feature toggle
    // by the owner reflects within a minute (or instantly on next hard load).
    cachedFetch<{ tenant: Tenant | null }>("/api/tenant", 60_000)
      .then((d) => {
        if (cancelled) return;
        setTenant(d.tenant ?? null);
      })
      .catch(() => {
        /* network blip — keep defaults (everything enabled) */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Inject the school's brand colors as CSS variables on <html> so any
  // component can opt into them via var(--brand-primary) etc. This is the
  // plumbing for per-school theming; the current design still uses its own
  // palette until components are migrated to the variables.
  useEffect(() => {
    if (!tenant) return;
    const root = document.documentElement;
    root.style.setProperty("--brand-bg", tenant.colors.bg);
    root.style.setProperty("--brand-primary", tenant.colors.primary);
    root.style.setProperty("--brand-secondary", tenant.colors.secondary);
    return () => {
      root.style.removeProperty("--brand-bg");
      root.style.removeProperty("--brand-primary");
      root.style.removeProperty("--brand-secondary");
    };
  }, [tenant]);

  const features = tenant?.features ?? defaultFeatures();
  const hasFeature = (key: FeatureKey) => {
    // While loading we don't yet know — assume enabled (avoid flashing modules
    // off then on). Once loaded, use the real value.
    if (loading && !tenant) return true;
    return features[key];
  };

  return (
    <TenantContext.Provider value={{ tenant, loading, hasFeature }}>
      {children}
    </TenantContext.Provider>
  );
}

/** Full tenant object + loading state. */
export function useTenant() {
  return useContext(TenantContext);
}

/** Convenience: is a single feature enabled for the current school? */
export function useFeature(key: FeatureKey): boolean {
  return useContext(TenantContext).hasFeature(key);
}
