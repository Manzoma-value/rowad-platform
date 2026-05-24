// api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";

const SignupSchema = z.object({
  full_name: z.string().trim().min(1, "الاسم الكامل مطلوب"),
  email:     z.string().trim().email("صيغة البريد الإلكتروني غير صحيحة"),
  password:  z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const result = SignupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { full_name, password } = result.data;
    const email = result.data.email.toLowerCase();

    // ── Pre-check for duplicate email ──────────────────────────────────────
    // Supabase's signUp() silently re-sends the confirmation email for existing
    // addresses (enumeration protection). We check our own profiles table first
    // so we can give the user a clear error message.
    const existing = await prisma.profile
      .findUnique({ where: { email }, select: { id: true } })
      .catch(() => null);

    if (existing) {
      return NextResponse.json(
        { error: "هذا البريد الإلكتروني مسجل بالفعل" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    // ── Create auth user ───────────────────────────────────────────────────
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, role: "STUDENT" },
        // Where Supabase redirects after the user clicks the confirmation link.
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "فشل إنشاء المستخدم" }, { status: 500 });
    }

    const userId = authData.user.id;

    // ── Create profile via Prisma (bypasses RLS) ───────────────────────────
    await prisma.profile.upsert({
      where:  { id: userId },
      update: { full_name, role: "STUDENT", email },
      create: { id: userId, full_name, role: "STUDENT", email },
    });

    // ── Create student row ─────────────────────────────────────────────────
    await prisma.student.upsert({
      where:  { profile_id: userId },
      update: {},
      create: { profile_id: userId, onboarding_status: "PENDING_INTAKE" },
    });

    // ── Email confirmation required? ───────────────────────────────────────
    // When Supabase email confirmation is enabled, authData.session is null
    // and the user must click the link in their inbox before they can log in.
    if (!authData.session) {
      return NextResponse.json({ success: true, emailConfirmationRequired: true });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
