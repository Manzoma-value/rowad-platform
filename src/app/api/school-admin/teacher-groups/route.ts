// /api/school-admin/teacher-groups — list + create teacher groups.
// Read open to any admin (incl. view-only). Create gated on writer.
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const groups = await prisma.teacherGroup.findMany({
    where: { school_id: auth.school.id },
    orderBy: [{ updated_at: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      _count: { select: { members: true } },
    },
  });
  return NextResponse.json({ groups });
}

export async function POST(req: Request) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { name?: string; description?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const group = await prisma.teacherGroup.create({
    data: {
      school_id: auth.school.id,
      created_by: auth.profile.id,
      name: name.slice(0, 120),
      description: body.description?.toString().trim().slice(0, 1000) || null,
    },
    select: { id: true, name: true, description: true },
  });
  return NextResponse.json({ group }, { status: 201 });
}
