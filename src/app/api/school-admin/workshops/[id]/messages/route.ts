import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { notifyProfiles, workshopTeacherProfileIds } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const body = await req.json().catch(() => null) as { body?: unknown } | null;
  const messageBody = typeof body?.body === "string" ? body.body.trim() : "";
  if (!messageBody) return NextResponse.json({ error: "message_required" }, { status: 400 });
  if (messageBody.length > 1500) return NextResponse.json({ error: "message_too_long" }, { status: 400 });

  const workshop = await prisma.workshop.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true, title: true },
  });
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const message = await prisma.workshopMessage.create({
    data: { workshop_id: id, author_id: auth.profile.id, body: messageBody },
    select: {
      id: true,
      body: true,
      created_at: true,
      author: { select: { id: true, full_name: true, role: true, avatar_url: true } },
    },
  });
  const teacherIds = await workshopTeacherProfileIds(id);
  await notifyProfiles(teacherIds, {
    type: "WORKSHOP_MESSAGE",
    title_ar: "إعلان جديد في الورشة",
    title_sq: "Njoftim i ri në trajnim",
    title_en: "New workshop announcement",
    body_ar: messageBody.slice(0, 180),
    body_sq: messageBody.slice(0, 180),
    body_en: messageBody.slice(0, 180),
    href: `/workshops/${id}`,
    actor_id: auth.profile.id,
    event_key: `workshop-message:${message.id}`,
  }).catch(() => undefined);
  return NextResponse.json({ message }, { status: 201 });
}
