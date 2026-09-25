import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { preferredSchoolSlugFromHost } from "@/lib/tenant-host";

export async function preferredSchoolSlugFromCurrentRequest(): Promise<string | null> {
  const headerList = await headers();
  return preferredSchoolSlugFromHost(headerList.get("host"));
}

async function preferredSchoolFromCurrentRequest(): Promise<{
  slug: string | null;
  id: string | null;
}> {
  const headerList = await headers();
  const slug = preferredSchoolSlugFromHost(headerList.get("host"));
  if (!slug) return { slug: null, id: null };

  const school = await prisma.school.findUnique({
    where: { slug },
    select: { id: true },
  });
  // Callers also check the mapped slug. That lets them distinguish an
  // unscoped host from a mapped host whose school is missing, and fail closed
  // in the latter case.
  return { slug, id: school?.id ?? null };
}

export async function isSchoolIdAllowedForCurrentRequest(schoolId: string): Promise<boolean> {
  const preferred = await preferredSchoolFromCurrentRequest();
  if (!preferred.slug) return true;
  return preferred.id === schoolId;
}

export async function resolveSchoolAdminMembership(profileId: string) {
  const preferred = await preferredSchoolFromCurrentRequest();

  if (preferred.slug) {
    if (!preferred.id) return null;
    return prisma.schoolAdminMember.findFirst({
      where: { profile_id: profileId, school_id: preferred.id },
      include: { school: true },
    });
  }

  return prisma.schoolAdminMember.findFirst({
    where: { profile_id: profileId },
    include: { school: true },
  });
}

export async function resolveProfileSchoolId(profileId: string): Promise<string | null> {
  const preferred = await preferredSchoolFromCurrentRequest();

  // On a tenant or the white-label host, a missing mapped school is a
  // configuration error, not permission to expose a different school's data.
  if (preferred.slug && !preferred.id) return null;

  const [admin, teacher, student] = await Promise.all([
    preferred.id
      ? prisma.schoolAdminMember.findFirst({
          where: { profile_id: profileId, school_id: preferred.id },
          select: { school_id: true },
        })
      : prisma.schoolAdminMember.findFirst({
          where: { profile_id: profileId },
          select: { school_id: true },
        }),
    prisma.teacher.findUnique({
      where: {
        profile_id: profileId,
        ...(preferred.id ? { school_id: preferred.id } : {}),
      },
      select: { school_id: true },
    }),
    prisma.student.findUnique({
      where: {
        profile_id: profileId,
        ...(preferred.id ? { school_id: preferred.id } : {}),
      },
      select: { school_id: true },
    }),
  ]);

  return admin?.school_id ?? teacher?.school_id ?? student?.school_id ?? null;
}
