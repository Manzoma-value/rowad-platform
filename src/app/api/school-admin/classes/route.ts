// api/school-admin/classes/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const classes = await prisma.class.findMany({
    where: { school_id: auth.school.id },
    select: {
      id: true,
      name: true,
      created_at: true,
      teacher: {
        select: {
          id: true,
          profile: { select: { full_name: true } },
        },
      },
      _count: { select: { students: true } },
    },
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json({ classes });
}

export async function POST(req: Request) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim())
    return NextResponse.json({ error: "Name required" }, { status: 400 });

  const cls = await prisma.class.create({
    data: { name: name.trim(), school_id: auth.school.id },
    select: {
      id: true, name: true, created_at: true,
      teacher: { select: { id: true, profile: { select: { full_name: true } } } },
      _count: { select: { students: true } },
    },
  });

  return NextResponse.json({ class: cls }, { status: 201 });
}