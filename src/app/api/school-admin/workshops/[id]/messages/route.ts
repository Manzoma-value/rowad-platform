import { NextResponse } from "next/server";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

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
    select: { id: true },
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
  return NextResponse.json({ message }, { status: 201 });
}
