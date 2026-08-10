// GET /api/owner/google-drive/callback
// Owner-only. Exchanges Google's authorization code for tokens and shows the
// new refresh_token exactly once — we have no Vercel API access to write it
// into the deployment's environment variables ourselves, so the owner must
// copy it into GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN and redeploy. Nothing here is
// persisted or logged.
import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { requireOwner } from "@/lib/owner-auth";
import { requestOrigin } from "@/lib/request-origin";
import { verifyGoogleDriveOAuthState } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

function page(title: string, tone: "ok" | "err", body: string) {
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ربط Google Drive</title>
<style>
  body{font-family:'Cairo','Tajawal',sans-serif;background:#EFEAE0;color:#32101A;margin:0;padding:40px 16px;display:flex;justify-content:center}
  .card{max-width:640px;width:100%;background:#FFFBF5;border:1px solid rgba(184,155,94,.32);border-radius:16px;padding:28px 26px;box-shadow:0 12px 30px rgba(50,16,26,.08)}
  h1{font-size:19px;margin:0 0 14px;color:${tone === "ok" ? "#1B5E20" : "#6B1E2D"}}
  p{line-height:1.9;font-size:14px;margin:0 0 12px}
  code{display:block;background:#EFEAE0;border:1px solid rgba(184,155,94,.32);border-radius:10px;padding:14px;font-size:12.5px;direction:ltr;text-align:left;overflow-wrap:anywhere;user-select:all;margin-bottom:12px}
  a{color:#6B1E2D}
</style></head><body><div class="card"><h1>${title}</h1>${body}</div></body></html>`;
  return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: Request) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return page("تعذّر الربط", "err", `<p>رفض Google الطلب: <code>${oauthError}</code></p>`);
  }

  const verified = stateParam ? verifyGoogleDriveOAuthState(stateParam) : null;
  if (!verified || verified.ownerId !== owner.id || !code) {
    return page("جلسة غير صالحة", "err", `<p>انتهت صلاحية رابط الربط أو أنه غير صالح. عد إلى صفحة الربط وحاول من جديد.</p>`);
  }

  const clientId = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return page("الإعداد غير مكتمل", "err", `<p>لم يتم ضبط <code>GOOGLE_DRIVE_OAUTH_CLIENT_ID</code> أو <code>GOOGLE_DRIVE_OAUTH_CLIENT_SECRET</code> على الخادم.</p>`);
  }

  const redirectUri = `${requestOrigin(req)}/api/owner/google-drive/callback`;
  const client = new OAuth2Client(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      return page("لم يُرسل Google رمز تحديث", "err", `
        <p>هذا يحدث عادةً إذا كان هذا الحساب قد وافق على الوصول من قبل ولم يُجبَر Google على إعادة إصداره.</p>
        <p>اذهب إلى <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">صفحة أذونات حساب Google</a>، ألغِ وصول التطبيق، ثم أعد المحاولة من صفحة الربط في المنصة.</p>
      `);
    }
    return page("تم الربط بنجاح ✓", "ok", `
      <p>انسخ القيمة التالية والصقها في متغير البيئة التالي على Vercel، ثم أعد نشر المشروع (Redeploy) — بدون إعادة النشر لن يُطبَّق الرمز الجديد:</p>
      <p><code style="padding:6px 10px;display:inline-block">GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN</code></p>
      <code>${tokens.refresh_token}</code>
      <p><strong>لن يُعرض هذا الرمز مرة أخرى — احفظه الآن قبل إغلاق هذه الصفحة.</strong></p>
    `);
  } catch (error) {
    console.error("[google-drive oauth callback]", error);
    return page("فشل تبادل الرمز", "err", `<p>تعذّر الحصول على رمز الوصول من Google. تحقّق من صحة Client ID و Client Secret ثم حاول مرة أخرى.</p>`);
  }
}
