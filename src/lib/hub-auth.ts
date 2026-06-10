// src/lib/hub-auth.ts
//
// Resolve which school a profile belongs to. The hub APIs use this to make
// sure the requested school_id matches the caller's own school — otherwise
// any logged-in user could read or post to another school's wall.
import { prisma } from "@/lib/prisma";

/**
 * Return the school_id the given profile belongs to, or null if they don't
 * belong to any school. Walks each role in turn: school-admin → teacher →
 * student. A profile can only sit in exactly one of those role tables.
 */
export async function profileSchoolId(profileId: string): Promise<string | null> {
  // Run all three lookups in parallel — at most one returns a row.
  const [admin, teacher, student] = await Promise.all([
    prisma.schoolAdminMember.findFirst({
      where: { profile_id: profileId },
      select: { school_id: true },
    }),
    prisma.teacher.findUnique({
      where: { profile_id: profileId },
      select: { school_id: true },
    }),
    prisma.student.findUnique({
      where: { profile_id: profileId },
      select: { school_id: true },
    }),
  ]);
  return admin?.school_id ?? teacher?.school_id ?? student?.school_id ?? null;
}
