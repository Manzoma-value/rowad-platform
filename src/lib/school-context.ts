import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { preferredSchoolSlugFromHost } from "@/lib/tenant-host";

export async function preferredSchoolSlugFromCurrentRequest(): Promise<string | null> {
  const headerList = await headers();
  return preferredSchoolSlugFromHost(headerList.get("host"));
}

async function preferredSchoolIdFromCurrentRequest(): Promise<string | null> {
  const slug = await preferredSchoolSlugFromCurrentRequest();
  if (!slug) return null;

  const school = await prisma.school.findUnique({
    where: { slug },
    select: { id: true },
  });
  // Callers also check the mapped slug. That lets them distinguish an
  // unscoped host from a mapped host whose school is missing, and fail closed
  // in the latter case.
  return school?.id ?? null;
}

export async function resolveSchoolAdminMembership(profileId: string) {
  const preferredSchoolSlug = await preferredSchoolSlugFromCurrentRequest();
  const preferredSchoolId = await preferredSchoolIdFromCurrentRequest();

  if (preferredSchoolSlug) {
    if (!preferredSchoolId) return null;
    return prisma.schoolAdminMember.findFirst({
      where: { profile_id: profileId, school_id: preferredSchoolId },
      include: { school: true },
    });
  }

  return prisma.schoolAdminMember.findFirst({
    where: { profile_id: profileId },
    include: { school: true },
  });
}

export async function resolveProfileSchoolId(profileId: string): Promise<string | null> {
  const preferredSchoolSlug = await preferredSchoolSlugFromCurrentRequest();
  const preferredSchoolId = await preferredSchoolIdFromCurrentRequest();

  // On a tenant or the white-label host, a missing mapped school is a
  // configuration error, not permission to expose a different school's data.
  if (preferredSchoolSlug && !preferredSchoolId) return null;

  const [admin, teacher, student] = await Promise.all([
    preferredSchoolId
      ? prisma.schoolAdminMember.findFirst({
          where: { profile_id: profileId, school_id: preferredSchoolId },
          select: { school_id: true },
        })
      : prisma.schoolAdminMember.findFirst({
          where: { profile_id: profileId },
          select: { school_id: true },
        }),
    prisma.teacher.findUnique({
      where: {
        profile_id: profileId,
        ...(preferredSchoolId ? { school_id: preferredSchoolId } : {}),
      },
      select: { school_id: true },
    }),
    prisma.student.findUnique({
      where: {
        profile_id: profileId,
        ...(preferredSchoolId ? { school_id: preferredSchoolId } : {}),
      },
      select: { school_id: true },
    }),
  ]);

  return admin?.school_id ?? teacher?.school_id ?? student?.school_id ?? null;
}
