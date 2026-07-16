import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { requireSchoolAdminWriter } from "@/lib/school-admin-auth";
import { prisma } from "@/lib/prisma";
import type { WorkshopMaterial } from "@/lib/workshops";

export const dynamic = "force-dynamic";
const BUCKET = "workshop-materials";
const MAX_FILE = 40 * 1024 * 1024;

function adminSupabase() {
  return createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function workshopForAdmin(id: string, schoolId: string) {
  return prisma.workshop.findFirst({ where: { id, school_id: schoolId }, select: { id: true, materials: true, updated_at: true } });
}

async function appendMaterial(id: string, initial: Awaited<ReturnType<typeof workshopForAdmin>>, material: WorkshopMaterial) {
  let current = initial;
  for (let attempt = 0; attempt < 4 && current; attempt += 1) {
    const materials = Array.isArray(current.materials) ? current.materials as unknown as WorkshopMaterial[] : [];
    const next = [...materials, material];
    const updated = await prisma.workshop.updateMany({
      where: { id, updated_at: current.updated_at },
      data: { materials: next as unknown as Prisma.InputJsonValue },
    });
    if (updated.count === 1) return next;
    current = await prisma.workshop.findUnique({ where: { id }, select: { id: true, materials: true, updated_at: true } });
  }
  throw new Error("material_update_conflict");
}

async function removeMaterial(id: string, initial: Awaited<ReturnType<typeof workshopForAdmin>>, materialId: string) {
  let current = initial;
  for (let attempt = 0; attempt < 4 && current; attempt += 1) {
    const materials = Array.isArray(current.materials) ? current.materials as unknown as WorkshopMaterial[] : [];
    const removed = materials.find((item) => item.id === materialId);
    const next = materials.filter((item) => item.id !== materialId);
    const updated = await prisma.workshop.updateMany({
      where: { id, updated_at: current.updated_at },
      data: { materials: next as unknown as Prisma.InputJsonValue },
    });
    if (updated.count === 1) return { next, removed };
    current = await prisma.workshop.findUnique({ where: { id }, select: { id: true, materials: true, updated_at: true } });
  }
  throw new Error("material_update_conflict");
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const workshop = await workshopForAdmin(id, auth.school.id);
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let material: WorkshopMaterial;
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file || file.size > MAX_FILE) return NextResponse.json({ error: file ? "file too large" : "file required" }, { status: file ? 413 : 400 });
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const path = `workshops/${id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const admin = adminSupabase();
    const { error } = await admin.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      console.error("[workshop-materials upload]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
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

  try {
    const next = await appendMaterial(id, workshop, material);
    return NextResponse.json({ material, materials: next }, { status: 201 });
  } catch (error) {
    if (material.path) await adminSupabase().storage.from(BUCKET).remove([material.path]).catch(() => null);
    console.error("[workshop-materials update]", error);
    return NextResponse.json({ error: "material update conflict" }, { status: 409 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolAdminWriter();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const workshop = await workshopForAdmin(id, auth.school.id);
  if (!workshop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const materialId = new URL(req.url).searchParams.get("materialId");
  if (!materialId) return NextResponse.json({ error: "materialId required" }, { status: 400 });
  try {
    const { next, removed } = await removeMaterial(id, workshop, materialId);
    if (removed?.path) await adminSupabase().storage.from(BUCKET).remove([removed.path]).catch(() => null);
    return NextResponse.json({ materials: next });
  } catch (error) {
    console.error("[workshop-materials delete]", error);
    return NextResponse.json({ error: "material update conflict" }, { status: 409 });
  }
}
