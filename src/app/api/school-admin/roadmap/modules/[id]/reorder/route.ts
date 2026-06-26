// api/school-admin/roadmap/modules/[id]/reorder/route.ts
//
// PATCH — reorder questions or content blocks of a roadmap module.
// Body: { kind: "questions" | "contents", ids: string[] }
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: moduleId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const kind = body.kind as "questions" | "contents" | undefined;
  const ids  = body.ids  as string[] | undefined;

  if (kind !== "questions" && kind !== "contents") {
    return NextResponse.json({ error: "kind must be 'questions' or 'contents'" }, { status: 400 });
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  // Verify the module belongs to this admin's school.
  const mod = await prisma.roadmapModule.findFirst({
    where: { id: moduleId, stage: { roadmap: { school_id: auth.school.id } } },
    select: { id: true },
  });
  if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  if (kind === "questions") {
    const owned = await prisma.roadmapQuestion.findMany({
      where: { module_id: moduleId, id: { in: ids } },
      select: { id: true },
    });
    if (owned.length !== ids.length) {
      return NextResponse.json({ error: "Some ids do not belong to this module" }, { status: 400 });
    }
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.roadmapQuestion.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    );
  } else {
    const owned = await prisma.moduleContent.findMany({
      where: { module_id: moduleId, id: { in: ids } },
      select: { id: true },
    });
    if (owned.length !== ids.length) {
      return NextResponse.json({ error: "Some ids do not belong to this module" }, { status: 400 });
    }
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.moduleContent.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    );
  }

  return NextResponse.json({ success: true });
}
