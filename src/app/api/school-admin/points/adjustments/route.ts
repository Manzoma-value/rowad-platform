// POST   /api/school-admin/points/adjustments — override or top up one score.
// DELETE /api/school-admin/points/adjustments — drop a correction, restoring
//        the automatically computed value.
//
// `metric_key` is either one of the metric keys or the literal "OVERALL",
// which corrects the supervisor's final total rather than a single rule.
import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { METRIC_KEYS, OVERALL_KEY } from "@/lib/teacher-points";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS = new Set<string>([...METRIC_KEYS, OVERALL_KEY]);

function cleanPoints(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(1000, Math.max(-1000, Math.round(parsed * 100) / 100));
}

export async function POST(req: Request) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const teacherId = typeof body?.teacher_id === "string" ? body.teacher_id : "";
  const metricKey = typeof body?.metric_key === "string" ? body.metric_key : "";
  if (!teacherId || !ALLOWED_KEYS.has(metricKey)) {
    return NextResponse.json({ error: "teacher_id and a known metric_key are required" }, { status: 400 });
  }

  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, school_id: auth.school.id },
    select: { id: true },
  });
  if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const override_points = cleanPoints(body?.override_points);
  const bonus_points = cleanPoints(body?.bonus_points) ?? 0;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 400) || null : null;

  // Nothing left to remember — clear the row instead of storing a no-op.
  if (override_points === null && bonus_points === 0 && !note) {
    await prisma.pointsAdjustment.deleteMany({
      where: { teacher_id: teacher.id, metric_key: metricKey },
    });
    return NextResponse.json({ adjustment: null });
  }

  const adjustment = await prisma.pointsAdjustment.upsert({
    where: { teacher_id_metric_key: { teacher_id: teacher.id, metric_key: metricKey } },
    create: {
      school_id: auth.school.id,
      teacher_id: teacher.id,
      metric_key: metricKey,
      override_points,
      bonus_points,
      note,
    },
    update: { override_points, bonus_points, note },
    select: {
      teacher_id: true,
      metric_key: true,
      override_points: true,
      bonus_points: true,
      note: true,
      updated_at: true,
    },
  });

  return NextResponse.json({ adjustment });
}

export async function DELETE(req: Request) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const teacherId = url.searchParams.get("teacher_id") ?? "";
  const metricKey = url.searchParams.get("metric_key") ?? "";
  if (!teacherId) return NextResponse.json({ error: "teacher_id required" }, { status: 400 });

  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, school_id: auth.school.id },
    select: { id: true },
  });
  if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.pointsAdjustment.deleteMany({
    where: {
      teacher_id: teacher.id,
      // No metric_key clears every correction for this supervisor.
      ...(metricKey ? { metric_key: metricKey } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
