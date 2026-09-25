// PATCH /api/owner/admins/[id] — toggle is_active on a school admin's profile
// [id] is the profile.id of the admin
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireOwner } from "@/lib/owner-auth";

const ActivationSchema = z.object({
  is_active: z.boolean(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const result = ActivationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  // Verify target is a SCHOOL_ADMIN
  const target = await prisma.profile.findUnique({
    where: { id },
    select: { id: true, role: true, is_active: true },
  });

  if (!target || target.role !== "SCHOOL_ADMIN") {
    return NextResponse.json({ error: "المدير غير موجود" }, { status: 404 });
  }

  const updated = await prisma.profile.update({
    where: { id },
    data: { is_active: result.data.is_active },
    select: { id: true, full_name: true, is_active: true },
  });

  return NextResponse.json({ profile: updated });
}
