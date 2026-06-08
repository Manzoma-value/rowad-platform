// api/school-admin/rowad/[id]/route.ts — one submission with full answer-key comparison.
// Admin-only: includes score + correct positions (never exposed to teachers).
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;

  const submission = await prisma.rowadSubmission.findFirst({
    where: { id, school_id: auth.school.id }, // tenant guard
    select: {
      id: true,
      stage: true,
      attempt_number: true,
      status: true,
      score: true,
      total: true,
      submitted_at: true,
      reviewed_at: true,
      reviewer_notes: true,
      teacher: {
        select: {
          id: true,
          onboarding_status: true,
          profile: { select: { full_name: true, email: true, avatar_url: true } },
          classes: { select: { id: true, name: true } },
        },
      },
      reviewer: { select: { full_name: true } },
      placements: {
        select: {
          concept_id: true,
          placed_maqsad: true,
          placed_level: true,
          is_correct: true,
        },
      },
      model: {
        select: {
          levels: {
            orderBy: { order: "asc" },
            select: { order: true, name_ar: true, name_sq: true },
          },
          concepts: {
            select: {
              id: true,
              name_ar: true,
              name_sq: true,
              maqsad: true,
              level: true,
            },
          },
        },
      },
    },
  });

  if (!submission)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ submission });
}
