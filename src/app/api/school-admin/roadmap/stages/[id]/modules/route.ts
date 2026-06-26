/* eslint-disable @next/next/no-assign-module-variable */
// api/school-admin/roadmap/stages/[id]/modules/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

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

  if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const stage = await prisma.roadmapStage.findFirst({
    where: { id: stageId, roadmap: { school_id: auth.school.id } },
    select: { id: true },
  });
  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  const last = await prisma.roadmapModule.findFirst({
    where: { stage_id: stageId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const module = await prisma.roadmapModule.create({
    data: {
      stage_id: stageId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      order: (last?.order ?? 0) + 1,
    },
    select: { id: true, title: true, description: true, order: true },
  });

  return NextResponse.json({ module }, { status: 201 });
}