import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/owner-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [schools, teachers, classes, admins, performance] = await Promise.all([
    prisma.school.findMany({
      orderBy: { created_at: "desc" },
      select: { id: true, name: true, name_alt: true, slug: true, language: true, is_active: true, created_at: true, _count: { select: { teachers: true, students: true, classes: true, admins: true } } },
    }),
    prisma.teacher.findMany({
      orderBy: { created_at: "desc" },
      select: {
        id: true, created_at: true, school_id: true, onboarding_status: true,
        profile: { select: { full_name: true, email: true, is_active: true } },
        school: { select: { name: true } },
        _count: { select: { classes: true, ratings_received: true, vote_responses: true } },
      },
    }),
    prisma.class.findMany({
      orderBy: { created_at: "desc" },
      select: { id: true, name: true, created_at: true, school_id: true, school: { select: { name: true } }, teacher: { select: { profile: { select: { full_name: true } } } }, _count: { select: { students: true, assessmentAttempts: true, quizzes: true, lessons: true } } },
    }),
    prisma.schoolAdminMember.findMany({
      orderBy: { created_at: "desc" },
      select: { id: true, created_at: true, school: { select: { name: true } }, profile: { select: { id: true, full_name: true, email: true, is_active: true, created_at: true } } },
    }),
    prisma.school.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, _count: { select: { teacher_groups: true, votes: true, assessmentAttempts: true, group_assessments: true } }, assessmentAttempts: { select: { score: true, total: true } } },
    }),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(), schools,
    teachers, classes, admins,
    performance: performance.map((school) => {
      const scored = school.assessmentAttempts.filter((a) => a.score !== null && a.total);
      const averageScore = scored.length ? Math.round(scored.reduce((sum, a) => sum + ((a.score ?? 0) / (a.total ?? 1)) * 100, 0) / scored.length) : null;
      return { id: school.id, name: school.name, ...school._count, averageScore };
    }),
  });
}
