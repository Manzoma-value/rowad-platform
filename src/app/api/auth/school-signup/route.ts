import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { requestOrigin } from "@/lib/request-origin";
import { resolveLandingFlow } from "@/lib/landing-flow";
import { z } from "zod";

const SchoolSignupSchema = z.object({
  school_slug: z.string().trim().min(1, "رمز المدرسة مطلوب"),
  full_name:   z.string().trim().min(1, "الاسم الكامل مطلوب"),
  email:       z.string().trim().email("صيغة البريد الإلكتروني غير صحيحة"),
  password:    z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  city:        z.string().trim().min(1, "المدينة مطلوبة"),
  age:         z.coerce.number({ error: "العمر يجب أن يكون رقمًا" })
                 .int("العمر يجب أن يكون رقمًا صحيحًا")
                 .min(5, "العمر غير صالح")
                 .max(120, "العمر غير صالح"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const result = SchoolSignupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { school_slug, full_name, password, city, age } = result.data;
    const email = result.data.email.toLowerCase();

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: { slug: school_slug },
      select: { id: true, features: true },
    });

    if (!school) {
      return NextResponse.json({ error: "المدرسة غير موجودة" }, { status: 404 });
    }

    if (resolveLandingFlow(school.features) === "teacher") {
      return NextResponse.json(
        { error: "التسجيل العام للطلاب مغلق حالياً", code: "student_signup_closed" },
        { status: 403 },
      );
    }

    // signUp() is the only flow that triggers Supabase's confirmation email.
    // admin.createUser() creates the account server-side but never sends the email.
    const supabase = await createClient();
    // Use the subdomain the user is actually on so the confirmation email
    // returns them to the same school subdomain (where their cookie belongs).
    const siteUrl = requestOrigin(req);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, role: "STUDENT" },
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (authError) {
      if (
        authError.message.toLowerCase().includes("already registered") ||
        authError.message.toLowerCase().includes("already exists")
      ) {
        return NextResponse.json({ error: "هذا البريد الإلكتروني مسجل بالفعل" }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // When "Confirm email" is ON, Supabase returns success for existing emails too
    // (to avoid user enumeration). Detect duplicates via empty identities array.
    if (!authData.user || authData.user.identities?.length === 0) {
      return NextResponse.json({ error: "هذا البريد الإلكتروني مسجل بالفعل" }, { status: 400 });
    }

    const userId = authData.user.id;

    // Create Profile + Student via Prisma (server-side, bypasses RLS)
    await prisma.profile.upsert({
      where: { id: userId },
      update: { full_name, role: "STUDENT" },
      create: { id: userId, full_name, role: "STUDENT" },
    });

    await prisma.student.upsert({
      where: { profile_id: userId },
      update: {},
      create: {
        profile_id: userId,
        school_id: school.id,
        city,
        age,
        onboarding_status: "SCHOOL_ASSIGNED",
      },
    });

    // User must click the confirmation link before they can log in.
    return NextResponse.json({ success: true, emailConfirmationRequired: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("School signup error:", message);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "حدث خطأ غير متوقع" },
      { status: 500 },
    );
  }
}
