// src/app/api/hub/posts/route.ts
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

const POST_SELECT = {
  id: true,
  content: true,
  image_url: true,
  created_at: true,
  reply_to_id: true,
  author: { select: { id: true, full_name: true, role: true } },
  reactions: { select: { id: true, type: true, author_id: true } },
  _count: { select: { replies: true } },
} as const;

// GET /api/hub/posts?school_id=xxx&cursor=xxx&limit=50
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const school_id = searchParams.get("school_id");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  if (!school_id)
    return NextResponse.json({ error: "school_id required" }, { status: 400 });

  const posts = await prisma.post.findMany({
    where: {
      school_id,
      reply_to_id: null, // top-level posts only
    },
    select: POST_SELECT,
    orderBy: { created_at: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ posts: items, nextCursor });
}

// POST /api/hub/posts  (multipart/form-data or JSON)
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  let content: string | null = null;
  let school_id: string | null = null;
  let image_url: string | null = null;
  let image_path: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    content = (form.get("content") as string | null)?.trim() || null;
    school_id = form.get("school_id") as string | null;
    const file = form.get("file") as File | null;

    if (file) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `hub/${school_id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
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
    school_id = body.school_id;
  }

  if (!school_id)
    return NextResponse.json({ error: "school_id required" }, { status: 400 });
  if (!content && !image_url)
    return NextResponse.json({ error: "content or image required" }, { status: 400 });

  const post = await prisma.post.create({
    data: {
      school_id,
      author_id: profile.id,
      content,
      image_url,
      image_path,
    },
    select: POST_SELECT,
  });

  return NextResponse.json({ post }, { status: 201 });
}