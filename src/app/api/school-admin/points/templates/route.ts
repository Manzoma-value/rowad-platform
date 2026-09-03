// POST /api/school-admin/points/templates — create a new point-distribution
// template, either blank (shipped defaults) or duplicated from an existing
// one (`duplicate_from`). Brand-new schools get their first template
// created lazily here, always active, so there is never a school with zero
// templates.
import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_RULES, resolvePointsRules } from "@/lib/teacher-points";

export const dynamic = "force-dynamic";

function cleanName(value: unknown): string {
  const name = typeof value === "string" ? value.trim().slice(0, 80) : "";
  return name || "توزيع جديد";
}

export async function POST(req: Request) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const name = cleanName(body?.name);
  const duplicateFrom = typeof body?.duplicate_from === "string" ? body.duplicate_from : null;

  let rules = DEFAULT_RULES;
  if (duplicateFrom) {
    const source = await prisma.pointsConfig.findFirst({
      where: { id: duplicateFrom, school_id: auth.school.id },
      select: { rules: true },
    });
    if (!source) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    rules = resolvePointsRules(source.rules);
  }

  // The very first template a school creates starts active — otherwise
  // there would be nothing to score the real leaderboard with.
  const existingCount = await prisma.pointsConfig.count({ where: { school_id: auth.school.id } });

  const template = await prisma.pointsConfig.create({
    data: {
      school_id: auth.school.id,
      name,
      rules,
      is_active: existingCount === 0,
    },
    select: { id: true, name: true, is_active: true, rules: true, updated_at: true, created_at: true },
  });

  return NextResponse.json({ template: { ...template, rules: resolvePointsRules(template.rules) } });
}
