// POST /api/workshop-signup
//   Body: { token, email, password, full_name }
// Public endpoint used by the workshop signup page. Creates:
//   1. auth.users (auto-confirmed via service role — no email confirmation)
//   2. public.profiles (TEACHER, is_active=true)
//   3. public.teachers (PENDING_APPLICATION, workshop_signup_id=<workshop>)
// The teacher then logs in and completes their application form.
import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { isWorkshopWorkDay, workshopDateKey, workshopDayDate } from "@/lib/workshops";

export const dynamic = "force-dynamic";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(req: Request) {
  let body: { token?: string; email?: string; password?: string; full_name?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const token = body.token?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const full_name = body.full_name?.trim();

  if (!token || !email || !password || !full_name) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const workshop = await prisma.workshop.findUnique({
    where: { signup_token: token },
    select: {
      id: true,
      school_id: true,
      status: true,
      schedule: true,
      start_date: true,
      end_date: true,
    },
  });
  if (!workshop) return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  if (workshop.status === "CLOSED") {
    return NextResponse.json({ error: "workshop_closed" }, { status: 410 });
  }

  const admin = adminSupabase();

  // Create the auth user with email_confirm=true so nobody has to check
  // their inbox. This is the whole point of the workshop QR flow.
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, source: "workshop", workshop_id: workshop.id },
  });
  if (created.error || !created.data.user) {
    // 422 from Supabase if the email already exists — surface a friendly hint.
    const msg = created.error?.message ?? "signup_failed";
    if (/already registered|exists/i.test(msg)) {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const uid = created.data.user.id;
  const dayKey = workshopDateKey(new Date(), process.env.WORKSHOP_TIME_ZONE ?? "Europe/Tirane");
  const countsAsAttendance = isWorkshopWorkDay(
    workshop.schedule,
    dayKey,
    workshop.start_date,
    workshop.end_date,
  );

  try {
    await prisma.$transaction(async (tx) => {
      await tx.profile.upsert({
        where: { id: uid },
        create: {
          id: uid,
          email,
          full_name: full_name.slice(0, 200),
          role: "TEACHER",
          is_active: true,
        },
        update: {
          email,
          full_name: full_name.slice(0, 200),
          role: "TEACHER",
          is_active: true,
        },
      });
      const teacher = await tx.teacher.upsert({
        where: { profile_id: uid },
        create: {
          profile_id: uid,
          school_id: workshop.school_id,
          onboarding_status: "PENDING_APPLICATION",
          workshop_signup_id: workshop.id,
        },
        update: {
          school_id: workshop.school_id,
          onboarding_status: "PENDING_APPLICATION",
          workshop_signup_id: workshop.id,
        },
        // Do not select optional draft columns here. During a rolling schema
        // deployment they may not exist yet, while QR registration must stay
        // available for every teacher.
        select: { id: true },
      });
      await tx.workshopEnrollment.upsert({
        where: { workshop_id_teacher_id: { workshop_id: workshop.id, teacher_id: teacher.id } },
        create: { workshop_id: workshop.id, teacher_id: teacher.id, source: "QR" },
        update: {},
      });
      if (countsAsAttendance) {
        const dayDate = workshopDayDate(dayKey);
        await tx.workshopAttendance.upsert({
          where: {
            workshop_id_teacher_id_day_date: {
              workshop_id: workshop.id,
              teacher_id: teacher.id,
              day_date: dayDate,
            },
          },
          create: {
            workshop_id: workshop.id,
            teacher_id: teacher.id,
            day_date: dayDate,
            source: "QR",
          },
          update: {},
        });
      }
    });
  } catch (err) {
    // Roll back the auth user if the DB write failed so retry works cleanly.
    console.error("[workshop-signup] db transaction failed:", err);
    await admin.auth.admin.deleteUser(uid).catch(() => {});
    return NextResponse.json({ error: "signup_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, attendance_recorded: countsAsAttendance });
}
