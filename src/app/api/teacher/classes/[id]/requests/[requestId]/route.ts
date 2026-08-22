import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyProfiles } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-auth";

const DecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string; requestId: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ id, requestId }, body] = await Promise.all([
    context.params,
    req.json().catch(() => null),
  ]);
  const parsed = DecisionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision" }, { status: 400 });

  const joinRequest = await prisma.classJoinRequest.findFirst({
    where: {
      id: requestId,
      class_id: id,
      teacher_id: auth.teacher.id,
      school_id: auth.teacher.school_id,
    },
    select: {
      id: true,
      status: true,
      student_id: true,
      class: { select: { id: true, name: true } },
      student: { select: { profile_id: true, profile: { select: { full_name: true } } } },
    },
  });
  if (!joinRequest) return NextResponse.json({ error: "Join request not found" }, { status: 404 });
  if (joinRequest.status !== "PENDING") {
    return NextResponse.json({ error: "This request has already been decided" }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const decided = await tx.classJoinRequest.updateMany({
        where: { id: requestId, status: "PENDING", teacher_id: auth.teacher.id },
        data: { status: parsed.data.decision, decided_at: new Date() },
      });
      if (decided.count !== 1) throw new Error("request_already_decided");

      if (parsed.data.decision === "APPROVED") {
        const assigned = await tx.student.updateMany({
          where: {
            id: joinRequest.student_id,
            school_id: auth.teacher.school_id,
            class_id: null,
          },
          data: { class_id: id, onboarding_status: "CLASS_ASSIGNED" },
        });
        if (assigned.count !== 1) throw new Error("student_already_assigned");
      } else {
        await tx.student.updateMany({
          where: { id: joinRequest.student_id, school_id: auth.teacher.school_id, class_id: null },
          data: { onboarding_status: "SCHOOL_ASSIGNED" },
        });
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "decision_failed";
    if (message === "request_already_decided" || message === "student_already_assigned") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    throw error;
  }

  const approved = parsed.data.decision === "APPROVED";
  await notifyProfiles([joinRequest.student.profile_id], {
    actor_id: auth.profile.id,
    type: "SYSTEM",
    title_ar: approved ? "تم قبول طلب الانضمام" : "تعذر قبول طلب الانضمام",
    title_sq: approved ? "Kërkesa u miratua" : "Kërkesa nuk u miratua",
    title_en: approved ? "Class request approved" : "Class request not approved",
    body_ar: approved
      ? `تمت إضافتك إلى مجموعة «${joinRequest.class.name}». يمكنك بدء رحلتك الآن.`
      : `لم تتم الموافقة على طلب مجموعة «${joinRequest.class.name}». يمكنك متابعة مسار التعيين المعتاد.`,
    body_sq: approved
      ? `U shtove në grupin “${joinRequest.class.name}”. Tani mund të fillosh.`
      : `Kërkesa për grupin “${joinRequest.class.name}” nuk u miratua. Mund të vazhdosh procesin e zakonshëm të caktimit.`,
    body_en: approved
      ? `You were added to “${joinRequest.class.name}”. You can begin now.`
      : `Your request for “${joinRequest.class.name}” was not approved. You can continue through standard placement.`,
    href: approved ? "/student/welcome" : "/student/school-assigned",
    event_key: `class-join-decision:${joinRequest.id}`,
  }).catch((error) => console.error("Class join decision notification failed:", error));

  return NextResponse.json({ success: true, status: parsed.data.decision });
}
