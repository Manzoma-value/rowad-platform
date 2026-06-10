// api/student/placement-result/route.ts
//
// Returns the student's latest reviewed SCHOOL_PLACEMENT attempt — the
// score the welcome page shows the student after they're assigned a class.
//
// The file used to contain the announcements code by mistake (copy/paste),
// which caused the welcome page to silently never show the score.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await prisma.student.findUnique({
    where: { profile_id: user.id },
    select: { id: true },
  });
  if (!student) return NextResponse.json({ attempt: null });

  const attempt = await prisma.assessmentAttempt.findFirst({
    where: {
      student_id: student.id,
      assessment: { type: "SCHOOL_PLACEMENT" },
      review_status: "REVIEWED",
    },
    select: { score: true, total: true },
    orderBy: { submitted_at: "desc" },
  });

  return NextResponse.json({ attempt });
}
