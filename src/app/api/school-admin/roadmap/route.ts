// api/school-admin/roadmap/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roadmap = await prisma.roadmap.findUnique({
    where: { school_id: auth.school.id },
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
              _count: { select: { attempts: true } },
              contents: {
                orderBy: { order: "asc" },
                select: {
                  id: true, type: true, order: true,
                  body: true,
                  image_url: true, alt_text: true,
                  video_url: true, video_title: true,
                },
              },
              questions: {
                orderBy: { order: "asc" },
                select: {
                  id: true, type: true, text: true, correct_answer: true, order: true,
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
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ roadmap });
}

export async function POST(req: Request) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [existing, body] = await Promise.all([
    prisma.roadmap.findUnique({
      where: { school_id: auth.school.id },
      select: { id: true, title: true },
    }),
    req.json().catch(() => ({})),
  ]);

  if (existing) return NextResponse.json({ roadmap: existing });

  const roadmap = await prisma.roadmap.create({
    data: {
      school_id: auth.school.id,
      title: body.title?.trim() || "بنك الأسئلة",
    },
    select: { id: true, title: true },
  });

  return NextResponse.json({ roadmap }, { status: 201 });
}