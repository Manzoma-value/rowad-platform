// src/app/api/student/roadmap/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 30;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await prisma.student.findUnique({
    where: { profile_id: user.id },
    select: { id: true, school_id: true },
  });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (!student.school_id) return NextResponse.json({ roadmap: null });

  const roadmap = await prisma.roadmap.findUnique({
    where: { school_id: student.school_id },
    select: {
      id: true,
      title: true,
      stages: {
        orderBy: { order: "asc" },
        select: {
          id: true, title: true, order: true,
          modules: {
            orderBy: { order: "asc" },
            select: {
              id: true, title: true, description: true, order: true,

              // ── Lesson content blocks ──────────────────────────────
              contents: {
                orderBy: { order: "asc" },
                select: {
                  id: true, type: true, order: true,
                  body: true,
                  image_url: true, alt_text: true,
                  video_url: true, video_title: true,
                },
              },

              // ── Questions (correct_answer intentionally excluded) ──
              questions: {
                orderBy: { order: "asc" },
                select: {
                  id: true, type: true, text: true, order: true,
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

              // ── Student's attempt for this module (if any) ────────
              attempts: {
                where: { student_id: student.id },
                select: { score: true, total: true, passed: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!roadmap) return NextResponse.json({ roadmap: null });

  // Flatten attempts array → single attempt object or null
  const shaped = {
    ...roadmap,
    stages: roadmap.stages.map((stage) => ({
      ...stage,
      modules: stage.modules.map(({ attempts, ...mod }) => ({
        ...mod,
        attempt: attempts[0] ?? null,
      })),
    })),
  };

  return NextResponse.json({ roadmap: shaped });
}