// /api/school-admin/assessments/[aid]
//   GET    — full payload: this model's ordered traits, the union of
//            members across every group it targets, and every rating row.
//   PATCH  — rename, change status (OPEN ↔ CLOSED), and/or fully replace
//            the trait set and/or target groups — full "customize as you
//            like" editing. Trait/group edits are only allowed while the
//            model has zero ratings yet, so an in-progress assessment's
//            data can never be silently misaligned.
//   DELETE — hard delete (cascades to ratings, traits, group links).
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import type { TraitDraft } from "@/lib/rowad-assessment";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ aid: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { aid } = await context.params;

  const assessment = await prisma.groupAssessment.findFirst({
    where: { id: aid, school_id: auth.school.id },
    select: {
      id: true,
      title: true,
      status: true,
      created_at: true,
      updated_at: true,
      closed_at: true,
      traits: {
        orderBy: { position: "asc" },
        select: { id: true, position: true, label_ar: true, label_sq: true, statement_ar: true, statement_sq: true, color: true },
      },
      target_groups: {
        select: {
          group: {
            select: {
              id: true,
              name: true,
              members: {
                select: {
                  teacher: {
                    select: { id: true, profile: { select: { id: true, full_name: true, email: true } } },
                  },
                },
              },
            },
          },
        },
      },
      ratings: {
        select: { rater_teacher_id: true, target_teacher_id: true, scores: true, updated_at: true },
      },
    },
  });
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberMap = new Map<string, { teacher_id: string; profile: { id: string; full_name: string; email: string | null } }>();
  const groups: { id: string; name: string }[] = [];
  for (const link of assessment.target_groups) {
    groups.push({ id: link.group.id, name: link.group.name });
    for (const m of link.group.members) {
      memberMap.set(m.teacher.id, { teacher_id: m.teacher.id, profile: m.teacher.profile });
    }
  }

  return NextResponse.json({
    assessment: {
      id: assessment.id,
      title: assessment.title,
      status: assessment.status,
      created_at: assessment.created_at,
      updated_at: assessment.updated_at,
      closed_at: assessment.closed_at,
      groups,
      traits: assessment.traits,
      members: Array.from(memberMap.values()),
      ratings: assessment.ratings,
    },
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

export async function PATCH(
  req: Request,
  context: { params: Promise<{ aid: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { aid } = await context.params;

  let body: { title?: string; status?: "OPEN" | "CLOSED"; traits?: unknown; group_ids?: string[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const existing = await prisma.groupAssessment.findFirst({
    where: { id: aid, school_id: auth.school.id },
    select: { id: true, status: true, _count: { select: { ratings: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const wantsStructuralEdit = body.traits !== undefined || body.group_ids !== undefined;
  if (wantsStructuralEdit && existing._count.ratings > 0) {
    return NextResponse.json(
      { error: "Cannot change traits or groups after ratings have been submitted. Create a new model instead." },
      { status: 409 },
    );
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const t = body.title.trim();
    if (!t) return NextResponse.json({ error: "title required" }, { status: 400 });
    data.title = t.slice(0, 160);
  }
  if (body.status === "OPEN" || body.status === "CLOSED") {
    data.status = body.status;
    data.closed_at = body.status === "CLOSED" ? new Date() : null;
  }

  let newTraits: TraitDraft[] | null = null;
  if (body.traits !== undefined) {
    newTraits = normalizeTraits(body.traits);
    if (!newTraits) return NextResponse.json({ error: "traits must be a non-empty array with ar/sq labels and statements" }, { status: 400 });
  }

  let newGroupIds: string[] | null = null;
  if (body.group_ids !== undefined) {
    if (!Array.isArray(body.group_ids) || body.group_ids.length === 0) {
      return NextResponse.json({ error: "group_ids must be a non-empty array" }, { status: 400 });
    }
    const validGroups = await prisma.teacherGroup.findMany({
      where: { id: { in: body.group_ids }, school_id: auth.school.id },
      select: { id: true },
    });
    if (validGroups.length === 0) return NextResponse.json({ error: "No valid groups" }, { status: 400 });
    newGroupIds = validGroups.map((g) => g.id);
    data.group_id = newGroupIds[0];
  }

  const assessment = await prisma.$transaction(async (tx) => {
    if (newTraits) {
      await tx.assessmentTrait.deleteMany({ where: { assessment_id: aid } });
      await tx.assessmentTrait.createMany({
        data: newTraits.map((t, position) => ({ assessment_id: aid, position, ...t })),
      });
    }
    if (newGroupIds) {
      await tx.groupAssessmentGroup.deleteMany({ where: { assessment_id: aid } });
      await tx.groupAssessmentGroup.createMany({
        data: newGroupIds.map((group_id) => ({ assessment_id: aid, group_id })),
      });
    }
    return tx.groupAssessment.update({
      where: { id: aid },
      data,
      select: { id: true, title: true, status: true, closed_at: true },
    });
  });

  return NextResponse.json({ assessment });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ aid: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { aid } = await context.params;

  const existing = await prisma.groupAssessment.findFirst({
    where: { id: aid, school_id: auth.school.id }, select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.groupAssessment.delete({ where: { id: aid } }).catch(() => null);
  return NextResponse.json({ success: true });
}
