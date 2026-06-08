// src/app/api/hub/posts/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

function adminSupabase() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// DELETE /api/hub/posts/[id]
// Students can delete their own posts. Teachers can delete any post in their school.
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const [profile, post] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, role: true },
    }),
    prisma.post.findUnique({
      where: { id },
      select: { id: true, author_id: true, school_id: true, image_path: true },
    }),
  ]);

  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Permission: own post OR teacher in the same school
  const isOwn = post.author_id === profile.id;
  const isTeacher = profile.role === "TEACHER" || profile.role === "SCHOOL_ADMIN";

  if (!isOwn && !isTeacher)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // If teacher, verify same school
  if (!isOwn && isTeacher) {
    const teacher = await prisma.teacher.findFirst({
      where: { profile_id: profile.id, school_id: post.school_id },
      select: { id: true },
    });
    const admin = await prisma.schoolAdminMember.findFirst({
      where: { school_id: post.school_id, profile_id: profile.id },
      select: { id: true },
    });
    if (!teacher && !admin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete image from storage if exists
  if (post.image_path) {
    await adminSupabase().storage.from("hub-images").remove([post.image_path]);
  }

  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ success: true });
}