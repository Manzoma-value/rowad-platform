// api/teacher/lessons/contents/[id]/route.ts
import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/prisma";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

function adminSupabase() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function ensureOwnership(id: string, teacherId: string) {
  return prisma.lessonContent.findFirst({
    where: { id, lesson: { teacher_id: teacherId } },
    select: { id: true, type: true, storage_path: true, lesson_id: true },
  });
}

// PUT /api/teacher/lessons/contents/[id]
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const existing = await ensureOwnership(id, auth.teacher.id);
  if (!existing) return NextResponse.json({ error: "Content not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";

  // ── IMAGE (multipart) ──
  if (contentType.includes("multipart/form-data") && existing.type === "IMAGE") {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const altText = (form.get("alt_text") as string | null)?.trim() || null;

    const updateData: Record<string, unknown> = { alt_text: altText };

    if (file) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `lessons/${auth.teacher.id}/${existing.lesson_id}/${Date.now()}.${ext}`;
      const supabase = adminSupabase();

      const { error: uploadError } = await supabase.storage
        .from("lesson-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      // Best-effort cleanup of the old image
      if (existing.storage_path) {
        await supabase.storage.from("lesson-images").remove([existing.storage_path]).catch(() => {});
      }

      const { data: { publicUrl } } = supabase.storage
        .from("lesson-images")
        .getPublicUrl(path);
      updateData.image_url = publicUrl;
      updateData.storage_path = path;
    }

    const content = await prisma.lessonContent.update({
      where: { id },
      data: updateData,
      select: { id: true, type: true, image_url: true, alt_text: true, storage_path: true },
    });
    return NextResponse.json({ content });
  }

  // ── TEXT or VIDEO (JSON) ──
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (existing.type === "TEXT") {
    if (typeof body.body === "string" && body.body.trim()) data.body = body.body.trim();
  } else if (existing.type === "VIDEO") {
    if (typeof body.video_url === "string" && body.video_url.trim()) {
      data.video_url = body.video_url.trim();
    }
    if (typeof body.video_title === "string") {
      data.video_title = body.video_title.trim() || null;
    }
  } else if (existing.type === "IMAGE") {
    if (typeof body.alt_text === "string") data.alt_text = body.alt_text.trim() || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const content = await prisma.lessonContent.update({
    where: { id },
    data,
    select: {
      id: true, type: true, body: true,
      image_url: true, alt_text: true, video_url: true, video_title: true,
    },
  });
  return NextResponse.json({ content });
}

// DELETE /api/teacher/lessons/contents/[id]
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireTeacher();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const existing = await ensureOwnership(id, auth.teacher.id);
  if (!existing) return NextResponse.json({ error: "Content not found" }, { status: 404 });

  // Best-effort: also remove the storage object for images
  if (existing.type === "IMAGE" && existing.storage_path) {
    const supabase = adminSupabase();
    await supabase.storage.from("lesson-images").remove([existing.storage_path]).catch(() => {});
  }

  await prisma.lessonContent.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
