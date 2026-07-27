// /api/school-admin/workshops/[id]/videos/upload-url
//   POST — issue a short-lived signed upload URL so the browser can send the
//   video file STRAIGHT to Supabase Storage.
//
//   Why: this app runs on Vercel, where a serverless function request body is
//   hard-capped at 4.5MB — any real video POSTed through a route handler comes
//   back 413 and no config can raise it. Only tiny JSON crosses our API now;
//   the bytes go browser → storage directly.
import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import { MAX_VIDEO_FILE, VIDEO_BUCKET, videoExtension } from "@/lib/workshop-videos";

export const dynamic = "force-dynamic";

function adminSupabase() {
  return createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const workshop = await prisma.workshop.findFirst({
    where: { id, school_id: auth.school.id },
    select: { id: true },
  });
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null) as
    | { filename?: string; mime_type?: string; size_bytes?: number }
    | null;

  const mime = body?.mime_type ?? "";
  if (!mime.startsWith("video/")) {
    return NextResponse.json({ error: "file must be a video" }, { status: 400 });
  }
  const size = Number(body?.size_bytes ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "size_bytes required" }, { status: 400 });
  }
  if (size > MAX_VIDEO_FILE) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }

  const ext = videoExtension(body?.filename ?? "", mime);
  const path = `workshops/${id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await adminSupabase().storage.from(VIDEO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[workshop-videos signed-url]", error?.message);
    return NextResponse.json({ error: error?.message ?? "could not create upload url" }, { status: 500 });
  }

  return NextResponse.json({ signed_url: data.signedUrl, token: data.token, path: data.path });
}
