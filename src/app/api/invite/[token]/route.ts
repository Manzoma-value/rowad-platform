// src/app/api/invite/[token]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { requestOrigin } from "@/lib/request-origin";
import { z } from "zod";

const InviteBodySchema = z.object({
  full_name: z.string().trim().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل"),
  email:     z.string().trim().email("بريد إلكتروني غير صالح"),
  password:  z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
});

// ── Admin client using service role key ────────────────────────────────────
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ── Shared: resolve invite state ───────────────────────────────────────────

type InviteState =
  | { valid: false; reason: "not_found" | "disabled" | "expired" | "used" }
  | { valid: true; invite: { id: string; school_id: string; type: string; school_name: string; school_name_alt: string | null; school_language: string } };

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
      school: { select: { name: true, name_alt: true, language: true } },
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
      school_name_alt: invite.school.name_alt ?? null,
      school_language: invite.school.language,
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
    school_name_alt: state.invite.school_name_alt,
    language: state.invite.school_language,
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

  // ── Parse body ────────────────────────────────────────────────────────
  let rawFullName: string | undefined;
  let rawEmail: string | undefined;
  let rawPassword: string | undefined;

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      rawFullName = (form.get("full_name") as string | null) ?? undefined;
      rawEmail    = (form.get("email")     as string | null) ?? undefined;
      rawPassword = (form.get("password")  as string | null) ?? undefined;
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }
  } else {
    try {
      const body = await req.json();
      rawFullName = body.full_name as string | undefined;
      rawEmail    = body.email     as string | undefined;
      rawPassword = body.password  as string | undefined;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
  }

  // ── Validate ──────────────────────────────────────────────────────────
  const validation = InviteBodySchema.safeParse({
    full_name: rawFullName ?? "",
    email:     rawEmail    ?? "",
    password:  rawPassword ?? "",
  });
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
  }

  const { full_name, password } = validation.data;
  const email = validation.data.email.toLowerCase();

  // ── Create auth user (sends confirmation email) ───────────────────────
  console.log("[invite] creating auth user for:", email);
  const siteUrl = requestOrigin(req);
  const { data: authData, error: authError } = await adminClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (authError || !authData?.user) {
    console.error("[invite] auth.signUp failed:", authError);
    const isAlreadyExists = authError?.message?.toLowerCase().includes("already registered")
      || authError?.message?.toLowerCase().includes("already exists");
    const msg = isAlreadyExists
      ? "يوجد حساب مسجّل بهذا البريد الإلكتروني مسبقاً."
      : `فشل إنشاء الحساب: ${authError?.message ?? "خطأ غير معروف"}`;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const userId = authData.user.id;
  console.log("[invite] auth user created:", userId);

  // ── Create Profile + role-specific record + mark invite ─────────────
  const isAdminInvite   = state.invite.type === "ADMIN";
  const isTeacherInvite = state.invite.type === "TEACHER";

  try {
    await prisma.$transaction(async (tx) => {
      const role = isAdminInvite ? "SCHOOL_ADMIN" : "TEACHER";

      await tx.profile.create({
        data: {
          id:        userId,
          full_name: full_name,
          email:     email,
          role,
        },
      });

      if (isTeacherInvite) {
        await tx.teacher.create({
          data: {
            profile_id: userId,
            school_id:  state.invite.school_id,
          },
        });
      }

      if (isAdminInvite) {
        // Assign this profile as the school admin
        await tx.school.update({
          where: { id: state.invite.school_id },
          data:  { admin_id: userId },
        });
      }

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

    console.log("[invite] transaction complete for user:", userId);
  } catch (err) {
    await adminClient.auth.admin.deleteUser(userId);
    console.error("[invite] transaction failed:", err);
    const message = err instanceof Error ? err.message : "خطأ غير معروف";
    return NextResponse.json(
      { error: `فشل إنشاء الحساب: ${message}` },
      { status: 500 }
    );
  }

  const emailConfirmationRequired = !authData.session;
  return NextResponse.json({ success: true, emailConfirmationRequired }, { status: 201 });
}