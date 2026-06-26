// api/school-admin/roadmap/elements/[id]/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

async function verifyElement(elementId: string, schoolId: string) {
  return prisma.traitElement.findFirst({
    where: {
      id: elementId,
      trait: { stage: { roadmap: { school_id: schoolId } } },
    },
    select: { id: true },
  });
}

// PATCH /api/school-admin/roadmap/elements/[id]
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ id }, body] = await Promise.all([
    context.params,
    req.json().catch(() => ({})),
  ]);

  const element = await verifyElement(id, auth.school.id);
  if (!element) return NextResponse.json({ error: "Element not found" }, { status: 404 });

  const { text, order } = body;

  if (!text?.trim() && typeof order !== "number")
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const updated = await prisma.traitElement.update({
    where: { id },
    data: {
      ...(text?.trim() && { text: text.trim() }),
      ...(typeof order === "number" && { order }),
    },
    select: { id: true, text: true, order: true },
  });

  return NextResponse.json({ element: updated });
}

// DELETE /api/school-admin/roadmap/elements/[id]
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const element = await verifyElement(id, auth.school.id);
  if (!element) return NextResponse.json({ error: "Element not found" }, { status: 404 });

  await prisma.traitElement.delete({ where: { id } });

  return NextResponse.json({ success: true });
}