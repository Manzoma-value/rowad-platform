import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { z } from "zod";

// ── GET /api/school-admin/teachers/[id] — complete 360° teacher profile ──
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const teacher = await prisma.teacher.findFirst({
    where: { id, school_id: auth.school.id },
    select: {
      id: true,
      created_at: true,
      onboarding_status: true,
      application_draft: true,
      application_draft_updated_at: true,
      profile: {
        select: {
          id: true,
          created_at: true,
          full_name: true,
          email: true,
          avatar_url: true,
          is_active: true,
          posts: {
            orderBy: { created_at: "desc" },
            select: {
              id: true, content: true, image_url: true, reply_to_id: true, created_at: true,
              _count: { select: { replies: true, reactions: true } },
            },
          },
          teacherGroupAnnouncements: {
            orderBy: { created_at: "desc" },
            select: { id: true, content: true, created_at: true, group: { select: { id: true, name: true } } },
          },
          workshopMessages: {
            orderBy: { created_at: "desc" },
            select: { id: true, body: true, created_at: true, workshop: { select: { id: true, title: true } } },
          },
          rowadGameSubmissions: {
            orderBy: { created_at: "desc" },
            select: { id: true, stage: true, score: true, total: true, created_at: true },
          },
          miniGameSubmissions: {
            orderBy: { created_at: "desc" },
            select: { id: true, game: true, score: true, won: true, meta: true, created_at: true },
          },
          rowadGameDrafts: {
            orderBy: { updated_at: "desc" },
            select: { id: true, stage: true, updated_at: true },
          },
        },
      },
      application: true,
      vote_responses: {
        orderBy: { submitted_at: "desc" },
        select: { id: true, submitted_at: true, notes: true, answers: true, vote: { select: { id: true, title: true } } },
      },
      classes: {
        orderBy: { created_at: "desc" },
        select: {
          id: true, name: true, created_at: true,
          students: {
            orderBy: { created_at: "asc" },
            select: {
              id: true, created_at: true, onboarding_status: true, city: true, age: true,
              profile: { select: { id: true, full_name: true, email: true, avatar_url: true, is_active: true } },
            },
          },
          _count: { select: { students: true, lessons: true, quizzes: true, announcements: true } },
        },
      },
      group_memberships: {
        orderBy: { joined_at: "desc" },
        select: {
          joined_at: true,
          group: {
            select: { id: true, name: true, description: true, updated_at: true, _count: { select: { members: true, assessments: true, announcements: true } } },
          },
        },
      },
      lessons: {
        orderBy: { updated_at: "desc" },
        select: {
          id: true, title: true, description: true, review_status: true, reviewer_notes: true,
          is_published: true, is_legacy: true, is_graded: true, created_at: true, updated_at: true,
          class: { select: { id: true, name: true } },
          module: { select: { id: true, title: true, stage: { select: { id: true, title: true } } } },
          _count: { select: { contents: true, questions: true, attempts: true } },
        },
      },
      quizzes: {
        orderBy: { created_at: "desc" },
        select: {
          id: true, name: true, review_status: true, reviewer_notes: true, is_legacy: true,
          created_at: true, submitted_at: true, reviewed_at: true,
          class: { select: { id: true, name: true } },
          module: { select: { id: true, title: true, stage: { select: { id: true, title: true } } } },
          _count: { select: { questions: true, attempts: true } },
        },
      },
      announcements: {
        orderBy: { created_at: "desc" },
        select: { id: true, content: true, created_at: true, class: { select: { id: true, name: true } } },
      },
      workshop_signup: { select: { id: true, title: true, status: true, start_date: true, end_date: true } },
      workshop_enrollments: {
        orderBy: { enrolled_at: "desc" },
        select: { id: true, source: true, status: true, enrolled_at: true, workshop: { select: { id: true, title: true, status: true, start_date: true, end_date: true } } },
      },
      workshop_attendance: {
        orderBy: { day_date: "desc" },
        select: { id: true, day_date: true, checked_in_at: true, source: true, workshop: { select: { id: true, title: true } } },
      },
      workshop_completions: {
        orderBy: { completed_at: "desc" },
        select: { id: true, completed_at: true, workshop: { select: { id: true, title: true } } },
      },
      ratings_received: {
        orderBy: { updated_at: "desc" },
        select: {
          assessment_id: true, rater_teacher_id: true, scores: true, updated_at: true,
          rater: { select: { id: true, profile: { select: { id: true, full_name: true, avatar_url: true } } } },
          assessment: {
            select: {
              id: true, title: true, status: true, created_at: true, closed_at: true,
              traits: { orderBy: { position: "asc" }, select: { position: true, label_ar: true, label_sq: true, statement_ar: true, statement_sq: true, color: true, kind: true, objective_ar: true, objective_sq: true } },
              target_groups: { select: { group: { select: { id: true, name: true } } } },
            },
          },
        },
      },
      ratings_given: {
        orderBy: { updated_at: "desc" },
        select: {
          assessment_id: true, target_teacher_id: true, scores: true, updated_at: true,
          target: { select: { id: true, profile: { select: { id: true, full_name: true, avatar_url: true } } } },
          assessment: { select: { id: true, title: true } },
        },
      },
      traitAssessments: {
        orderBy: { updated_at: "desc" },
        select: {
          id: true, general_note: true, observed_at: true, submitted_at: true, updated_at: true,
          student: { select: { id: true, profile: { select: { id: true, full_name: true, avatar_url: true } } } },
          module: { select: { id: true, title: true, stage: { select: { id: true, title: true } } } },
          trait_scores: { select: { score: true, note: true, trait: { select: { id: true, name: true, name_sq: true, maqsad: true } } } },
        },
      },
    },
  });

  if (!teacher) return NextResponse.json({ error: "Supervisor not found" }, { status: 404 });
  return NextResponse.json({ teacher });
}

