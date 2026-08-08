// PATCH /api/school-admin/workshops/[id]/requests/[teacherId]
//   Body: { status: "APPROVED" | "REJECTED" | "WAITLISTED" }
//   Decides an existing join request. Never accepts PENDING here — a
//   teacher can only get back to PENDING by requesting/re-requesting
//   themselves (see /api/teacher/workshops/[id]/request).
import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { notifyProfiles } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const DECIDABLE = new Set(["APPROVED", "REJECTED", "WAITLISTED"]);

const COPY: Record<string, { title_ar: string; title_sq: string; title_en: string; body_ar: (t: string) => string; body_sq: (t: string) => string; body_en: (t: string) => string }> = {
  APPROVED: {
    title_ar: "تم قبول طلبك",
    title_sq: "Kërkesa u pranua",
    title_en: "Your request was approved",
    body_ar: (title) => `تم قبول طلبك للانضمام إلى ورشة «${title}»`,
    body_sq: (title) => `Kërkesa jote për t'u bashkuar me forumin “${title}” u pranua`,
    body_en: (title) => `Your request to join “${title}” was approved`,
  },
  REJECTED: {
    title_ar: "تعذّر قبول طلبك",
    title_sq: "Kërkesa nuk u pranua",
    title_en: "Your request was declined",
    body_ar: (title) => `تعذّر قبول طلبك للانضمام إلى ورشة «${title}»`,
    body_sq: (title) => `Kërkesa jote për t'u bashkuar me forumin “${title}” nuk u pranua`,
    body_en: (title) => `Your request to join “${title}” was declined`,
  },
  WAITLISTED: {
    title_ar: "أنت على قائمة الانتظار",
    title_sq: "Je në listën e pritjes",
    title_en: "You've been waitlisted",
    body_ar: (title) => `أنت الآن على قائمة الانتظار لورشة «${title}»`,
    body_sq: (title) => `Je tani në listën e pritjes për forumin “${title}”`,
    body_en: (title) => `You're now waitlisted for “${title}”`,
  },
};

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string; teacherId: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, teacherId } = await context.params;

  let body: { status?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const status = body.status;
  if (!status || !DECIDABLE.has(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const workshop = await prisma.workshop.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true, title: true },
  });
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.workshopEnrollment.findUnique({
    where: { workshop_id_teacher_id: { workshop_id: id, teacher_id: teacherId } },
    select: {
      id: true,
      source: true,
      teacher: { select: { profile_id: true, school_id: true } },
    },
  });
  if (
    !existing ||
    existing.source !== "REQUEST" ||
    existing.teacher.school_id !== auth.school.id
  ) {
    return NextResponse.json({ error: "No request found" }, { status: 404 });
  }

  await prisma.workshopEnrollment.update({
    where: { id: existing.id },
    data: {
      status: status as "APPROVED" | "REJECTED" | "WAITLISTED",
      decided_by: auth.profile.id,
      decided_at: new Date(),
    },
  });

  const copy = COPY[status];
  await notifyProfiles([existing.teacher.profile_id], {
    type: "WORKSHOP_REQUEST_DECISION",
    title_ar: copy.title_ar,
    title_sq: copy.title_sq,
    title_en: copy.title_en,
    body_ar: copy.body_ar(workshop.title),
    body_sq: copy.body_sq(workshop.title),
    body_en: copy.body_en(workshop.title),
    href: `/workshops/${id}`,
    actor_id: auth.profile.id,
    event_key: `workshop-decision:${existing.id}:${status}:${Date.now()}`,
  }).catch(() => undefined);

  return NextResponse.json({ success: true, status });
}
