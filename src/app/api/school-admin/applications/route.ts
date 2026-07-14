// api/school-admin/applications — list of teacher applications for this school.
//
// Query params (all optional):
//   q            — free-text search over name / email / phone / city
//   status       — onboarding status filter: UNDER_REVIEW | WAITING_LIST | ACTIVE | REJECTED | all
//   current_role — TEACHER | SUPERVISOR | ... (single enum)
//   qualification — DIPLOMA | BACHELOR | ...
//   years        — LT_3 | Y_3_5 | Y_6_10 | Y_11_15 | GT_15
//   gender       — MALE | FEMALE
//   country      — ilike country
//
// Joined teachers without an application (still PENDING_APPLICATION) are
// returned with `application: null` so admins can see who hasn't applied yet
// — but the default `status=UNDER_REVIEW` view hides them.
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "UNDER_REVIEW";
  const q = url.searchParams.get("q")?.trim() ?? "";
  const currentRole = url.searchParams.get("current_role");
  const qualification = url.searchParams.get("qualification");
  const years = url.searchParams.get("years");
  const gender = url.searchParams.get("gender");
  const country = url.searchParams.get("country")?.trim() ?? "";
  const exportAll = url.searchParams.get("export") === "1";

  if (exportAll) {
    const teachers = await prisma.teacher.findMany({
      where: { school_id: auth.school.id },
      select: {
        id: true,
        onboarding_status: true,
        created_at: true,
        profile: { select: { full_name: true, email: true, is_active: true } },
        application: true,
      },
      orderBy: [
        { application: { submitted_at: "desc" } },
        { created_at: "desc" },
      ],
    });
    return NextResponse.json({ teachers });
  }

  const where: Prisma.TeacherWhereInput = {
    school_id: auth.school.id,
    ...(status !== "all"
      ? {
          onboarding_status: status as
            | "PENDING_APPLICATION" | "UNDER_REVIEW" | "WAITING_LIST" | "ACTIVE" | "REJECTED",
        }
      : {}),
  };

  // Application-level filters require the teacher to HAVE an application.
  const appFilters: Prisma.TeacherApplicationWhereInput = {};
  let hasAppFilter = false;
  if (currentRole) {
    appFilters.current_role = currentRole as Prisma.TeacherApplicationWhereInput["current_role"];
    hasAppFilter = true;
  }
  if (qualification) {
    appFilters.qualification = qualification as Prisma.TeacherApplicationWhereInput["qualification"];
    hasAppFilter = true;
  }
  if (years) {
    appFilters.years_of_experience = years as Prisma.TeacherApplicationWhereInput["years_of_experience"];
    hasAppFilter = true;
  }
  if (gender) {
    appFilters.gender = gender as Prisma.TeacherApplicationWhereInput["gender"];
    hasAppFilter = true;
  }
  if (country) {
    appFilters.country = { contains: country, mode: "insensitive" };
    hasAppFilter = true;
  }
  if (q) {
    appFilters.OR = [
      { full_name: { contains: q, mode: "insensitive" } },
      { email:     { contains: q, mode: "insensitive" } },
      { phone:     { contains: q, mode: "insensitive" } },
      { city:      { contains: q, mode: "insensitive" } },
    ];
    hasAppFilter = true;
  }

  if (hasAppFilter) {
    where.application = { is: appFilters };
  }

  const teachers = await prisma.teacher.findMany({
    where,
    select: {
      id: true,
      onboarding_status: true,
      created_at: true,
      profile: { select: { full_name: true, email: true } },
      application: {
        select: {
          id: true,
          full_name: true,
          email: true,
          phone: true,
          country: true,
          city: true,
          gender: true,
          current_role: true,
          qualification: true,
          years_of_experience: true,
          submitted_at: true,
          reviewed_at: true,
        },
      },
    },
    orderBy: [
      { application: { submitted_at: "desc" } },
      { created_at: "desc" },
    ],
    take: 200,
  });

  return NextResponse.json({ teachers });
}
