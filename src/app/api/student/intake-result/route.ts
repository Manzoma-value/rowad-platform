// api/student/intake-result/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedUser } from "@/lib/auth/verified-user";

export async function GET() {
  const user = await getVerifiedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await prisma.student.findUnique({ where: { profile_id: user.id } });
  if (!student) return NextResponse.json({ attempt: null });

  const attempt = await prisma.assessmentAttempt.findFirst({
    where: {
      student_id: student.id,
      assessment: { type: "PLATFORM_INTAKE" },
      review_status: "REVIEWED",
    },
    select: { score: true, total: true },
    orderBy: { submitted_at: "desc" },
  });

  return NextResponse.json({ attempt });
}
