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
//   date_scope   — joined_today | applied_today | applied_7d
//   sort         — newest | oldest
//   has_application — all | yes | no
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
  const requestedStatus = url.searchParams.get("status") ?? "UNDER_REVIEW";
  const allowedStatuses = new Set(["PENDING_APPLICATION", "UNDER_REVIEW", "WAITING_LIST", "ACTIVE", "REJECTED", "all"]);
  const status = allowedStatuses.has(requestedStatus) ? requestedStatus : "UNDER_REVIEW";
  const q = url.searchParams.get("q")?.trim() ?? "";
  const currentRole = url.searchParams.get("current_role");
  const qualification = url.searchParams.get("qualification");
  const years = url.searchParams.get("years");
  const gender = url.searchParams.get("gender");
  const country = url.searchParams.get("country")?.trim() ?? "";
  const dateScope = url.searchParams.get("date_scope") ?? "all";
  const sort = url.searchParams.get("sort") === "oldest" ? "asc" : "desc";
  const hasApplication = url.searchParams.get("has_application") ?? "all";
  const requestedOffset = Number(url.searchParams.get("tz_offset") ?? "0");
  const timezoneOffset = Number.isFinite(requestedOffset) && Math.abs(requestedOffset) <= 840 ? requestedOffset : 0;
  const exportAll = url.searchParams.get("export") === "1";

  const now = new Date();
  const localNow = new Date(now.getTime() - timezoneOffset * 60_000);
  const startOfToday = new Date(Date.UTC(
    localNow.getUTCFullYear(),
    localNow.getUTCMonth(),
    localNow.getUTCDate(),
  ) + timezoneOffset * 60_000);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

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
    ...(dateScope === "joined_today"
      ? { created_at: { gte: startOfToday, lt: startOfTomorrow } }
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
    where.OR = [
      { profile: { full_name: { contains: q, mode: "insensitive" } } },
      { profile: { email: { contains: q, mode: "insensitive" } } },
      {
        application: {
          is: {
            OR: [
              { full_name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  if (dateScope === "applied_today") {
    appFilters.submitted_at = { gte: startOfToday, lt: startOfTomorrow };
    hasAppFilter = true;
  } else if (dateScope === "applied_7d") {
    appFilters.submitted_at = { gte: sevenDaysAgo, lt: startOfTomorrow };
    hasAppFilter = true;
  }

  if (hasAppFilter) {
    where.application = { is: appFilters };
  } else if (hasApplication === "yes") {
    where.application = { isNot: null };
  } else if (hasApplication === "no") {
    where.application = { is: null };
  }

  const [teachers, total, statusGroups] = await Promise.all([
    prisma.teacher.findMany({
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
        { application: { submitted_at: sort } },
        { created_at: sort },
      ],
      take: 200,
    }),
    prisma.teacher.count({ where }),
    prisma.teacher.groupBy({
      by: ["onboarding_status"],
      where: { school_id: auth.school.id },
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    teachers,
    meta: {
      total,
      capped: total > teachers.length,
      status_counts: Object.fromEntries(statusGroups.map((group) => [group.onboarding_status, group._count._all])),
    },
  });
}
