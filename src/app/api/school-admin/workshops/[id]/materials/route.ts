import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import type { WorkshopMaterial } from "@/lib/workshops";

export const dynamic = "force-dynamic";
const BUCKET = "owner-reports";
const MAX_FILE = 40 * 1024 * 1024;

function adminSupabase() {
  return createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function workshopForAdmin(id: string, schoolId: string) {
  return prisma.workshop.findFirst({ where: { id, school_id: schoolId }, select: { id: true, materials: true } });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const workshop = await workshopForAdmin(id, auth.school.id);
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const materials = Array.isArray(workshop.materials) ? workshop.materials as unknown as WorkshopMaterial[] : [];
  let material: WorkshopMaterial;
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file || file.size > MAX_FILE) return NextResponse.json({ error: file ? "file too large" : "file required" }, { status: file ? 413 : 400 });
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const path = `workshops/${id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const admin = adminSupabase();
    const { error } = await admin.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path);
    material = {
      id: crypto.randomUUID(),
      type: file.type.startsWith("image/") ? "IMAGE" : "FILE",
      title: String(form.get("title") || file.name).trim().slice(0, 160),
      url: publicUrl, path, mime: file.type, size: file.size,
    };
  } else {
    const body = await req.json().catch(() => null) as { title?: string; url?: string; type?: string } | null;
    const title = body?.title?.trim();
    let url: URL;
    try { url = new URL(body?.url ?? ""); } catch { return NextResponse.json({ error: "valid URL required" }, { status: 400 }); }
    if (!title || !["http:", "https:"].includes(url.protocol)) return NextResponse.json({ error: "title and URL required" }, { status: 400 });
    material = { id: crypto.randomUUID(), type: body?.type === "VIDEO" ? "VIDEO" : "LINK", title: title.slice(0, 160), url: url.toString() };
  }

  const next = [...materials, material];
  await prisma.workshop.update({ where: { id }, data: { materials: next as unknown as Prisma.InputJsonValue } });
  return NextResponse.json({ material, materials: next }, { status: 201 });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const workshop = await workshopForAdmin(id, auth.school.id);
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const materialId = new URL(req.url).searchParams.get("materialId");
  const materials = Array.isArray(workshop.materials) ? workshop.materials as unknown as WorkshopMaterial[] : [];
  const removed = materials.find((item) => item.id === materialId);
  const next = materials.filter((item) => item.id !== materialId);
  if (removed?.path) await adminSupabase().storage.from(BUCKET).remove([removed.path]).catch(() => null);
  await prisma.workshop.update({ where: { id }, data: { materials: next as unknown as Prisma.InputJsonValue } });
  return NextResponse.json({ materials: next });
}
