import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/owner-auth";

export const revalidate = 60;

export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assessment = await prisma.assessment.findFirst({
    where: { type: "PLATFORM_INTAKE" },
    select: {
      id: true,
      title: true,
      is_active: true,
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true, type: true, text: true,
          correct_answer: true, order: true,
          options: {
            orderBy: { order: "asc" },
            select: { id: true, text: true, order: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ assessment });
}

export async function POST(req: Request) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title } = await req.json();
  if (!title?.trim())
    return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });

  const assessment = await prisma.assessment.create({
    data: {
      title: title.trim(),
      type: "PLATFORM_INTAKE",
      is_active: false,
    },
    select: { id: true, title: true, is_active: true },
  });

  return NextResponse.json({ assessment }, { status: 201 });
}
