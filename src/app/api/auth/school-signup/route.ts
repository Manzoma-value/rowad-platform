import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(req: Request) {
  try {
    const { school_slug, full_name, email, password, city, age, avatar_url, avatar_path } =
      await req.json();

    if (!school_slug || !full_name || !email || !password || !city || !age) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
        { status: 400 },
      );
    }

    const school = await prisma.school.findUnique({
      where: { slug: school_slug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "المدرسة غير موجودة" }, { status: 404 });
    }

    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name, role: "STUDENT" } },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "فشل إنشاء المستخدم" }, { status: 500 });
    }

    const userId = authData.user.id;

    await prisma.profile.upsert({
      where: { id: userId },
      update: { full_name, role: "STUDENT", avatar_url: avatar_url ?? null, avatar_path: avatar_path ?? null },
      create: { id: userId, full_name, role: "STUDENT", avatar_url: avatar_url ?? null, avatar_path: avatar_path ?? null },
    });

    await prisma.student.upsert({
      where: { profile_id: userId },
      update: {},
      create: {
        profile_id: userId,
        school_id: school.id,
        city,
        age: Number(age),
        onboarding_status: "SCHOOL_PLACEMENT_SUBMITTED",
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("School signup error:", err);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
