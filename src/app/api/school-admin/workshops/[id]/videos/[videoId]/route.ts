// /api/school-admin/workshops/[id]/videos/[videoId]
//   PATCH  — rename / reorder.
//   DELETE — remove the video (cascades to questions/views/attempts) and
//            its file in storage.
import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { VIDEO_BUCKET } from "@/lib/workshop-videos";

export const dynamic = "force-dynamic";

function adminSupabase() {
  return createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function videoForAdmin(id: string, videoId: string, schoolId: string) {
  return prisma.workshopVideo.findFirst({
    where: { id: videoId, workshop_id: id, workshop: { school_id: schoolId } },
    select: { id: true, storage_path: true, source_type: true },
  });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string; videoId: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, videoId } = await context.params;
  const existing = await videoForAdmin(id, videoId, auth.school.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { title?: string; order?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
    data.title = title.slice(0, 160);
  }
  if (typeof body.order === "number") data.order = body.order;

  const video = await prisma.workshopVideo.update({
    where: { id: videoId },
    data,
    select: { id: true, title: true, order: true },
  });
  return NextResponse.json({ video });
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string; videoId: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, videoId } = await context.params;
  const existing = await videoForAdmin(id, videoId, auth.school.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workshopVideo.delete({ where: { id: videoId } });
  if (existing.source_type === "SUPABASE" && existing.storage_path) {
    await adminSupabase().storage.from(VIDEO_BUCKET).remove([existing.storage_path]).catch(() => null);
  }
  return NextResponse.json({ success: true });
}
