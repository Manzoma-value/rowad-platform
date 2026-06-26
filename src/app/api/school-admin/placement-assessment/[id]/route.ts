// api/school-admin/placement-assessment/[id]/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ id }, body] = await Promise.all([context.params, req.json()]);
  const { title, is_active } = body;

  // Verify this assessment belongs to this school
  const existing = await prisma.assessment.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assessment = await prisma.assessment.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(is_active !== undefined && { is_active }),
    },
    select: { id: true, title: true, is_active: true },
  });

  return NextResponse.json({ assessment });
}