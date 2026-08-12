import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacher = await prisma.teacher.findUnique({
    where: { id: auth.teacher.id },
    select: {
      id: true,
      created_at: true,
      onboarding_status: true,
      profile: {
        select: {
          id: true, created_at: true, full_name: true, email: true,
          avatar_url: true, avatar_path: true,
        },
      },
      application: true,
      classes: {
        orderBy: { created_at: "desc" },
        select: {
          id: true, name: true, created_at: true,
          students: {
            orderBy: { created_at: "asc" },
            select: {
              id: true, city: true, age: true, onboarding_status: true,
              profile: { select: { id: true, full_name: true, email: true, avatar_url: true } },
            },
          },
          _count: { select: { students: true, lessons: true, quizzes: true, announcements: true } },
        },
      },
      lessons: {
        orderBy: { updated_at: "desc" },
        select: {
          id: true, title: true, review_status: true, is_published: true, updated_at: true,
          class: { select: { id: true, name: true } },
          _count: { select: { contents: true, questions: true, attempts: true } },
        },
      },
      quizzes: {
        orderBy: { created_at: "desc" },
        select: {
          id: true, name: true, review_status: true, created_at: true,
          class: { select: { id: true, name: true } },
          _count: { select: { questions: true, attempts: true } },
        },
      },
      group_memberships: {
        orderBy: { joined_at: "desc" },
        select: {
          joined_at: true,
          group: {
            select: {
              id: true, name: true, description: true, max_members: true,
              leader_teacher_id: true,
              leader: { select: { profile: { select: { full_name: true } } } },
              _count: { select: { members: true, assessments: true, announcements: true } },
            },
          },
        },
      },
      ratings_received: {
        orderBy: { updated_at: "desc" },
        select: {
          assessment_id: true, rater_teacher_id: true, scores: true, updated_at: true,
          rater: { select: { profile: { select: { full_name: true, avatar_url: true } } } },
          assessment: {
            select: {
              id: true, title: true, status: true,
              traits: {
                orderBy: { position: "asc" },
                select: { position: true, label_ar: true, label_sq: true, statement_ar: true, statement_sq: true, color: true, kind: true, objective_ar: true, objective_sq: true },
              },
            },
          },
        },
      },
      ratings_given: {
        orderBy: { updated_at: "desc" },
        select: {
          assessment_id: true, target_teacher_id: true, updated_at: true,
          target: { select: { profile: { select: { full_name: true, avatar_url: true } } } },
          assessment: { select: { title: true } },
        },
      },
      traitAssessments: {
        orderBy: { updated_at: "desc" },
        select: {
          id: true, updated_at: true, general_note: true,
          student: { select: { profile: { select: { full_name: true, avatar_url: true } } } },
          module: { select: { title: true, stage: { select: { title: true } } } },
          trait_scores: { select: { score: true, trait: { select: { name: true, name_sq: true } } } },
        },
      },
      workshop_enrollments: {
        orderBy: { enrolled_at: "desc" },
        select: { id: true, status: true, enrolled_at: true, workshop: { select: { id: true, title: true, status: true } } },
      },
      workshop_attendance: { select: { id: true, workshop_id: true } },
      workshop_completions: { select: { id: true, workshop_id: true } },
    },
  });

  if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ teacher });
}
