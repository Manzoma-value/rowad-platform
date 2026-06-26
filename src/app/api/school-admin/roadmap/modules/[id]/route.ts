"use server";
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

// PUT /api/school-admin/roadmap/modules/[id]
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const mod = await prisma.roadmapModule.findFirst({
    where: { id, stage: { roadmap: { school_id: auth.school.id } } },
  });
  if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { title, order } = body;

  if (!title?.trim() && typeof order !== "number") {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.roadmapModule.update({
    where: { id },
    data: {
      ...(title?.trim() && { title: title.trim() }),
      ...(typeof order === "number" && { order }),
    },
  });

  return NextResponse.json({ module: updated });
}

// DELETE /api/school-admin/roadmap/modules/[id]
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const mod = await prisma.roadmapModule.findFirst({
    where: { id, stage: { roadmap: { school_id: auth.school.id } } },
  });
  if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  await prisma.roadmapModule.delete({ where: { id } });

  return NextResponse.json({ success: true });
}