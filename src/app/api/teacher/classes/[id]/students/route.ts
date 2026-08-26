import { randomUUID } from "node:crypto";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-auth";

const AddManualStudentSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  city: z.string().trim().max(100).optional(),
  age: z.number().int().min(3).max(100).optional(),
}).strict();

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ id }, body] = await Promise.all([
    context.params,
    req.json().catch(() => null),
  ]);
  const parsed = AddManualStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid student details" }, { status: 400 });
  }

  const ownedClass = await prisma.class.findFirst({
    where: {
      id,
      teacher_id: auth.teacher.id,
      school_id: auth.teacher.school_id,
    },
    select: { id: true },
  });
  if (!ownedClass) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const student = await prisma.student.create({
    data: {
      class: { connect: { id } },
      school: { connect: { id: auth.teacher.school_id } },
      onboarding_status: "CLASS_ASSIGNED",
      is_manually_added: true,
      city: parsed.data.city || null,
      age: parsed.data.age ?? null,
      profile: {
        create: {
          id: randomUUID(),
          full_name: parsed.data.full_name,
          role: Role.STUDENT,
        },
      },
    },
    select: {
      id: true,
      city: true,
      age: true,
      is_manually_added: true,
      profile: {
        select: { full_name: true, avatar_url: true },
      },
    },
  });

  return NextResponse.json({ student }, { status: 201 });
}
