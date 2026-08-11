// /api/teacher/workshops/[id]/videos/[videoId]/view
//   POST — record that this teacher pressed play (and, once the video ends,
//   that they watched it through). Upserted so repeat plays just bump
//   last_viewed_at instead of creating duplicate rows.
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";
import { markWorkshopActivityAttendance } from "@/lib/workshop-attendance";

export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: Promise<{ id: string; videoId: string }> }) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, videoId } = await context.params;
  const { teacher } = auth;

  const body = await req.json().catch(() => ({})) as { completed?: boolean };

  const video = await prisma.workshopVideo.findFirst({
    where: {
      id: videoId,
      workshop_id: id,
      workshop: {
        school_id: teacher.school_id,
        OR: [
          { enrollments: { some: { teacher_id: teacher.id, status: "APPROVED" } } },
          { signed_up_teachers: { some: { id: teacher.id } } },
          { attendance: { some: { teacher_id: teacher.id } } },
        ],
      },
    },
    select: { id: true },
  });
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const view = await prisma.workshopVideoView.upsert({
    where: { video_id_teacher_id: { video_id: videoId, teacher_id: teacher.id } },
    create: {
      video_id: videoId,
      teacher_id: teacher.id,
      first_viewed_at: now,
      last_viewed_at: now,
      completed_at: body.completed ? now : null,
    },
    update: {
      last_viewed_at: now,
      ...(body.completed ? { completed_at: now } : {}),
    },
    select: { first_viewed_at: true, last_viewed_at: true, completed_at: true },
  });

  const attendance = await markWorkshopActivityAttendance(id, teacher.id);

  return NextResponse.json({ view, attendance });
}
