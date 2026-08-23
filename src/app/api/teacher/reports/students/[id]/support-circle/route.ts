import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";
import { parseStudentSupportMutation, saveStudentSupportContact } from "@/lib/student-support-server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const student = await prisma.student.findFirst({
    where: { id, class: { teacher_id: auth.teacher.id } },
    select: { id: true },
  });
  if (!student) return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });

  const parsed = parseStudentSupportMutation(await req.json().catch(() => null));
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const contact = await saveStudentSupportContact(student.id, parsed.data);
  return NextResponse.json({ role: parsed.data.role, contact });
}
