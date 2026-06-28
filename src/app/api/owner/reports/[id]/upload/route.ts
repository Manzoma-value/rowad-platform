// POST /api/owner/reports/[id]/upload — multipart upload.
// Body fields:
//   kind: "image" | "file"
//   file: the binary
// Stored in Supabase Storage bucket "owner-reports" under
//   <report_id>/images/...  or  <report_id>/files/...
//
// Returns { url, path, name, size, mime } — caller appends to the
// report's `images[]` or `attachments[]` JSON column via PATCH.
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { prisma } from "@/lib/prisma";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const BUCKET = "owner-reports";
const MAX_IMAGE = 8 * 1024 * 1024;     //  8 MB
const MAX_FILE  = 30 * 1024 * 1024;    // 30 MB

function adminSupabase() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;

  const exists = await prisma.ownerReport.findUnique({
    where: { id }, select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 });
  }

  const form = await req.formData();
  const kind = (form.get("kind") as string | null)?.toLowerCase();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (kind !== "image" && kind !== "file") {
    return NextResponse.json({ error: "kind must be image or file" }, { status: 400 });
  }
  const limit = kind === "image" ? MAX_IMAGE : MAX_FILE;
  if (file.size > limit) {
    return NextResponse.json(
      { error: `file too large (max ${Math.round(limit / 1024 / 1024)}MB)` },
      { status: 413 },
    );
  }

  const cleanName = file.name.replace(/[^\w.؀-ۿ-]/g, "_").slice(0, 80);
  const ext = cleanName.includes(".") ? cleanName.split(".").pop() : (kind === "image" ? "jpg" : "bin");
  const subdir = kind === "image" ? "images" : "files";
  const path = `${id}/${subdir}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const admin = adminSupabase();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("[owner-reports upload]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({
    url: publicUrl,
    path,
    name: file.name,
    size: file.size,
    mime: file.type,
  });
}
