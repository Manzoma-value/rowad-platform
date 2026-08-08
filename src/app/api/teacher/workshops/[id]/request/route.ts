// POST /api/teacher/workshops/[id]/request
//   The in-app "Request to Join" action. Creates a PENDING WorkshopEnrollment
//   (or resets one from REJECTED back to PENDING — a re-request) and notifies
//   the school's admins. Idempotent: PENDING/WAITLISTED/APPROVED rows are
//   left untouched and no duplicate notification is sent.
//
//   This is separate from the existing QR-scan flow (/api/workshop-enroll),
//   which stays instant/approved by design — only this in-app path is gated.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";
import { notifyProfiles, schoolAdminProfileIds } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  const workshop = await prisma.workshop.findFirst({
    where: { id, school_id: auth.teacher.school_id },
    select: { id: true, title: true, status: true, school_id: true, audience: true },
  });
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!workshop.audience.includes("TEACHERS")) {
    return NextResponse.json({ error: "not_available_for_teachers" }, { status: 403 });
  }
  if (workshop.status === "CLOSED") {
    return NextResponse.json({ error: "workshop_closed" }, { status: 410 });
  }

  const existing = await prisma.workshopEnrollment.findUnique({
    where: { workshop_id_teacher_id: { workshop_id: id, teacher_id: auth.teacher.id } },
    select: { id: true, status: true },
  });

  let shouldNotify = false;
  let enrollmentId: string;

  if (!existing) {
    const created = await prisma.workshopEnrollment.create({
      data: { workshop_id: id, teacher_id: auth.teacher.id, source: "REQUEST", status: "PENDING" },
      select: { id: true },
    });
    enrollmentId = created.id;
    shouldNotify = true;
  } else if (existing.status === "REJECTED") {
    await prisma.workshopEnrollment.update({
      where: { id: existing.id },
      data: { status: "PENDING", decided_by: null, decided_at: null, enrolled_at: new Date(), source: "REQUEST" },
    });
    enrollmentId = existing.id;
    shouldNotify = true;
  } else {
    enrollmentId = existing.id;
  }

  if (shouldNotify) {
    const adminIds = await schoolAdminProfileIds(workshop.school_id);
    await notifyProfiles(adminIds, {
      type: "WORKSHOP_REQUEST",
      title_ar: "طلب انضمام جديد لورشة",
      title_sq: "Kërkesë e re për t'u bashkuar në forum",
      title_en: "New workshop join request",
      body_ar: `${auth.profile.full_name} يطلب الانضمام إلى ورشة «${workshop.title}»`,
      body_sq: `${auth.profile.full_name} kërkon të bashkohet me forumin “${workshop.title}”`,
      body_en: `${auth.profile.full_name} requested to join “${workshop.title}”`,
      href: `/workshops/${id}`,
      actor_id: auth.profile.id,
      event_key: `workshop-request:${enrollmentId}:${Date.now()}`,
    }).catch(() => undefined);
  }

  const status = shouldNotify ? "PENDING" : existing?.status ?? "PENDING";

  return NextResponse.json({ success: true, status });
}
