// /api/school-admin/workshops/[id]/videos
//   GET  — list this workshop's videos with full question authoring detail.
//   POST — upload a new video file (multipart, field "file" + "title").
import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { requireSchoolAdmin, requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { MAX_VIDEO_FILE } from "@/lib/workshop-videos";

export const dynamic = "force-dynamic";
const BUCKET = "workshop-videos";

function adminSupabase() {
  return createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function workshopForAdmin(id: string, schoolId: string) {
  return prisma.workshop.findFirst({ where: { id, school_id: schoolId }, select: { id: true } });
}

const questionSelect = {
  id: true,
  type: true,
  text: true,
  correct_answer: true,
  timestamp_seconds: true,
  order: true,
  options: { orderBy: { order: "asc" as const }, select: { id: true, text: true, order: true } },
};

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const workshop = await workshopForAdmin(id, auth.school.id);
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const videos = await prisma.workshopVideo.findMany({
    where: { workshop_id: id },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      url: true,
      mime_type: true,
      size_bytes: true,
      order: true,
      created_at: true,
      questions: { orderBy: { timestamp_seconds: "asc" }, select: questionSelect },
    },
  });
  return NextResponse.json({ videos });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const workshop = await workshopForAdmin(id, auth.school.id);
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    return NextResponse.json({ error: "multipart form data required" }, { status: 400 });
  }
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (!file.type.startsWith("video/")) return NextResponse.json({ error: "file must be a video" }, { status: 400 });
  if (file.size > MAX_VIDEO_FILE) return NextResponse.json({ error: "file too large" }, { status: 413 });

  const title = String(form.get("title") || file.name).trim().slice(0, 160) || file.name;
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "mp4";
  const path = `workshops/${id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const admin = adminSupabase();
  const { error } = await admin.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("[workshop-videos upload]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path);

  const lastOrder = await prisma.workshopVideo.count({ where: { workshop_id: id } });
  try {
    const video = await prisma.workshopVideo.create({
      data: {
        workshop_id: id,
        title,
        storage_path: path,
        url: publicUrl,
        mime_type: file.type,
        size_bytes: file.size,
        order: lastOrder,
        created_by: auth.profile.id,
      },
      select: {
        id: true, title: true, url: true, mime_type: true, size_bytes: true, order: true, created_at: true,
      },
    });
    return NextResponse.json({ video: { ...video, questions: [] } }, { status: 201 });
  } catch (dbError) {
    await admin.storage.from(BUCKET).remove([path]).catch(() => null);
    console.error("[workshop-videos create]", dbError);
    return NextResponse.json({ error: "Could not save video" }, { status: 500 });
  }
}
