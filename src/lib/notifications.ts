import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type NotificationPayload = {
  type: NotificationType;
  title_ar: string;
  title_sq: string;
  title_en: string;
  body_ar?: string | null;
  body_sq?: string | null;
  body_en?: string | null;
  href: string;
  actor_id?: string | null;
  event_key?: string;
};

export async function notifyProfiles(
  recipientIds: string[],
  payload: NotificationPayload,
) {
  const recipients = [...new Set(recipientIds)].filter(
    (id) => id && id !== payload.actor_id,
  );
  if (!recipients.length) return;

  await prisma.notification.createMany({
    data: recipients.map((recipient_id) => ({
      recipient_id,
      actor_id: payload.actor_id ?? null,
      type: payload.type,
      title_ar: payload.title_ar,
      title_sq: payload.title_sq,
      title_en: payload.title_en,
      body_ar: payload.body_ar?.slice(0, 600) || null,
      body_sq: payload.body_sq?.slice(0, 600) || null,
      body_en: payload.body_en?.slice(0, 600) || null,
      href: payload.href,
      dedupe_key: payload.event_key
        ? `${payload.event_key}:${recipient_id}`
        : null,
    })),
    skipDuplicates: true,
  });
}

export async function schoolAdminProfileIds(schoolId: string) {
  const rows = await prisma.schoolAdminMember.findMany({
    where: { school_id: schoolId, profile: { is_active: true } },
    select: { profile_id: true },
  });
  return rows.map((row) => row.profile_id);
}

export async function workshopTeacherProfileIds(workshopId: string) {
  const teachers = await prisma.teacher.findMany({
    where: {
      OR: [
        { workshop_enrollments: { some: { workshop_id: workshopId } } },
        { workshop_signup_id: workshopId },
        { workshop_attendance: { some: { workshop_id: workshopId } } },
      ],
      profile: { is_active: true },
    },
    select: { profile_id: true },
  });
  return teachers.map((teacher) => teacher.profile_id);
}

export async function schoolProfileIds(schoolId: string) {
  const rows = await prisma.profile.findMany({
    where: {
      is_active: true,
      OR: [
        { school_admin_memberships: { some: { school_id: schoolId } } },
        { teacher: { school_id: schoolId } },
        { student: { school_id: schoolId } },
      ],
    },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export async function teacherGroupProfileIds(groupId: string) {
  const rows = await prisma.teacherGroupMember.findMany({
    where: { group_id: groupId, teacher: { profile: { is_active: true } } },
    select: { teacher: { select: { profile_id: true } } },
  });
  return rows.map((row) => row.teacher.profile_id);
}

export async function classStudentProfileIds(classId: string) {
  const rows = await prisma.student.findMany({
    where: { class_id: classId, profile: { is_active: true } },
    select: { profile_id: true },
  });
  return rows.map((row) => row.profile_id);
}
