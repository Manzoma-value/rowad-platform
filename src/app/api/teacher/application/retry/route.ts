import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (auth.teacher.onboarding_status !== "REJECTED") {
    return NextResponse.json(
      { error: "retry_allowed_only_after_rejection" },
      { status: 409 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.teacherApplication.deleteMany({
      where: { teacher_id: auth.teacher.id },
    });
    await tx.teacher.update({
      where: { id: auth.teacher.id },
      data: { onboarding_status: "PENDING_APPLICATION" },
    });
  });

  return NextResponse.json({ success: true, status: "PENDING_APPLICATION" });
}
