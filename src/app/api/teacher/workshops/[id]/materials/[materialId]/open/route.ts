import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";
import { canReadWorkshop } from "@/lib/workshop-journey";
import type { WorkshopMaterial } from "@/lib/workshops";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string; materialId: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, materialId } = await context.params;
  const access = await canReadWorkshop(id, auth.teacher.school_id, auth.teacher.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const record = await prisma.workshop.findUnique({ where: { id }, select: { materials: true } });
  const materials = Array.isArray(record?.materials) ? record.materials as unknown as WorkshopMaterial[] : [];
  const material = materials.find((item) => item.id === materialId);
  const isPdf = !!material && (
    material.mime?.toLowerCase() === "application/pdf" ||
    material.title.toLowerCase().endsWith(".pdf") ||
    material.url.toLowerCase().split(/[?#]/)[0].endsWith(".pdf")
  );
  if (!isPdf) return NextResponse.json({ error: "PDF material not found" }, { status: 404 });

  const now = new Date();
  const view = await prisma.workshopMaterialView.upsert({
    where: {
      workshop_id_teacher_id_material_id: {
        workshop_id: id,
        teacher_id: auth.teacher.id,
        material_id: materialId,
      },
    },
    create: {
      workshop_id: id,
      teacher_id: auth.teacher.id,
      material_id: materialId,
      first_opened_at: now,
      last_opened_at: now,
    },
    update: { last_opened_at: now, open_count: { increment: 1 } },
    select: { first_opened_at: true, last_opened_at: true, open_count: true },
  });
  return NextResponse.json({ view });
}
