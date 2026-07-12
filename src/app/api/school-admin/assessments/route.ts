// /api/school-admin/assessments
//   GET  — every measurement-model assessment across every teacher group in
//          this school, newest first, with its target groups + trait count
//          attached so the flat "نماذج القياس" hub can list/filter/search
//          without the admin having to drill into a specific group first.
//   POST — create a new OPEN assessment. The admin picks which group(s) it
//          targets (defaults to ALL groups in the school when omitted) and
//          fully authors its trait set (defaults to the classic Rowad five
//          when omitted), so a brand-new model can be as close to or as far
//          from the original methodology as the admin wants.
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { defaultTraitDrafts, type TraitDraft } from "@/lib/rowad-assessment";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assessments = await prisma.groupAssessment.findMany({
    where: { school_id: auth.school.id },
    orderBy: [{ created_at: "desc" }],
    select: {
      id: true,
      title: true,
      status: true,
      created_at: true,
      updated_at: true,
      closed_at: true,
      target_groups: { select: { group: { select: { id: true, name: true } } } },
      _count: { select: { ratings: true, traits: true } },
    },
  });

  const groups = await prisma.teacherGroup.findMany({
    where: { school_id: auth.school.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { members: true } } },
  });

  return NextResponse.json({
    assessments: assessments.map((a) => ({
      ...a,
      groups: a.target_groups.map((l) => l.group),
      target_groups: undefined,
    })),
    groups,
  });
}

function normalizeTraits(input: unknown): TraitDraft[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const traits: TraitDraft[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const t = raw as Record<string, unknown>;
    const label_ar = String(t.label_ar ?? "").trim();
    const label_sq = String(t.label_sq ?? "").trim();
    const statement_ar = String(t.statement_ar ?? "").trim();
    const statement_sq = String(t.statement_sq ?? "").trim();
    const color = String(t.color ?? "#6B1E2D").trim() || "#6B1E2D";
    if (!label_ar || !label_sq || !statement_ar || !statement_sq) return null;
    traits.push({
      label_ar: label_ar.slice(0, 80), label_sq: label_sq.slice(0, 80),
      statement_ar: statement_ar.slice(0, 400), statement_sq: statement_sq.slice(0, 400),
      color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#6B1E2D",
    });
  }
  return traits;
}

export async function POST(req: Request) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { title?: string; group_ids?: string[]; traits?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const allGroups = await prisma.teacherGroup.findMany({
    where: { school_id: auth.school.id },
    select: { id: true },
  });
  const allGroupIds = new Set(allGroups.map((g) => g.id));
  if (allGroupIds.size === 0) {
    return NextResponse.json({ error: "This school has no teacher groups yet" }, { status: 400 });
  }

  // No group_ids (or an empty array) means "all groups" — the requested default.
  const requestedIds = Array.isArray(body.group_ids) ? body.group_ids.filter((id) => allGroupIds.has(id)) : [];
  const groupIds = requestedIds.length > 0 ? requestedIds : Array.from(allGroupIds);

  const traits = normalizeTraits(body.traits) ?? defaultTraitDrafts();

  const assessment = await prisma.$transaction(async (tx) => {
    const created = await tx.groupAssessment.create({
      data: {
        // Legacy "primary group" pointer — first selected group.
        group_id: groupIds[0],
        school_id: auth.school.id,
        created_by: auth.profile.id,
        title: title.slice(0, 160),
      },
      select: { id: true, title: true, status: true },
    });
    await tx.groupAssessmentGroup.createMany({
      data: groupIds.map((group_id) => ({ assessment_id: created.id, group_id })),
    });
    await tx.assessmentTrait.createMany({
      data: traits.map((t, position) => ({ assessment_id: created.id, position, ...t })),
    });
    return created;
  });

  return NextResponse.json({ assessment }, { status: 201 });
}
