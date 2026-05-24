import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
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
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "المدرسة غير موجودة" }, { status: 404 });
    }

    // Use admin client to create auth user — bypasses email confirmation,
    // never silently returns null for existing emails.
    const adminSupabase = createAdminClient();
    const { data: adminData, error: adminError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: "STUDENT" },
    });

    if (adminError) {
      // Translate common Supabase errors to Arabic
      if (adminError.message.toLowerCase().includes("already been registered") ||
          adminError.message.toLowerCase().includes("already exists") ||
          adminError.code === "email_exists") {
        return NextResponse.json({ error: "هذا البريد الإلكتروني مسجل بالفعل" }, { status: 400 });
      }
      return NextResponse.json({ error: adminError.message }, { status: 400 });
    }

    if (!adminData.user) {
      return NextResponse.json({ error: "فشل إنشاء المستخدم" }, { status: 500 });
    }

    const userId = adminData.user.id;

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

    // Sign the user in via the server client so the session cookie is set
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      // User was created but sign-in failed — not critical, let client handle it
      return NextResponse.json({ success: true, needsLogin: true });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("School signup error:", message);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "حدث خطأ غير متوقع" },
      { status: 500 },
    );
  }
}
