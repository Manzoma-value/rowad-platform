// api/school-admin/roadmap/stages/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [roadmap, body] = await Promise.all([
    prisma.roadmap.findUnique({
      where: { school_id: auth.school.id },
      select: { id: true },
    }),
    req.json().catch(() => ({})),
  ]);

  if (!roadmap) return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
  if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const last = await prisma.roadmapStage.findFirst({
    where: { roadmap_id: roadmap.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const stage = await prisma.roadmapStage.create({
    data: {
      roadmap_id: roadmap.id,
      title: body.title.trim(),
      order: (last?.order ?? 0) + 1,
    },
    select: { id: true, title: true, order: true },
  });

  return NextResponse.json({ stage }, { status: 201 });
}