// api/school-admin/teachers/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const teachers = await prisma.teacher.findMany({
    where: { school_id: auth.school.id },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      created_at: true,
      onboarding_status: true,
      profile: { select: { id: true, full_name: true, email: true, avatar_url: true, is_active: true } },
      classes: {
        select: {
          id: true,
          name: true,
          _count: { select: { students: true, lessons: true, quizzes: true } },
        },
      },
      group_memberships: {
        select: {
          joined_at: true,
          group: { select: { id: true, name: true, description: true } },
        },
        orderBy: { joined_at: "desc" },
      },
      application: {
        select: {
          id: true,
          full_name: true,
          age: true,
          country: true,
          city: true,
          phone: true,
          email: true,
          current_role: true,
          qualification: true,
          specialization: true,
          years_of_experience: true,
          languages: true,
          submitted_at: true,
          reviewed_at: true,
        },
      },
      workshop_signup: { select: { id: true, title: true, status: true } },
      workshop_attendance: {
        select: {
          day_date: true,
          workshop: { select: { id: true, title: true, status: true } },
        },
        orderBy: { day_date: "desc" },
      },
      _count: { select: { lessons: true, quizzes: true, announcements: true } },
    },
  });

  // Application drafts are a newer optional enhancement. Fetch them in a
  // separate guarded query so a rolling migration can never make the teacher
  // management screen fail to load.
  let drafts = new Map<string, { application_draft: unknown; application_draft_updated_at: Date | null }>();
  try {
    const draftRows = await prisma.teacher.findMany({
      where: { school_id: auth.school.id },
      select: { id: true, application_draft: true, application_draft_updated_at: true },
    });
    drafts = new Map(draftRows.map((row) => [row.id, row]));
  } catch {
    // The core list remains fully usable until the migration is applied.
  }

  return NextResponse.json({
    teachers: teachers.map((teacher) => {
      const draft = drafts.get(teacher.id);
      return {
        ...teacher,
        application_draft: draft?.application_draft ?? null,
        application_draft_updated_at: draft?.application_draft_updated_at ?? null,
      };
    }),
  });
}
