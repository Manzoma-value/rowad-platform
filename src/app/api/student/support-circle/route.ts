import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/student-auth";
import { prisma } from "@/lib/prisma";
import { shapeStudentSupportCircle } from "@/lib/student-support-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStudent();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const student = await prisma.student.findUnique({
    where: { id: auth.student.id },
    select: {
      class: {
        select: {
          name: true,
          teacher: {
            select: {
              profile: { select: { full_name: true, email: true } },
              application: { select: { phone: true } },
            },
          },
        },
      },
      support_contacts: {
        select: { id: true, role: true, full_name: true, phone: true, email: true, relationship: true, notes: true },
      },
    },
  });
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ support_circle: shapeStudentSupportCircle(student) });
}
