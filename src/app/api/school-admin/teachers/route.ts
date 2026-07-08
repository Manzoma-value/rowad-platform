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
    include: {
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
      workshop_signup: { select: { id: true, title: true } },
      _count: { select: { lessons: true, quizzes: true, announcements: true } },
    },
  });

  return NextResponse.json({ teachers });
}
