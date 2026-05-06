import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

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

function generateSlug(name: string): string {
  return (
    name.trim().toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u0600-\u06FF-]/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "")
    || `school-${Date.now()}`
  );
}

export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const schools = await prisma.school.findMany({
    select: {
      id: true, name: true, slug: true, description: true,
      created_at: true, language: true,
      color_primary: true, color_secondary: true, color_bg: true,
      admin: { select: { id: true, full_name: true } },
      _count: { select: { teachers: true, students: true, classes: true } },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({ schools });
}

export async function POST(req: Request) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, admin_id, language = "ar", description, slug: customSlug } = body;

  if (!name?.trim())
    return NextResponse.json({ error: "اسم المدرسة مطلوب" }, { status: 400 });

  let slug = customSlug?.trim() || generateSlug(name);
  const existing = await prisma.school.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing) slug = `${slug}-${Date.now()}`;

  const school = await prisma.school.create({
    data: {
      name: name.trim(), slug,
      description: description?.trim() || null,
      language,
      color_primary: body.color_primary || "#C8A96A",
      color_secondary: body.color_secondary || "#E5B93C",
      color_bg: body.color_bg || "#0B0B0C",
      ...(admin_id ? { admin_id } : {}),
    },
    select: {
      id: true, name: true, slug: true, description: true,
      created_at: true, language: true,
      color_primary: true, color_secondary: true, color_bg: true,
      admin: { select: { id: true, full_name: true } },
      _count: { select: { teachers: true, students: true, classes: true } },
    },
  });

  return NextResponse.json({ school }, { status: 201 });
}