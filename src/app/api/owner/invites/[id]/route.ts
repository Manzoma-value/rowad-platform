// PATCH /api/owner/invites/[id] — disable an admin invite
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/owner-auth";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const invite = await prisma.invite.findUnique({
    where: { id },
    select: { id: true, type: true, is_active: true },
  });

  if (!invite || invite.type !== "ADMIN") {
    return NextResponse.json({ error: "الدعوة غير موجودة" }, { status: 404 });
  }
  if (!invite.is_active) {
    return NextResponse.json({ error: "الدعوة معطّلة بالفعل" }, { status: 409 });
  }

  const updated = await prisma.invite.update({
    where: { id },
    data: { is_active: false },
    select: { id: true, is_active: true, updated_at: true },
  });

  return NextResponse.json({ invite: updated });
}
