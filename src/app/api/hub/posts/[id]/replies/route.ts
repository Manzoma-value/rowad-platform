// src/app/api/hub/posts/[id]/replies/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { profileSchoolId } from "@/lib/hub-auth";
import { hubImageExtension, validateHubImage } from "@/lib/hub-image";

function adminSupabase() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const REPLY_SELECT = {
  id: true,
  content: true,
  image_url: true,
  created_at: true,
  reply_to_id: true,
  author: { select: { id: true, full_name: true, role: true, avatar_url: true } },
  reactions: { select: { id: true, type: true, author_id: true } },
  _count: { select: { replies: true } },
} as const;

// GET /api/hub/posts/[id]/replies
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId } = await context.params;

  // Tenant guard: only return replies if the caller is in the parent
  // post's school. One join takes care of both checks.
  const parent = await prisma.post.findUnique({
    where: { id: postId },
    select: { school_id: true },
  });
  if (!parent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const callerSchoolId = await profileSchoolId(user.id);
  if (callerSchoolId !== parent.school_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const replies = await prisma.post.findMany({
    where: { reply_to_id: postId },
    select: REPLY_SELECT,
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json({ replies });
}

// POST /api/hub/posts/[id]/replies
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId } = await context.params;

  // Get parent post for school_id
  const [profile, parentPost] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, role: true },
    }),
    prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, school_id: true },
    }),
  ]);

  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!parentPost) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  // Tenant guard: you cannot reply on another school's wall.
  const callerSchoolId = await profileSchoolId(profile.id);
  if (callerSchoolId !== parentPost.school_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let content: string | null = null;
  let image_url: string | null = null;
  let image_path: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    content = (form.get("content") as string | null)?.trim() || null;
    const file = form.get("file") as File | null;

    if (file) {
      const validationError = validateHubImage(file);
      if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
      const ext = hubImageExtension(file);
      const path = `hub/${parentPost.school_id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const admin = adminSupabase();
      const { error } = await admin.storage
        .from("hub-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const { data: { publicUrl } } = admin.storage.from("hub-images").getPublicUrl(path);
      image_url = publicUrl;
      image_path = path;
    }
  } else {
    const body = await req.json().catch(() => ({}));
    content = body.content?.trim() || null;
  }

  if (!content && !image_url)
    return NextResponse.json({ error: "content or image required" }, { status: 400 });

  const reply = await prisma.post.create({
    data: {
      school_id: parentPost.school_id,
      author_id: profile.id,
      content,
      image_url,
      image_path,
      reply_to_id: postId,
    },
    select: REPLY_SELECT,
  });

  return NextResponse.json({ reply }, { status: 201 });
}
