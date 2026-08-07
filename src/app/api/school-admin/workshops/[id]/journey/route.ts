import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function ownsWorkshop(id: string, schoolId: string) {
  return prisma.workshop.findFirst({ where: { id, school_id: schoolId }, select: { id: true } });
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  if (!await ownsWorkshop(id, auth.school.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [requirements, teachers] = await Promise.all([
    prisma.workshopRequirement.findMany({ where: { workshop_id: id }, orderBy: { order: "asc" }, include: { quiz: { include: { questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } } } }, _count: { select: { completions: true } } } }),
    prisma.teacher.findMany({ where: { school_id: auth.school.id, onboarding_status: "ACTIVE", profile: { is: { is_active: true } }, OR: [{ workshop_enrollments: { some: { workshop_id: id, status: "APPROVED" } } }, { workshop_signup_id: id }, { workshop_attendance: { some: { workshop_id: id } } }] }, orderBy: { profile: { full_name: "asc" } }, select: { id: true, profile: { select: { full_name: true, email: true, avatar_url: true } }, workshop_completions: { where: { workshop_id: id }, select: { completed_at: true }, take: 1 } } }),
  ]);
  return NextResponse.json({ requirements, teachers: teachers.map((teacher) => ({ teacher_id: teacher.id, ...teacher.profile, completed_at: teacher.workshop_completions[0]?.completed_at ?? null })) });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  if (!await ownsWorkshop(id, auth.school.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => null) as { type?: "VIDEO" | "QUIZ" | "MESSAGE" | "READING"; title?: string; description?: string; min_length?: number; is_required?: boolean } | null;
  if (!body?.type || !["VIDEO", "QUIZ", "MESSAGE", "READING"].includes(body.type)) return NextResponse.json({ error: "valid type required" }, { status: 400 });
  if (body.type === "QUIZ" && await prisma.workshopRequirement.findFirst({ where: { workshop_id: id, type: "QUIZ" }, select: { id: true } })) {
    return NextResponse.json({ error: "workshop quiz already exists" }, { status: 409 });
  }
  const order = await prisma.workshopRequirement.count({ where: { workshop_id: id } });
  const requirement = await prisma.workshopRequirement.create({ data: { workshop_id: id, type: body.type, title: body.title?.trim().slice(0, 180) || ({ VIDEO: "Complete all videos", QUIZ: "Workshop quiz", MESSAGE: "Share what you learned", READING: "Complete the reading" }[body.type]), description: body.description?.trim().slice(0, 1000) || null, min_length: Math.max(1, Math.min(4000, Number(body.min_length) || 1)), is_required: body.is_required !== false, order, created_by: auth.profile.id, ...(body.type === "QUIZ" ? { quiz: { create: { title: body.title?.trim().slice(0, 180) || "Workshop quiz", description: body.description?.trim().slice(0, 1000) || null } } } : {}) }, include: { quiz: true } });
  return NextResponse.json({ requirement }, { status: 201 });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  if (!await ownsWorkshop(id, auth.school.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => null) as { requirement_id?: string; title?: string; description?: string | null; min_length?: number; is_required?: boolean; order?: number } | null;
  if (!body?.requirement_id) return NextResponse.json({ error: "requirement_id required" }, { status: 400 });
  const requirement = await prisma.workshopRequirement.updateMany({ where: { id: body.requirement_id, workshop_id: id }, data: { ...(body.title !== undefined ? { title: body.title.trim().slice(0, 180) } : {}), ...(body.description !== undefined ? { description: body.description?.trim().slice(0, 1000) || null } : {}), ...(body.min_length !== undefined ? { min_length: Math.max(1, Math.min(4000, Number(body.min_length) || 1)) } : {}), ...(typeof body.is_required === "boolean" ? { is_required: body.is_required } : {}), ...(body.order !== undefined ? { order: Math.max(0, Math.round(body.order)) } : {}) } });
  if (!requirement.count) return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  if (!await ownsWorkshop(id, auth.school.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const requirementId = new URL(req.url).searchParams.get("requirement_id");
  if (!requirementId) return NextResponse.json({ error: "requirement_id required" }, { status: 400 });
  await prisma.workshopRequirement.deleteMany({ where: { id: requirementId, workshop_id: id } });
  return NextResponse.json({ success: true });
}
