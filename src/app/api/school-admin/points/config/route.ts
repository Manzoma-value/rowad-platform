// PUT    /api/school-admin/points/config — save the school's point distribution.
// DELETE /api/school-admin/points/config — reset it back to the shipped default.
//
// The stored value is always a full, sanitised rule set: `resolvePointsRules`
// drops unknown keys, clamps every weight, and fills in metrics the payload
// never mentioned, so a malformed body can never corrupt the scoring.
import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { resolvePointsRules } from "@/lib/teacher-points";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.rules)) {
    return NextResponse.json({ error: "rules array required" }, { status: 400 });
  }

  const rules = resolvePointsRules(body.rules);

  const saved = await prisma.pointsConfig.upsert({
    where: { school_id: auth.school.id },
    create: { school_id: auth.school.id, rules },
    update: { rules },
    select: { updated_at: true },
  });

  return NextResponse.json({ rules, config_updated_at: saved.updated_at, is_custom: true });
}

export async function DELETE() {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.pointsConfig.deleteMany({ where: { school_id: auth.school.id } });

  return NextResponse.json({ rules: resolvePointsRules(null), config_updated_at: null, is_custom: false });
}
