import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const attended = await prisma.workshopAttendance.findFirst({ where: { workshop_id: id, teacher_id: auth.teacher.id }, select: { id: true } });
  const workshop = await prisma.workshop.findFirst({
    where: { id, school_id: auth.teacher.school_id },
    select: { id: true, title: true, description: true, audience: true, audience_other: true, start_date: true, end_date: true, schedule: true, notes: true, materials: true, status: true },
  });
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ workshop: { ...workshop, notes: attended ? workshop.notes : null, materials: attended ? workshop.materials : [] }, attended: !!attended });
}
