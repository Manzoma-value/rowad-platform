import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) return NextResponse.json({ error: "invalid_token" }, { status: 400 });

  const [workshop, profile] = await Promise.all([
    prisma.workshop.findUnique({
      where: { signup_token: token },
      select: { id: true, school_id: true, status: true },
    }),
    prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        role: true,
        is_active: true,
        teacher: { select: { id: true, school_id: true, onboarding_status: true } },
      },
    }),
  ]);

  if (!workshop) return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  if (workshop.status === "CLOSED") {
    return NextResponse.json({ error: "workshop_closed" }, { status: 410 });
  }
  if (!profile?.is_active) {
    return NextResponse.json({ error: "account_inactive" }, { status: 403 });
  }
  if (profile.role !== "TEACHER" || !profile.teacher) {
    return NextResponse.json({ error: "not_teacher" }, { status: 403 });
  }
  if (profile.teacher.school_id !== workshop.school_id) {
    return NextResponse.json({ error: "school_mismatch" }, { status: 409 });
  }

  await prisma.teacher.update({
    where: { id: profile.teacher.id },
    data: { workshop_signup_id: workshop.id },
  });

  return NextResponse.json({
    success: true,
    onboarding_status: profile.teacher.onboarding_status,
  });
}
