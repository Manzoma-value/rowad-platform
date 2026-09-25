import { createClient } from "@/lib/supabase/server";

/**
 * Resolve the identity from a cryptographically verified access token.
 * Unlike `getUser()`, asymmetric JWTs are verified locally on the common
 * path, avoiding an Auth-server round trip on every API request.
 */
export async function getVerifiedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;

  if (error || typeof subject !== "string" || !subject) return null;

  return {
    id: subject,
    email: typeof data.claims.email === "string" ? data.claims.email : undefined,
  };
}
