import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// The vote can be shown right after signup (before the application is even
// filled) and again once a teacher is fully active. Mid-review or rejected
// teachers never reach this endpoint through the UI either.
const VOTE_ELIGIBLE_STATUSES = new Set(["PENDING_APPLICATION", "ACTIVE"]);

export async function GET() {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!VOTE_ELIGIBLE_STATUSES.has(auth.teacher.onboarding_status)) {
    return NextResponse.json({ votes: [] });
  }

  const votes = await prisma.vote.findMany({
    where: {
      school_id: auth.teacher.school_id,
      status: "OPEN",
      responses: { none: { teacher_id: auth.teacher.id } },
    },
    orderBy: { created_at: "asc" },
    select: {
      id: true, title: true, description: true, allow_notes: true,
      questions: { orderBy: { position: "asc" }, select: { id: true, prompt: true, options: true } },
    },
  });

  return NextResponse.json({ votes });
}
