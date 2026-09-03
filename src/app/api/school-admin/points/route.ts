// GET /api/school-admin/points — the supervisor competition leaderboard.
//
// Returns every saved point-distribution template for the school (a school
// can keep several — the live one plus drafts/variations — see
// /api/school-admin/points/templates for create/rename/duplicate/activate),
// every supervisor's raw activity measurements, and the admin's manual
// corrections. Scoring itself happens in `@/lib/teacher-points`, which the
// page also runs client-side so the template editor can preview a
// re-weighting before it is saved.
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { collectTeacherPoints } from "@/lib/teacher-points-server";
import { DEFAULT_RULES, resolvePointsRules } from "@/lib/teacher-points";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [data, configs, adjustments] = await Promise.all([
    collectTeacherPoints(auth.school.id),
    prisma.pointsConfig.findMany({
      where: { school_id: auth.school.id },
      orderBy: [{ is_active: "desc" }, { created_at: "asc" }],
      select: { id: true, name: true, is_active: true, rules: true, updated_at: true, created_at: true },
    }),
    prisma.pointsAdjustment.findMany({
      where: { school_id: auth.school.id },
      select: {
        teacher_id: true,
        metric_key: true,
        override_points: true,
        bonus_points: true,
        note: true,
        updated_at: true,
      },
    }),
  ]);

  // A brand-new school has no template yet — hand back the shipped default
  // as a virtual, unsaved "الافتراضي" template rather than 404ing. It is
  // materialised into a real row the first time the admin saves anything.
  const templates = configs.length > 0
    ? configs.map((config) => ({ ...config, rules: resolvePointsRules(config.rules) }))
    : [{
        id: null as string | null,
        name: "التوزيع الافتراضي",
        is_active: true,
        rules: DEFAULT_RULES,
        updated_at: null as string | null,
        created_at: null as string | null,
      }];

  return NextResponse.json({
    templates,
    teachers: data.teachers,
    groups: data.groups,
    workshops: data.workshops,
    adjustments,
    generated_at: new Date().toISOString(),
  });
}
