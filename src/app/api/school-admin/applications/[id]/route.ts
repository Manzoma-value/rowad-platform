// api/school-admin/applications/[id] — application detail.
// [id] is the teacher's id (not the application id) — easier from list rows.
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const teacher = await prisma.teacher.findFirst({
    where: { id, school_id: auth.school.id },
    select: {
      id: true,
      onboarding_status: true,
      created_at: true,
      profile: { select: { full_name: true, email: true } },
      application: true,
    },
  });
  if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ teacher });
}