// ── PATCH /api/school-admin/teachers/[id] — activate or deactivate a teacher ──
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const result = z.object({ is_active: z.boolean() }).safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

  // Verify teacher belongs to this school
  const teacher = await prisma.teacher.findFirst({
    where: { id, school_id: auth.school.id },
    select: { profile_id: true },
  });
  if (!teacher) return NextResponse.json({ error: "المشرف غير موجود" }, { status: 404 });

  const updated = await prisma.profile.update({
    where: { id: teacher.profile_id },
    data: { is_active: result.data.is_active },
    select: { id: true, full_name: true, is_active: true },
  });
  return NextResponse.json({ profile: updated });
}

// ── DELETE /api/school-admin/teachers/[id] — permanently remove a teacher ─────
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Auth ── (was MISSING — this is a destructive admin action that deletes
  // the underlying auth user, so it MUST require a school admin and verify the
  // teacher belongs to that admin's school.)
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;

    // Tenant guard: teacher must belong to THIS admin's school.
    const teacher = await prisma.teacher.findFirst({
      where: { id, school_id: auth.school.id },
      select: { profile_id: true },
    });
    if (!teacher) {
      return NextResponse.json({ error: "Supervisor not found" }, { status: 404 });
    }

    const supabase = createAdminClient();
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(teacher.profile_id);
    if (authDeleteError && !/not found|does not exist/i.test(authDeleteError.message)) {
      console.error("[delete-teacher] auth deletion failed:", authDeleteError.message);
      return NextResponse.json({ error: "Could not remove the login account" }, { status: 502 });
    }

    // Auth deletion does not reliably cascade into public application tables.
    // Remove the school record explicitly and anonymize the retained profile
    // so the teacher cannot reappear or block a future registration.
    await prisma.$transaction(async (tx) => {
      await tx.teacher.deleteMany({ where: { id, school_id: auth.school.id } });
      await tx.profile.updateMany({
        where: { id: teacher.profile_id },
        data: {
          full_name: "Deleted supervisor",
          email: null,
          is_active: false,
          avatar_url: null,
          avatar_path: null,
        },
      });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[delete-teacher]", error);
    return NextResponse.json({ error: "Failed to delete supervisor" }, { status: 500 });
  }
}
