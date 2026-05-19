// api/school-admin/roadmap/stages/[id]/traits/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

const MAQASID = ["DEEN", "AQL", "NAFS", "NASL", "MAL"] as const;

async function verifyStage(stageId: string, schoolId: string) {
  return prisma.roadmapStage.findFirst({
    where: { id: stageId, roadmap: { school_id: schoolId } },
    select: { id: true },
  });
}

// GET /api/school-admin/roadmap/stages/[id]/traits
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: stageId } = await context.params;

  const stage = await verifyStage(stageId, auth.school.id);
  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  const traits = await prisma.stageTrait.findMany({
    where: { stage_id: stageId },
    orderBy: { maqsad: "asc" },
    select: {
      id: true,
      maqsad: true,
      name: true,
      definition: true,
      created_at: true,
      elements: {
        orderBy: { order: "asc" },
        select: { id: true, text: true, order: true },
      },
      module_main_traits: {
        select: { id: true, title: true },
      },
    },
  });

  return NextResponse.json({ traits });
}

// POST /api/school-admin/roadmap/stages/[id]/traits
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ id: stageId }, body] = await Promise.all([
    context.params,
    req.json().catch(() => ({})),
  ]);

  const stage = await verifyStage(stageId, auth.school.id);
  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  const { maqsad, name, definition } = body;

  if (!maqsad || !MAQASID.includes(maqsad))
    return NextResponse.json({ error: `maqsad must be one of: ${MAQASID.join(", ")}` }, { status: 400 });
  if (!name?.trim())
    return NextResponse.json({ error: "name required" }, { status: 400 });

  // Enforce one trait per maqsad per stage
  const existing = await prisma.stageTrait.findUnique({
    where: { stage_id_maqsad: { stage_id: stageId, maqsad } },
    select: { id: true },
  });
  if (existing)
    return NextResponse.json({ error: `A trait for مقصد ${maqsad} already exists in this stage` }, { status: 409 });

  const trait = await prisma.stageTrait.create({
    data: {
      stage_id: stageId,
      maqsad,
      name: name.trim(),
      definition: definition?.trim() || null,
    },
    select: {
      id: true, maqsad: true, name: true, definition: true, created_at: true,
      elements: true,
    },
  });

  return NextResponse.json({ trait }, { status: 201 });
}