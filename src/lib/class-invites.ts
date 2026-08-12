import { prisma } from "@/lib/prisma";

export async function findValidClassInvite(token: string, schoolSlug?: string) {
  if (!token || token.length > 200) return null;

  const invite = await prisma.classInvite.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      class_id: true,
      school_id: true,
      teacher_id: true,
      is_active: true,
      expires_at: true,
      class: { select: { id: true, name: true, teacher_id: true } },
      school: { select: { id: true, name: true, name_alt: true, slug: true, language: true, is_active: true } },
      teacher: { select: { id: true, profile: { select: { full_name: true } } } },
    },
  });

  if (!invite?.is_active || !invite.school.is_active) return null;
  if (invite.expires_at && invite.expires_at <= new Date()) return null;
  if (schoolSlug && invite.school.slug !== schoolSlug) return null;
  if (invite.class.teacher_id !== invite.teacher_id) return null;
  if (invite.class_id !== invite.class.id || invite.school_id !== invite.school.id) return null;
  return invite;
}
