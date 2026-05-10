// api/school-admin/roadmap/stages/[id]/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ id }, body] = await Promise.all([context.params, req.json().catch(() => ({}))]);

  const stage = await prisma.roadmapStage.findFirst({
    where: { id, roadmap: { school_id: auth.school.id } },
    select: { id: true },
  });
  if (!stage) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!body.title?.trim() && typeof body.order !== "number")
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const updated = await prisma.roadmapStage.update({
    where: { id },
    data: {
      ...(body.title?.trim() && { title: body.title.trim() }),
      ...(typeof body.order === "number" && { order: body.order }),
    },
    select: { id: true, title: true, order: true },
  });

  return NextResponse.json({ stage: updated });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const stage = await prisma.roadmapStage.findFirst({
    where: { id, roadmap: { school_id: auth.school.id } },
    select: { id: true },
  });
  if (!stage) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.roadmapStage.delete({ where: { id } });
  return NextResponse.json({ success: true });
}