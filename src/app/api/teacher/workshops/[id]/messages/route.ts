import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await req.json().catch(() => null) as { body?: unknown } | null;
  const messageBody = typeof body?.body === "string" ? body.body.trim() : "";
  if (!messageBody) return NextResponse.json({ error: "message_required" }, { status: 400 });
  if (messageBody.length > 1500) return NextResponse.json({ error: "message_too_long" }, { status: 400 });

  const workshop = await prisma.workshop.findFirst({
    where: {
      id,
      school_id: auth.teacher.school_id,
      OR: [
        { enrollments: { some: { teacher_id: auth.teacher.id } } },
        { attendance: { some: { teacher_id: auth.teacher.id } } },
        { signed_up_teachers: { some: { id: auth.teacher.id } } },
      ],
    },
    select: { id: true, status: true },
  });
  if (!workshop) return NextResponse.json({ error: "workshop_access_required" }, { status: 403 });
  if (workshop.status === "CLOSED") return NextResponse.json({ error: "workshop_closed" }, { status: 410 });

  const message = await prisma.workshopMessage.create({
    data: { workshop_id: id, author_id: auth.profile.id, body: messageBody },
    select: {
      id: true,
      body: true,
      created_at: true,
      author: { select: { id: true, full_name: true, role: true, avatar_url: true } },
    },
  });
  return NextResponse.json({ message }, { status: 201 });
}
