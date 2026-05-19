// src/app/api/invite/[token]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// ── Shared: resolve invite state ───────────────────────────────────────────

type InviteState =
  | { valid: false; reason: "not_found" | "disabled" | "expired" | "used" }
  | { valid: true; invite: { id: string; school_id: string; type: string; school_name: string } };

async function resolveInvite(token: string): Promise<InviteState> {
  const invite = await prisma.invite.findUnique({
    where: { token },
    select: {
      id: true,
      type: true,
      is_active: true,
      use_count: true,
      max_uses: true,
      expires_at: true,
      school_id: true,
      school: { select: { name: true } },
    },
  });

  if (!invite) return { valid: false, reason: "not_found" };
  if (!invite.is_active) return { valid: false, reason: "disabled" };
  if (invite.expires_at && invite.expires_at < new Date()) return { valid: false, reason: "expired" };
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) return { valid: false, reason: "used" };

  return {
    valid: true,
    invite: {
      id: invite.id,
      school_id: invite.school_id,
      type: invite.type,
      school_name: invite.school.name,
    },
  };
}

// ── GET /api/invite/[token] ────────────────────────────────────────────────

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const state = await resolveInvite(token);

  if (!state.valid) {
    return NextResponse.json({ valid: false, reason: state.reason });
  }

  return NextResponse.json({
    valid: true,
    type: state.invite.type,
    school_name: state.invite.school_name,
  });
}

// ── POST /api/invite/[token] ───────────────────────────────────────────────

export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  const state = await resolveInvite(token);
  if (!state.valid) {
    const messages: Record<string, string> = {
      not_found: "رابط الدعوة غير صالح.",
      disabled:  "تم تعطيل هذه الدعوة.",
      expired:   "انتهت صلاحية الدعوة. تواصل مع مدير المدرسة.",
      used:      "تم استخدام هذه الدعوة مسبقاً.",
    };
    return NextResponse.json({ error: messages[state.reason] }, { status: 410 });
  }

  // ── Parse body — handle both JSON and multipart/form-data ─────────────
  let full_name: string | undefined;
  let email: string | undefined;
  let password: string | undefined;

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      full_name = (form.get("full_name") as string | null)?.trim();
      email     = (form.get("email")     as string | null)?.trim().toLowerCase();
      password  = (form.get("password")  as string | null) ?? undefined;
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }
  } else {
    try {
      const body = await req.json();
      full_name = (body.full_name as string | undefined)?.trim();
      email     = (body.email    as string | undefined)?.trim().toLowerCase();
      password  = body.password  as string | undefined;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
  }

  // ── Validate ──────────────────────────────────────────────────────────
  if (!full_name || !email || !password) {
    return NextResponse.json(
      { error: "الاسم الكامل والبريد الإلكتروني وكلمة المرور مطلوبة" },
      { status: 400 }
    );
  }
  if (full_name.length < 3) {
    return NextResponse.json({ error: "الاسم يجب أن يكون 3 أحرف على الأقل" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "بريد إلكتروني غير صالح" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
  }

  // ── Create Supabase auth user ─────────────────────────────────────────
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    const msg = authError?.message?.toLowerCase().includes("already registered")
      ? "يوجد حساب مسجّل بهذا البريد الإلكتروني مسبقاً."
      : `فشل إنشاء الحساب: ${authError?.message ?? "خطأ غير معروف"}`;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const userId = authData.user.id;

  // ── Create Profile + Teacher + mark invite — single transaction ───────
  try {
    await prisma.$transaction(async (tx) => {
      // Only pass fields that exist on your Profile model
      await tx.profile.create({
        data: {
          id:        userId,
          full_name: full_name!,
          role:      "TEACHER",
        },
      });

      await tx.teacher.create({
        data: {
          profile_id: userId,
          school_id:  state.invite.school_id,
        },
      });

      await tx.invite.update({
        where: { id: state.invite.id },
        data: {
          use_count: { increment: 1 },
          is_active: false,
          used_at:   new Date(),
          used_by:   userId,
        },
      });
    });
  } catch (err) {
    // Clean up orphan auth user
    await supabase.auth.admin.deleteUser(userId);
    console.error("[invite] transaction failed:", err);
    // Return the actual error in dev so you can see what's wrong
    const message = err instanceof Error ? err.message : "خطأ غير معروف";
    return NextResponse.json(
      { error: `فشل إنشاء الحساب: ${message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}