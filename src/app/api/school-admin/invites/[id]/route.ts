// src/app/api/school-admin/invites/[id]/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const [auth, { id }] = await Promise.all([
    requireSchoolAdmin(),
    context.params,
  ]);

  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.invite.findUnique({
    where: { id },
    select: { id: true, school_id: true, is_active: true },
  });

  if (!existing)
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  if (existing.school_id !== auth.school.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!existing.is_active)
    return NextResponse.json({ error: "Already disabled" }, { status: 409 });

  const updated = await prisma.invite.update({
    where: { id },
    data: { is_active: false },
    select: { id: true, is_active: true, updated_at: true },
  });

  return NextResponse.json({ invite: updated });
}