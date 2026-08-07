import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { canReadWorkshop, getWorkshopJourney } from "@/lib/workshop-journey";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const access = await canReadWorkshop(id, auth.teacher.school_id, auth.teacher.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ journey: await getWorkshopJourney(id, auth.teacher.id) });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const access = await canReadWorkshop(id, auth.teacher.school_id, auth.teacher.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => null) as { requirement_id?: string } | null;
  if (!body?.requirement_id) return NextResponse.json({ error: "requirement_id required" }, { status: 400 });
  const requirement = await prisma.workshopRequirement.findFirst({ where: { id: body.requirement_id, workshop_id: id, type: "READING" }, select: { id: true } });
  if (!requirement) return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
  await prisma.workshopRequirementCompletion.upsert({
    where: { requirement_id_teacher_id: { requirement_id: requirement.id, teacher_id: auth.teacher.id } },
    create: { requirement_id: requirement.id, teacher_id: auth.teacher.id },
    update: { completed_at: new Date() },
  });
  return NextResponse.json({ journey: await getWorkshopJourney(id, auth.teacher.id) });
}
