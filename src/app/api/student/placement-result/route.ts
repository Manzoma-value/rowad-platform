// api/student/announcements/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  if (!classId)
    return NextResponse.json({ error: "classId is required" }, { status: 400 });

  const announcements = await prisma.announcement.findMany({
    where: { class_id: classId },
    select: {
      id: true,
      content: true,
      created_at: true,
      teacher: {
        select: { profile: { select: { full_name: true } } },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json(announcements);
}