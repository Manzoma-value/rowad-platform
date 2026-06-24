// GET /api/student/current-concept — current concept + progress breakdown.
// Returns null current if the student finished every concept (or roadmap is empty).
import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/student-auth";
import { resolveStudentRoadmapState } from "@/lib/concept-progress";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStudent();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!auth.student.school_id) {
    return NextResponse.json({ error: "Not in a school" }, { status: 409 });
  }

  const state = await resolveStudentRoadmapState({
    student_id: auth.student.id,
    class_id: auth.student.class_id ?? null,
    school_id: auth.student.school_id,
  });

  return NextResponse.json(state);
}
