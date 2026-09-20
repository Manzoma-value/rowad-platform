import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const url = new URL("/login", request.url);
  url.searchParams.set("error", request.nextUrl.searchParams.get("error") || "not_authorized");
  return NextResponse.redirect(url);
}
