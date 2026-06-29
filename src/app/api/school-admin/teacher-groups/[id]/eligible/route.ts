// GET /api/school-admin/teacher-groups/[id]/eligible?q=... — list ACTIVE
// teachers in this school NOT already in the group, optionally filtered by
// name/email substring (case-insensitive). For the "add members" picker.
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();

  // tenant guard
  const group = await prisma.teacherGroup.findFirst({
    where: { id, school_id: auth.school.id }, select: { id: true },
  });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const teachers = await prisma.teacher.findMany({
    where: {
      school_id: auth.school.id,
      onboarding_status: "ACTIVE",
      group_memberships: { none: { group_id: id } },
      ...(q
        ? {
            OR: [
              { profile: { full_name: { contains: q, mode: "insensitive" } } },
              { profile: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { created_at: "desc" },
    take: 50,
    select: {
      id: true,
      profile: { select: { id: true, full_name: true, email: true } },
      application: {
        select: {
          country: true,
          city: true,
          specialization: true,
          years_of_experience: true,
        },
      },
    },
  });
  return NextResponse.json({ teachers });
}
