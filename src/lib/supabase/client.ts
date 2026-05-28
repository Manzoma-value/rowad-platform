import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton — one browser client shared across the whole app.
// Creating multiple instances causes lock contention on the auth token in
// localStorage, which produces "Lock was not released within 5000ms" warnings
// (especially in React Strict Mode which double-invokes effects).
let _client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (_client) return _client;
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  return _client;
}