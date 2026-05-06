// api/owner/submissions/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 15;

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!profile || profile.role !== "OWNER") return null;
  return profile;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const ownerProfile = await requireOwner();
  if (!ownerProfile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;

  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id },
    select: {
      id: true,
      review_status: true,
      score: true,
      total: true,
      reviewer_notes: true,
      submitted_at: true,
      reviewed_at: true,
      student: {
        select: {
          id: true,
          profile: { select: { id: true, full_name: true } },
          school: { select: { id: true, name: true } },
        },
      },
      assessment: {
        select: {
          id: true, title: true,
          questions: {
            orderBy: { order: "asc" },
            select: {
              id: true, type: true, text: true, correct_answer: true, order: true,
              options: {
                orderBy: { order: "asc" },
                select: { id: true, text: true, order: true },
              },
            },
          },
        },
      },
      answers: {
        select: {
          id: true,
          question_id: true,
          answer: true,
          is_correct: true,
          question: {
            select: {
              id: true, type: true, text: true, correct_answer: true,
              options: {
                orderBy: { order: "asc" },
                select: { id: true, text: true, order: true },
              },
            },
          },
        },
      },
      assigned_school: { select: { id: true, name: true } },
      reviewer: { select: { id: true, full_name: true } },
    },
  });

  if (!attempt) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  return NextResponse.json({ attempt });
}