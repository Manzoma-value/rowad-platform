// src/app/api/hub/posts/[id]/reactions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type ReactionType = "LIKE" | "LOVE" | "DISLIKE" | "HAHA" | "SAD";
const VALID: ReactionType[] = ["LIKE", "LOVE", "DISLIKE", "HAHA", "SAD"];

// POST /api/hub/posts/[id]/reactions
// body: { type: "LIKE" | "LOVE" | "DISLIKE" | "HAHA" | "SAD" }
// - If no reaction exists → create it
// - If same reaction exists → remove it (toggle off)
// - If different reaction exists → update it
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ id: postId }, body] = await Promise.all([
    context.params,
    req.json().catch(() => ({})),
  ]);

  const { type } = body as { type: ReactionType };
  if (!VALID.includes(type))
    return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });

  const existing = await prisma.postReaction.findUnique({
    where: { post_id_author_id: { post_id: postId, author_id: user.id } },
    select: { id: true, type: true },
  });

  if (!existing) {
    // Create new reaction
    const reaction = await prisma.postReaction.create({
      data: { post_id: postId, author_id: user.id, type },
      select: { id: true, type: true, author_id: true },
    });
    return NextResponse.json({ reaction, action: "added" });
  }

  if (existing.type === type) {
    // Toggle off — remove reaction
    await prisma.postReaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ action: "removed" });
  }

  // Update to new type
  const reaction = await prisma.postReaction.update({
    where: { id: existing.id },
    data: { type },
    select: { id: true, type: true, author_id: true },
  });
  return NextResponse.json({ reaction, action: "updated" });
}