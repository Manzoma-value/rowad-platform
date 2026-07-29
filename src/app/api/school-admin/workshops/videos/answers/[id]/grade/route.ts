import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { notifyProfiles } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const GradeSchema = z.object({
  is_correct: z.boolean(),
  feedback: z.string().trim().max(1200).optional().nullable(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const parsed = GradeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await prisma.workshopVideoAnswer.findFirst({
    where: {
      id,
      question: {
        type: "TEXT",
        video: { workshop: { school_id: auth.school.id } },
      },
    },
    select: {
      id: true,
      attempt_id: true,
      question_id: true,
      attempt: {
        select: {
          teacher: { select: { profile_id: true } },
          video: {
            select: {
              title: true,
              workshop: { select: { id: true, title: true } },
            },
          },
        },
      },
    },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const answer = await prisma.workshopVideoAnswer.update({
    where: { id },
    data: {
      is_correct: parsed.data.is_correct,
      grading_status: "GRADED",
      feedback: parsed.data.feedback || null,
      grader_id: auth.profile.id,
      graded_at: new Date(),
    },
    select: {
      id: true,
      is_correct: true,
      grading_status: true,
      feedback: true,
      graded_at: true,
      grader: { select: { full_name: true } },
    },
  });

  const allAnswers = await prisma.workshopVideoAnswer.findMany({
    where: { attempt_id: existing.attempt_id },
    select: { is_correct: true },
  });
  const attempt = await prisma.workshopVideoAttempt.update({
    where: { id: existing.attempt_id },
    data: { score: allAnswers.filter((item) => item.is_correct).length },
    select: { score: true, total: true, completed_at: true },
  });

  await notifyProfiles([existing.attempt.teacher.profile_id], {
    type: "WORKSHOP_ANSWER",
    title_ar: "تم تقييم إجابتك",
    title_sq: "Përgjigjja juaj u vlerësua",
    title_en: "Your answer was graded",
    body_ar: `تم تقييم إجابتك الكتابية في «${existing.attempt.video.title}»`,
    body_sq: `Përgjigjja juaj me shkrim në “${existing.attempt.video.title}” u vlerësua`,
    body_en: `Your written answer in “${existing.attempt.video.title}” was graded`,
    href: `/workshops/${existing.attempt.video.workshop.id}`,
    actor_id: auth.profile.id,
    event_key: `workshop-answer-graded:${id}:${answer.graded_at?.toISOString()}`,
  }).catch(() => undefined);

  return NextResponse.json({ answer, attempt });
}
