// GET /api/school-admin/points — the supervisor competition leaderboard.
//
// Returns the school's point distribution, every supervisor's raw activity
// measurements, and the admin's manual corrections. Scoring itself happens
// in `@/lib/teacher-points`, which the page also runs client-side so the
// distribution editor can preview a re-weighting before it is saved.
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { collectTeacherPoints } from "@/lib/teacher-points-server";
import { resolvePointsRules } from "@/lib/teacher-points";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [data, config, adjustments] = await Promise.all([
    collectTeacherPoints(auth.school.id),
    prisma.pointsConfig.findUnique({ where: { school_id: auth.school.id } }),
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

  return NextResponse.json({
    rules: resolvePointsRules(config?.rules ?? null),
    config_updated_at: config?.updated_at ?? null,
    is_custom: Boolean(config),
    teachers: data.teachers,
    groups: data.groups,
    workshops: data.workshops,
    adjustments,
    generated_at: new Date().toISOString(),
  });
}
