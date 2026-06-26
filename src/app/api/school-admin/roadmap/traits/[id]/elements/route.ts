// api/school-admin/roadmap/traits/[id]/elements/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

async function verifyTrait(traitId: string, schoolId: string) {
  return prisma.stageTrait.findFirst({
    where: { id: traitId, stage: { roadmap: { school_id: schoolId } } },
    select: { id: true },
  });
}

// POST /api/school-admin/roadmap/traits/[id]/elements
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ id: traitId }, body] = await Promise.all([
    context.params,
    req.json().catch(() => ({})),
  ]);

  const trait = await verifyTrait(traitId, auth.school.id);
  if (!trait) return NextResponse.json({ error: "Trait not found" }, { status: 404 });

  const { text } = body;
  if (!text?.trim())
    return NextResponse.json({ error: "text required" }, { status: 400 });

  const last = await prisma.traitElement.findFirst({
    where: { trait_id: traitId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const element = await prisma.traitElement.create({
    data: {
      trait_id: traitId,
      text: text.trim(),
      order: (last?.order ?? 0) + 1,
    },
    select: { id: true, text: true, order: true },
  });

  return NextResponse.json({ element }, { status: 201 });
}