// src/lib/hub-auth.ts
//
// Resolve which school a profile belongs to. The hub APIs use this to make
// sure the requested school_id matches the caller's own school — otherwise
// any logged-in user could read or post to another school's wall.
import { resolveProfileSchoolId } from "@/lib/school-context";

/**
 * Return the school_id the given profile belongs to, or null if they don't
 * belong to any school. Walks each role in turn: school-admin → teacher →
 * student. A profile can only sit in exactly one of those role tables.
 */
export async function profileSchoolId(profileId: string): Promise<string | null> {
  return resolveProfileSchoolId(profileId);
}
