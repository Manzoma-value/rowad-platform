// api/owner/schools/[id]/route.ts
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

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;

  const school = await prisma.school.findUnique({
    where: { id },
    select: {
      id: true, name: true, slug: true, description: true,
      language: true, color_primary: true, color_secondary: true, color_bg: true,
      created_at: true,
      admin: { select: { id: true, full_name: true } },
      teachers: {
        select: {
          id: true,
          profile: { select: { full_name: true } },
          classes: { select: { id: true, name: true } },
        },
      },
      students: {
        select: {
          id: true,
          profile: { select: { full_name: true } },
          class: { select: { id: true, name: true } },
        },
      },
      classes: {
        select: {
          id: true, name: true,
          teacher: { select: { profile: { select: { full_name: true } } } },
          _count: { select: { students: true } },
        },
      },
    },
  });

  if (!school) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ school });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Resolve params and body in parallel
  const [{ id }, body] = await Promise.all([
    context.params,
    req.json(),
  ]);

  const updateData: Record<string, unknown> = {};
  if (body.language        !== undefined) updateData.language        = body.language;
  if (body.description     !== undefined) updateData.description     = body.description?.trim() || null;
  if (body.name            !== undefined) updateData.name            = body.name.trim();
  if (body.admin_id        !== undefined) updateData.admin_id        = body.admin_id || null;
  if (body.color_primary   !== undefined) updateData.color_primary   = body.color_primary;
  if (body.color_secondary !== undefined) updateData.color_secondary = body.color_secondary;
  if (body.color_bg        !== undefined) updateData.color_bg        = body.color_bg;

  if (body.slug !== undefined) {
    const newSlug = body.slug.trim();
    const existing = await prisma.school.findFirst({
      where: { slug: newSlug, NOT: { id } },
      select: { id: true },
    });
    if (existing)
      return NextResponse.json({ error: "هذا الرابط مستخدم بالفعل" }, { status: 400 });
    updateData.slug = newSlug;
  }

  const school = await prisma.school.update({
    where: { id },
    data: updateData,
    select: {
      id: true, name: true, slug: true, description: true,
      language: true, color_primary: true, color_secondary: true, color_bg: true,
      admin: { select: { id: true, full_name: true } },
    },
  });

  return NextResponse.json({ school });
}