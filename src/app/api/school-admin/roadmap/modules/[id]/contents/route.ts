// api/school-admin/roadmap/modules/[id]/contents/route.ts
import { NextResponse } from "next/server";
import { requireSchoolAdmin, requireSchoolAdminWriter } from '@/lib/school-admin-auth';
import { prisma } from "@/lib/prisma";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

function adminSupabase() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: moduleId } = await context.params;

  // Verify module belongs to this school
  const mod = await prisma.roadmapModule.findFirst({
    where: { id: moduleId, stage: { roadmap: { school_id: auth.school.id } } },
    select: { id: true },
  });
  if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  const last = await prisma.moduleContent.findFirst({
    where: { module_id: moduleId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (last?.order ?? 0) + 1;

  const contentType = req.headers.get("content-type") ?? "";

  // ── IMAGE (multipart) ──
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const altText = (form.get("alt_text") as string | null)?.trim() || null;

    if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `roadmap/${auth.school.id}/${moduleId}/${Date.now()}.${ext}`;

    const supabase = adminSupabase();
    const { error: uploadError } = await supabase.storage
      .from("roadmap-images")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage
      .from("roadmap-images")
      .getPublicUrl(path);

    const content = await prisma.moduleContent.create({
      data: {
        module_id: moduleId,
        type: "IMAGE",
        order: nextOrder,
        storage_path: path,
        image_url: publicUrl,
        alt_text: altText,
      },
      select: { id: true, type: true, order: true, image_url: true, alt_text: true, storage_path: true },
    });

    return NextResponse.json({ content }, { status: 201 });
  }

  // ── TEXT or VIDEO (JSON) ──
  const body = await req.json().catch(() => ({}));
  const { type, body: textBody, video_url, video_title } = body;

  if (type === "TEXT") {
    if (!textBody?.trim())
      return NextResponse.json({ error: "body required" }, { status: 400 });

    const content = await prisma.moduleContent.create({
      data: { module_id: moduleId, type: "TEXT", order: nextOrder, body: textBody.trim() },
      select: { id: true, type: true, order: true, body: true },
    });
    return NextResponse.json({ content }, { status: 201 });
  }

  if (type === "VIDEO") {
    if (!video_url?.trim())
      return NextResponse.json({ error: "video_url required" }, { status: 400 });

    const content = await prisma.moduleContent.create({
      data: {
        module_id: moduleId,
        type: "VIDEO",
        order: nextOrder,
        video_url: video_url.trim(),
        video_title: video_title?.trim() || null,
      },
      select: { id: true, type: true, order: true, video_url: true, video_title: true },
    });
    return NextResponse.json({ content }, { status: 201 });
  }

  return NextResponse.json({ error: "type must be TEXT, IMAGE, or VIDEO" }, { status: 400 });
}