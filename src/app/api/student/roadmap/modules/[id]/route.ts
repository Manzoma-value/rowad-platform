import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const [{ data: { user } }, { id: moduleId }] = await Promise.all([
    supabase.auth.getUser(),
    context.params,
  ]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await prisma.student.findUnique({
    where: { profile_id: user.id },
    select: { id: true, school_id: true },
  });
  if (!student) return NextResponse.json({ error: "Beneficiary not found" }, { status: 404 });
  if (!student.school_id) {
    return NextResponse.json({ error: "Not assigned to a platform" }, { status: 403 });
  }

  const roadmapModule = await prisma.roadmapModule.findFirst({
    where: {
      id: moduleId,
      stage: { roadmap: { school_id: student.school_id } },
    },
    select: {
      id: true,
      title: true,
      description: true,
      order: true,
      contents: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          order: true,
          body: true,
          image_url: true,
          alt_text: true,
          video_url: true,
          video_title: true,
        },
      },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          text: true,
          order: true,
          options: {
            orderBy: { order: "asc" },
            select: { id: true, text: true, order: true },
          },
          matching_pairs: {
            orderBy: { order: "asc" },
            select: { id: true, left: true, right: true, order: true },
          },
        },
      },
      attempts: {
        where: { student_id: student.id },
        select: { score: true, total: true, passed: true },
        take: 1,
      },
    },
  });

  if (!roadmapModule) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  const { attempts, ...detail } = roadmapModule;
  return NextResponse.json({
    module: { ...detail, attempt: attempts[0] ?? null },
  });
}
