// api/school-admin/roadmap/traits/[id]/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

async function verifyTrait(traitId: string, schoolId: string) {
  return prisma.stageTrait.findFirst({
    where: { id: traitId, stage: { roadmap: { school_id: schoolId } } },
    select: { id: true },
  });
}

// PATCH /api/school-admin/roadmap/traits/[id]
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

  const trait = await verifyTrait(id, auth.school.id);
  if (!trait) return NextResponse.json({ error: "Trait not found" }, { status: 404 });

  const { name, definition } = body;

  if (!name?.trim() && definition === undefined)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const updated = await prisma.stageTrait.update({
    where: { id },
    data: {
      ...(name?.trim() && { name: name.trim() }),
      ...(definition !== undefined && { definition: definition?.trim() || null }),
    },
    select: {
      id: true, maqsad: true, name: true, definition: true,
      elements: { orderBy: { order: "asc" }, select: { id: true, text: true, order: true } },
    },
  });

  return NextResponse.json({ trait: updated });
}

// DELETE /api/school-admin/roadmap/traits/[id]
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const trait = await verifyTrait(id, auth.school.id);
  if (!trait) return NextResponse.json({ error: "Trait not found" }, { status: 404 });

  // Unset main_trait_id on any modules using this trait before deleting
  await prisma.roadmapModule.updateMany({
    where: { main_trait_id: id },
    data: { main_trait_id: null },
  });

  await prisma.stageTrait.delete({ where: { id } });

  return NextResponse.json({ success: true });
}