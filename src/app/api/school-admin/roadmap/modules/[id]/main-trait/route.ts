// api/school-admin/roadmap/modules/[id]/main-trait/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

// PATCH /api/school-admin/roadmap/modules/[id]/main-trait
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ id: moduleId }, body] = await Promise.all([
    context.params,
    req.json().catch(() => ({})),
  ]);

  // Verify module belongs to this school
  const mod = await prisma.roadmapModule.findFirst({
    where: { id: moduleId, stage: { roadmap: { school_id: auth.school.id } } },
    select: { id: true, stage_id: true },
  });
  if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  const { trait_id } = body;

  // Allow unsetting the main trait by passing null
  if (trait_id === null) {
    const updated = await prisma.roadmapModule.update({
      where: { id: moduleId },
      data: { main_trait_id: null },
      select: { id: true, title: true, main_trait_id: true },
    });
    return NextResponse.json({ module: updated });
  }

  if (!trait_id)
    return NextResponse.json({ error: "trait_id required" }, { status: 400 });

  // Verify the trait belongs to the same stage as the module
  const trait = await prisma.stageTrait.findFirst({
    where: { id: trait_id, stage_id: mod.stage_id },
    select: { id: true, name: true, maqsad: true },
  });
  if (!trait)
    return NextResponse.json(
      { error: "Trait does not belong to this module's stage" },
      { status: 400 }
    );

  const updated = await prisma.roadmapModule.update({
    where: { id: moduleId },
    data: { main_trait_id: trait_id },
    select: {
      id: true,
      title: true,
      main_trait_id: true,
      main_trait: {
        select: { id: true, name: true, maqsad: true, definition: true },
      },
    },
  });

  return NextResponse.json({ module: updated });
}