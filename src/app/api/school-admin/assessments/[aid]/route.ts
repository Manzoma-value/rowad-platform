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
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import type { TraitDraft } from "@/lib/rowad-assessment";
import { buildAssessmentSpectra } from "@/lib/assessment-aggregates";

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
        select: {
          id: true, position: true, label_ar: true, label_sq: true,
          statement_ar: true, statement_sq: true, color: true,
          kind: true, objective_ar: true, objective_sq: true,
        },
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

  const historyCount = await prisma.assessmentRatingRevision.count({
    where: { assessment_id: aid },
  });

  const memberMap = new Map<string, { teacher_id: string; group_ids: string[]; profile: { id: string; full_name: string; email: string | null } }>();
  const groups: { id: string; name: string; member_ids: string[] }[] = [];
  for (const link of assessment.target_groups) {
    groups.push({
      id: link.group.id,
      name: link.group.name,
      member_ids: link.group.members.map((member) => member.teacher.id),
    });
    for (const m of link.group.members) {
      const current = memberMap.get(m.teacher.id);
      if (current) {
        if (!current.group_ids.includes(link.group.id)) current.group_ids.push(link.group.id);
      } else {
        memberMap.set(m.teacher.id, { teacher_id: m.teacher.id, group_ids: [link.group.id], profile: m.teacher.profile });
      }
    }
  }

  const spectra = buildAssessmentSpectra(
    groups,
    assessment.ratings.map((rating) => ({
      rater_teacher_id: rating.rater_teacher_id,
      target_teacher_id: rating.target_teacher_id,
      scores: rating.scores as number[],
    })),
    assessment.traits.length,
  );

  return NextResponse.json({
    assessment: {
      id: assessment.id,
      title: assessment.title,
      status: assessment.status,
      created_at: assessment.created_at,
      updated_at: assessment.updated_at,
      closed_at: assessment.closed_at,
      groups: groups.map((group) => ({ id: group.id, name: group.name })),
      traits: assessment.traits,
      members: Array.from(memberMap.values()),
      ratings: assessment.ratings,
      history_count: historyCount,
      ...spectra,
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
      kind: t.kind === "EARLY_OBSERVATION" ? "EARLY_OBSERVATION" : "TARGET",
      objective_ar: String(t.objective_ar ?? "").trim().slice(0, 120) || undefined,
      objective_sq: String(t.objective_sq ?? "").trim().slice(0, 120) || undefined,
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
  req: Request,
  context: { params: Promise<{ aid: string }> },
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { aid } = await context.params;

  let credentials: { email?: string; password?: string };
  try {
    credentials = await req.json();
  } catch {
    return NextResponse.json({ error: "credentials_required" }, { status: 400 });
  }

  const email = String(credentials.email ?? "").trim().toLowerCase();
  const password = String(credentials.password ?? "");
  if (!email || !password || email !== auth.profile.email?.trim().toLowerCase()) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "verification_unavailable" }, { status: 503 });
  }

  // Verify the password in an isolated, non-persistent auth client so the
  // administrator's active browser session is never replaced or refreshed.
  const verifier = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: verification, error: verificationError } = await verifier.auth.signInWithPassword({ email, password });
  if (verificationError || verification.user?.id !== auth.profile.id) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const existing = await prisma.groupAssessment.findFirst({
    where: { id: aid, school_id: auth.school.id }, select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.groupAssessment.delete({ where: { id: aid } }).catch(() => null);
  return NextResponse.json({ success: true });
}
