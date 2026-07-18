import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const liveWorkshop = await prisma.workshop.findFirst({
    where: {
      school_id: auth.teacher.school_id,
      status: "OPEN",
      is_live: true,
      OR: [
        { enrollments: { some: { teacher_id: auth.teacher.id } } },
        { attendance: { some: { teacher_id: auth.teacher.id } } },
        { signed_up_teachers: { some: { id: auth.teacher.id } } },
      ],
    },
    orderBy: [{ live_started_at: "desc" }, { updated_at: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      live_started_at: true,
    },
  });

  return NextResponse.json(
    { live_workshop: liveWorkshop },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
