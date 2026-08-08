// api/school-admin/roadmap/modules/[id]/main-trait/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

// PATCH /api/school-admin/roadmap/modules/[id]/main-trait
// Historical route name retained for compatibility. The payload now accepts
// several concept-to-trait links instead of one pre-weighted main trait.
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdminWriter();
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

  const links = Array.isArray(body.links) ? body.links : [];
  const uniqueIds = [...new Set(links.map((link: { trait_id?: string }) => link.trait_id).filter(Boolean))] as string[];

  const validTraits = uniqueIds.length
    ? await prisma.stageTrait.findMany({
        where: { id: { in: uniqueIds }, stage_id: mod.stage_id },
        select: { id: true },
      })
    : [];
  if (validTraits.length !== uniqueIds.length)
    return NextResponse.json(
      { error: "One or more traits do not belong to this concept's stage" },
      { status: 400 },
    );

  type LinkInput = { trait_id?: string; guidance_ar?: unknown; guidance_sq?: unknown };
  const sanitized = uniqueIds.map((traitId, position) => {
    const source = (links as LinkInput[]).find((link) => link.trait_id === traitId);
    return {
      module_id: moduleId,
      trait_id: traitId,
      position,
      guidance_ar: typeof source?.guidance_ar === "string" ? source.guidance_ar.trim() || null : null,
      guidance_sq: typeof source?.guidance_sq === "string" ? source.guidance_sq.trim() || null : null,
    };
  });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.moduleTraitLink.deleteMany({ where: { module_id: moduleId } });
    if (sanitized.length) await tx.moduleTraitLink.createMany({ data: sanitized });
    return tx.roadmapModule.update({
      where: { id: moduleId },
      data: { main_trait_id: uniqueIds[0] ?? null },
      select: {
        id: true,
        title: true,
        main_trait_id: true,
        trait_links: {
          orderBy: { position: "asc" },
          select: { trait_id: true, position: true, guidance_ar: true, guidance_sq: true },
        },
      },
    });
  });

  return NextResponse.json({ module: updated });
}
