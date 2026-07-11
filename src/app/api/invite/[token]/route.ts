// src/app/api/invite/[token]/route.ts
//
// Invite redemption — creates the auth user, the profile row, and the role
// record (teacher OR school-admin membership). Marks the invite as used.
//
// If the form ships an avatar file, we upload it to Supabase storage and
// link it on the profile. A failed avatar upload does NOT block account
// creation — the user just ends up without a picture.
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

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

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
  | {
      valid: true;
      invite: {
        id: string;
        school_id: string;
        type: string;
        school_name: string;
        school_name_alt: string | null;
        school_language: string;
      };
    };

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

// ── Helper: upload avatar (best-effort) ────────────────────────────────────
//
// Returns { url, path } on success, null on any failure. We never throw —
// avatar issues should never block account creation.
async function uploadAvatar(
  userId: string,
  avatar: File,
): Promise<{ url: string; path: string } | null> {
  try {
    if (!avatar.type.startsWith("image/")) return null;
    if (avatar.size > MAX_AVATAR_BYTES) return null;

    const ext = (avatar.name.split(".").pop() || "jpg").toLowerCase();
    const path = `profiles/${userId}/avatar-${Date.now()}.${ext}`;

    const { error: upErr } = await adminClient.storage
      .from("avatars")
      .upload(path, avatar, { contentType: avatar.type, upsert: true });
    if (upErr) {
      console.warn("[invite] avatar upload failed:", upErr.message);
      return null;
    }

    const { data } = adminClient.storage.from("avatars").getPublicUrl(path);
    if (!data?.publicUrl) return null;

    return { url: data.publicUrl, path };
  } catch (err) {
    console.warn("[invite] avatar upload threw:", err);
    return null;
  }
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

  // ── Parse body (JSON or multipart) ────────────────────────────────────
  let rawFullName: string | undefined;
  let rawEmail: string | undefined;
  let rawPassword: string | undefined;
  let avatarFile: File | null = null;

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      rawFullName = (form.get("full_name") as string | null) ?? undefined;
      rawEmail    = (form.get("email")     as string | null) ?? undefined;
      rawPassword = (form.get("password")  as string | null) ?? undefined;
      const a = form.get("avatar");
      if (a instanceof File && a.size > 0) avatarFile = a;
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
    const isAlreadyExists =
      authError?.message?.toLowerCase().includes("already registered") ||
      authError?.message?.toLowerCase().includes("already exists");
    const msg = isAlreadyExists
      ? "يوجد حساب مسجّل بهذا البريد الإلكتروني مسبقاً."
      : `فشل إنشاء الحساب: ${authError?.message ?? "خطأ غير معروف"}`;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const userId = authData.user.id;
  console.log("[invite] auth user created:", userId);

  // ── Best-effort avatar upload BEFORE the transaction ──────────────────
  // Doing this before the transaction means a slow upload doesn't hold
  // open a DB transaction. If it fails we fall back to no avatar.
  const avatar = avatarFile ? await uploadAvatar(userId, avatarFile) : null;

  // ── Create Profile + role-specific record + mark invite ─────────────
  const isAdminInvite   = state.invite.type === "ADMIN";
  const isTeacherInvite = state.invite.type === "TEACHER";

  try {
    await prisma.$transaction(async (tx) => {
      const role = isAdminInvite ? "SCHOOL_ADMIN" : "TEACHER";

      await tx.profile.create({
        data: {
          id:         userId,
          full_name:  full_name,
          email:      email,
          role,
          avatar_url:  avatar?.url ?? null,
          avatar_path: avatar?.path ?? null,
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
        // Add this profile as a school admin (upsert so re-inviting is safe)
        await tx.schoolAdminMember.upsert({
          where: { school_id_profile_id: { school_id: state.invite.school_id, profile_id: userId } },
          create: { school_id: state.invite.school_id, profile_id: userId },
          update: {},
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
    // Rollback: clean up auth user + avatar if we got that far.
    await adminClient.auth.admin.deleteUser(userId).catch(() => {});
    if (avatar?.path) {
      await adminClient.storage
        .from("avatars")
        .remove([avatar.path])
        .catch(() => {});
    }
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
