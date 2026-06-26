// api/school-admin/placement-assessment/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

export const revalidate = 120;

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assessment = await prisma.assessment.findFirst({
    where: { type: "SCHOOL_PLACEMENT", school_id: auth.school.id },
    select: {
      id: true, title: true, is_active: true,
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true, type: true, text: true, correct_answer: true, order: true,
          options: {
            orderBy: { order: "asc" },
            select: { id: true, text: true, order: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ assessment });
}

export async function POST(req: Request) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [existing, { title }] = await Promise.all([
    prisma.assessment.findFirst({
      where: { type: "SCHOOL_PLACEMENT", school_id: auth.school.id },
      select: { id: true },
    }),
    req.json(),
  ]);

  if (existing)
    return NextResponse.json({ error: "Already exists" }, { status: 400 });

  const assessment = await prisma.assessment.create({
    data: {
      title: title || "School Placement Assessment",
      type: "SCHOOL_PLACEMENT",
      school_id: auth.school.id,
      is_active: true,
    },
    select: { id: true, title: true, is_active: true },
  });

  return NextResponse.json({ assessment }, { status: 201 });
}