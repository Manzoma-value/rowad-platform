"use server";
import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

// PUT /api/school-admin/roadmap/modules/[id]
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const mod = await prisma.roadmapModule.findFirst({
    where: { id, stage: { roadmap: { school_id: auth.school.id } } },
  });
  if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { title, order } = body;
  const hasDescription = typeof body.description === "string";
  const trimmedTitle = typeof title === "string" ? title.trim() : "";

  if ((typeof title === "string" && !trimmedTitle) || (!trimmedTitle && typeof order !== "number" && !hasDescription)) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.roadmapModule.update({
    where: { id },
    data: {
      ...(trimmedTitle && { title: trimmedTitle }),
      ...(typeof order === "number" && { order }),
      ...(hasDescription && { description: body.description.trim() || null }),
    },
  });

  return NextResponse.json({ module: updated });
}

// DELETE /api/school-admin/roadmap/modules/[id]
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const mod = await prisma.roadmapModule.findFirst({
    where: { id, stage: { roadmap: { school_id: auth.school.id } } },
  });
  if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  await prisma.roadmapModule.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
