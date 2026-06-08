// api/owner/intake-assessment/[id]/questions/reorder/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!profile || profile.role !== "OWNER") return null;
  return profile;
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const profile = await requireOwner();
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ id: assessmentId }, body] = await Promise.all([
    context.params,
    req.json(),
  ]);

  const { order } = body as { order: string[] };
  if (!Array.isArray(order) || order.length === 0)
    return NextResponse.json({ error: "order array required" }, { status: 400 });

  // Verify assessment exists
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true },
  });
  if (!assessment)
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  // Batch update all question orders in a transaction
  await prisma.$transaction(
    order.map((qId, idx) =>
      prisma.assessmentQuestion.update({
        where: { id: qId },
        data: { order: idx + 1 },
      })
    )
  );

  return NextResponse.json({ success: true });
}
