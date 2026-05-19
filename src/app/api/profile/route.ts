import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, avatar_url, avatar_path, created_at")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ profile, email: user.email });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { avatar_url, avatar_path } = await req.json();

  if (!avatar_url || !avatar_path) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Ensure the path belongs to this user — no one can overwrite another user's avatar
  if (!avatar_path.startsWith(`profiles/${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabase
    .from("profiles")
    .update({ avatar_url, avatar_path })
    .eq("id", user.id);

  return NextResponse.json({ success: true });
}
export async function DELETE() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .single();

  if (profile?.avatar_path) {
    await supabase.storage.from("avatars").remove([profile.avatar_path]);
  }

  await supabase
    .from("profiles")
    .update({ avatar_url: null, avatar_path: null })
    .eq("id", user.id);

  return NextResponse.json({ success: true });
}