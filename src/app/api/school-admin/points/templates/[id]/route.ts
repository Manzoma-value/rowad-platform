// PATCH  /api/school-admin/points/templates/[id] — rename, edit the rule
//        weights, and/or activate a template (make it the one that scores
//        the real leaderboard). Activating one deactivates every other
//        template for the school in the same transaction.
// DELETE /api/school-admin/points/templates/[id] — remove a template. A
//        school always keeps at least one, and the active one can't be
//        deleted directly — activate another template first.
import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { resolvePointsRules } from "@/lib/teacher-points";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const existing = await prisma.pointsConfig.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: { name?: string; rules?: ReturnType<typeof resolvePointsRules> } = {};

  if (typeof body?.name === "string") {
    const name = body.name.trim().slice(0, 80);
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    data.name = name;
  }
  if (Array.isArray(body?.rules)) {
    data.rules = resolvePointsRules(body.rules);
  }

  const activate = body?.activate === true;

  const template = await prisma.$transaction(async (tx) => {
    if (activate) {
      await tx.pointsConfig.updateMany({
        where: { school_id: auth.school.id, is_active: true, id: { not: id } },
        data: { is_active: false },
      });
    }
    return tx.pointsConfig.update({
      where: { id },
      data: { ...data, ...(activate ? { is_active: true } : {}) },
      select: { id: true, name: true, is_active: true, rules: true, updated_at: true, created_at: true },
    });
  });

  return NextResponse.json({ template: { ...template, rules: resolvePointsRules(template.rules) } });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const existing = await prisma.pointsConfig.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true, is_active: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.is_active) {
    return NextResponse.json({ error: "active_template" }, { status: 400 });
  }

  const total = await prisma.pointsConfig.count({ where: { school_id: auth.school.id } });
  if (total <= 1) {
    return NextResponse.json({ error: "last_template" }, { status: 400 });
  }

  await prisma.pointsConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
