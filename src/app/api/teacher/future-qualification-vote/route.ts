import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const frequencies = new Set(["WEEKLY", "BIWEEKLY", "MONTHLY"]);

const MAX_NOTES_LENGTH = 1000;

// The vote is shown right after signup (before the application is even
// filled) and again once a teacher is fully active — both are legitimate
// times to submit it. Mid-review or rejected teachers never see the modal,
// so they can't reach this endpoint through the UI either.
const VOTE_ELIGIBLE_STATUSES = new Set(["PENDING_APPLICATION", "ACTIVE"]);

type VoteInput = {
  coaching_frequency?: unknown;
  consultation_frequency?: unknown;
  evaluation_frequency?: unknown;
  field_support_frequency?: unknown;
  needs_group_leader?: unknown;
  notes?: unknown;
};

export async function GET() {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vote = await prisma.futureQualificationVote.findUnique({
    where: { teacher_id: auth.teacher.id },
    select: { submitted_at: true },
  });
  return NextResponse.json({ completed: Boolean(vote), submitted_at: vote?.submitted_at ?? null });
}

export async function POST(req: Request) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!VOTE_ELIGIBLE_STATUSES.has(auth.teacher.onboarding_status)) {
    return NextResponse.json({ error: "vote_not_available" }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as VoteInput | null;
  const frequencyAnswers = [
    body?.coaching_frequency,
    body?.consultation_frequency,
    body?.evaluation_frequency,
    body?.field_support_frequency,
  ];
  if (frequencyAnswers.some((answer) => typeof answer !== "string" || !frequencies.has(answer))) {
    return NextResponse.json({ error: "invalid_frequency" }, { status: 400 });
  }
  if (body?.coaching_frequency === "MONTHLY" || body?.consultation_frequency === "WEEKLY") {
    return NextResponse.json({ error: "invalid_option_for_question" }, { status: 400 });
  }
  if (typeof body?.needs_group_leader !== "boolean") {
    return NextResponse.json({ error: "invalid_group_leader_answer" }, { status: 400 });
  }
  const notesRaw = typeof body?.notes === "string" ? body.notes.trim() : "";
  if (notesRaw.length > MAX_NOTES_LENGTH) {
    return NextResponse.json({ error: "notes_too_long" }, { status: 400 });
  }

  const vote = await prisma.futureQualificationVote.upsert({
    where: { teacher_id: auth.teacher.id },
    update: {},
    create: {
      teacher_id: auth.teacher.id,
      school_id: auth.teacher.school_id,
      coaching_frequency: body.coaching_frequency as "WEEKLY" | "BIWEEKLY" | "MONTHLY",
      consultation_frequency: body.consultation_frequency as "WEEKLY" | "BIWEEKLY" | "MONTHLY",
      evaluation_frequency: body.evaluation_frequency as "WEEKLY" | "BIWEEKLY" | "MONTHLY",
      field_support_frequency: body.field_support_frequency as "WEEKLY" | "BIWEEKLY" | "MONTHLY",
      needs_group_leader: body.needs_group_leader,
      notes: notesRaw || null,
    },
    select: { submitted_at: true },
  });

  return NextResponse.json({ completed: true, submitted_at: vote.submitted_at }, { status: 201 });
}
