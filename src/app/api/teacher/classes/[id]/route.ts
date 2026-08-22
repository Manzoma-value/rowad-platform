import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/teacher-auth";

const UpdateClassSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ id }, body] = await Promise.all([context.params, req.json().catch(() => null)]);
  const parsed = UpdateClassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid group name is required" }, { status: 400 });
  }

  const owned = await prisma.class.findFirst({
    where: { id, teacher_id: auth.teacher.id, school_id: auth.teacher.school_id },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  try {
    const group = await prisma.class.update({
      where: { id },
      data: { name: parsed.data.name },
      select: { id: true, name: true },
    });
    return NextResponse.json({ group });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A group with this name already exists" }, { status: 409 });
    }
    throw error;
  }
}
