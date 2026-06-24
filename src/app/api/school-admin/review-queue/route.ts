// GET /api/school-admin/review-queue — all PENDING_REVIEW lessons + quizzes
// in this school, with the teacher + concept they belong to. Default sort:
// oldest-submitted-first so the queue drains FIFO.
//
// Query params:
//   include — "all" to also return APPROVED/REJECTED (history). Defaults to
//             only PENDING_REVIEW.
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const includeAll = url.searchParams.get("include") === "all";
  const statusFilter = includeAll
    ? undefined
    : { in: ["PENDING_REVIEW"] as const };

  const [lessons, quizzes] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        school_id: auth.school.id,
        is_legacy: false,
        ...(statusFilter ? { review_status: statusFilter } : {}),
      },
      orderBy: [{ submitted_at: "asc" }, { created_at: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        review_status: true,
        reviewer_notes: true,
        submitted_at: true,
        reviewed_at: true,
        teacher: { select: { id: true, profile: { select: { full_name: true } } } },
        class: { select: { id: true, name: true } },
        module: {
          select: {
            id: true,
            title: true,
            stage: { select: { id: true, title: true } },
          },
        },
        _count: { select: { contents: true, questions: true } },
      },
      take: 200,
    }),
    prisma.quiz.findMany({
      where: {
        school_id: auth.school.id,
        is_legacy: false,
        ...(statusFilter ? { review_status: statusFilter } : {}),
      },
      orderBy: [{ submitted_at: "asc" }, { created_at: "asc" }],
      select: {
        id: true,
        name: true,
        review_status: true,
        reviewer_notes: true,
        submitted_at: true,
        reviewed_at: true,
        teacher: { select: { id: true, profile: { select: { full_name: true } } } },
        class: { select: { id: true, name: true } },
        module: {
          select: {
            id: true,
            title: true,
            stage: { select: { id: true, title: true } },
          },
        },
        _count: { select: { questions: true } },
      },
      take: 200,
    }),
  ]);

  return NextResponse.json({ lessons, quizzes });
}
