import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { requestOrigin } from "@/lib/request-origin";
import { resolveLandingFlow } from "@/lib/landing-flow";
import { z } from "zod";

const SchoolSignupSchema = z.object({
  school_slug: z.string().trim().min(1, "رمز المدرسة مطلوب"),
  full_name:   z.string().trim().min(1, "الاسم الكامل مطلوب"),
  email:       z.string().trim().email("صيغة البريد الإلكتروني غير صحيحة"),
  password:    z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  city:        z.string().trim().optional(),
  age:         z.coerce.number({ error: "العمر يجب أن يكون رقمًا" })
                 .int("العمر يجب أن يكون رقمًا صحيحًا")
                 .min(5, "العمر غير صالح")
                 .max(120, "العمر غير صالح")
                 .optional(),
});

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

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

    const landingFlow = resolveLandingFlow(school.features);
    const role = landingFlow === "teacher" ? "TEACHER" : "STUDENT";

    if (role === "STUDENT" && (!city || age === undefined)) {
      return NextResponse.json({ error: "المدينة والعمر مطلوبان" }, { status: 400 });
    }

    let userId: string;
    let createdByAdmin = false;

    if (role === "TEACHER") {
      // Teacher rollout days can produce dozens of signups at once. Creating
      // confirmed accounts avoids SMTP confirmation throttles and lets each
      // teacher continue directly to the application form.
      const created = await adminSupabase().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role, source: "teacher_landing" },
      });
      if (created.error || !created.data.user) {
        const message = created.error?.message ?? "signup_failed";
        if (/already registered|already exists|exists/i.test(message)) {
          return NextResponse.json({ error: "هذا البريد الإلكتروني مسجل بالفعل" }, { status: 409 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
      }
      userId = created.data.user.id;
      createdByAdmin = true;
    } else {
      // Student mode keeps email confirmation enabled.
      const supabase = await createClient();
      const siteUrl = requestOrigin(req);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name, role },
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      });

      if (authError) {
        if (
          authError.message.toLowerCase().includes("already registered") ||
          authError.message.toLowerCase().includes("already exists")
        ) {
          return NextResponse.json({ error: "هذا البريد الإلكتروني مسجل بالفعل" }, { status: 409 });
        }
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      // Supabase can return success with no identities for an existing email.
      if (!authData.user || authData.user.identities?.length === 0) {
        return NextResponse.json({ error: "هذا البريد الإلكتروني مسجل بالفعل" }, { status: 409 });
      }
      userId = authData.user.id;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.profile.upsert({
          where: { id: userId },
          update: { email, full_name, role, is_active: true },
          create: { id: userId, email, full_name, role, is_active: true },
        });

        if (role === "TEACHER") {
          await tx.teacher.upsert({
            where: { profile_id: userId },
            update: { school_id: school.id },
            create: {
              profile_id: userId,
              school_id: school.id,
              onboarding_status: "PENDING_APPLICATION",
            },
          });
        } else {
          await tx.student.upsert({
            where: { profile_id: userId },
            update: {},
            create: {
              profile_id: userId,
              school_id: school.id,
              city: city!,
              age: age!,
              onboarding_status: "SCHOOL_ASSIGNED",
            },
          });
        }
      });
    } catch (error) {
      if (createdByAdmin) await adminSupabase().auth.admin.deleteUser(userId).catch(() => null);
      throw error;
    }

    return NextResponse.json({ success: true, emailConfirmationRequired: role === "STUDENT", role });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("School signup error:", message);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "حدث خطأ غير متوقع" },
      { status: 500 },
    );
  }
}
