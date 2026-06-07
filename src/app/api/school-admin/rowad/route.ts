// api/school-admin/rowad/route.ts — list this school's Rowad submissions.
import { NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const submissions = await prisma.rowadSubmission.findMany({
    where: { school_id: auth.school.id, status: { not: "IN_PROGRESS" } },
    select: {
      id: true,
      stage: true,
      status: true,
      score: true,
      total: true,
      submitted_at: true,
      reviewed_at: true,
      teacher: {
        select: { id: true, profile: { select: { full_name: true } } },
      },
    },
    orderBy: { submitted_at: "desc" },
  });

  return NextResponse.json({ submissions });
}
