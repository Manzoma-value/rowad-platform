import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { parseStudentSupportMutation, saveStudentSupportContact } from "@/lib/student-support-server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const student = await prisma.student.findFirst({ where: { id, school_id: auth.school.id }, select: { id: true } });
  if (!student) return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });

  const parsed = parseStudentSupportMutation(await req.json().catch(() => null));
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const contact = await saveStudentSupportContact(student.id, parsed.data);
  return NextResponse.json({ role: parsed.data.role, contact });
}
