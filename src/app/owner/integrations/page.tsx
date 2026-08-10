"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Plug, RefreshCw, XCircle } from "lucide-react";

type Status = { connected: boolean; reason?: string } | null;

const REASON_LABEL: Record<string, string> = {
  drive_upload_not_configured: "بيانات اعتماد Google OAuth غير مضبوطة على الخادم (Client ID / Secret / Refresh Token).",
  drive_upload_auth_failed: "رمز التحديث (Refresh Token) منتهي الصلاحية أو تم إلغاؤه من طرف Google.",
  drive_upload_folder_not_configured: "لم يتم تحديد مجلد الرفع (GOOGLE_DRIVE_UPLOAD_FOLDER_ID).",
  folder_not_configured: "لم يتم تحديد مجلد الرفع (GOOGLE_DRIVE_UPLOAD_FOLDER_ID).",
};

export default function OwnerIntegrationsPage() {
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/owner/google-drive/status", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setStatus(await response.json());
    } catch {
      setError(true);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="oi-page" dir="rtl">
      <header className="oi-hero">
        <span className="oi-eyebrow"><Plug size={13} />التكاملات</span>
        <h1>الربط والتكاملات</h1>
        <p>الخدمات الخارجية التي تعتمد عليها المنصة. من هنا يمكنك التحقق من حالة كل ربط وإعادة الاتصال عند الحاجة.</p>
      </header>

      <section className="oi-card">
        <div className="oi-card-head">
          <div>
            <h2>رفع فيديوهات الورش — Google Drive</h2>
            <p>يُستخدم هذا الربط عندما يرفع مشرف مدرسة فيديو مباشرة من جهازه في صفحة ورشة تدريبية. حساب الخدمة المنفصل (المستخدم لقراءة روابط الفيديو المُلصقة يدوياً) غير متأثر بهذا الربط.</p>
          </div>
          <button className="oi-refresh" onClick={() => void load()} disabled={loading} aria-label="تحديث الحالة">
            <RefreshCw size={15} className={loading ? "spin" : ""} />
          </button>
        </div>

        {loading ? (
          <div className="oi-status oi-status-loading">جارٍ التحقق من الحالة...</div>
        ) : error ? (
          <div className="oi-status oi-status-bad"><XCircle size={16} />تعذّر التحقق من الحالة. حاول التحديث.</div>
        ) : status?.connected ? (
          <div className="oi-status oi-status-ok"><CheckCircle2 size={16} />متصل ويعمل بشكل طبيعي — رفع الفيديوهات يجب أن يعمل لكل المشرفين.</div>
        ) : (
          <div className="oi-status oi-status-bad">
            <XCircle size={16} />
            <div>
              <strong>غير متصل — رفع الفيديوهات معطّل حالياً لكل مشرفي المدارس.</strong>
              {status?.reason && <p>{REASON_LABEL[status.reason] ?? status.reason}</p>}
            </div>
          </div>
        )}

        <div className="oi-actions">
          <a className="oi-btn-primary" href="/api/owner/google-drive/authorize">
            <ExternalLink size={15} />
            {status?.connected ? "إعادة الربط" : "ربط Google Drive"}
          </a>
          <span className="oi-hint">سينقلك هذا إلى صفحة تسجيل دخول Google الخاصة بالحساب المالك لمجلد الرفع.</span>
        </div>

        <ol className="oi-steps">
          <li>اضغط «{status?.connected ? "إعادة الربط" : "ربط Google Drive"}» وسجّل الدخول بحساب Google الذي يملك مجلد رفع الفيديوهات.</li>
          <li>وافق على الصلاحيات المطلوبة. ستظهر لك صفحة تحتوي رمز تحديث (Refresh Token) جديد.</li>
          <li>انسخ الرمز، والصقه في متغير البيئة <code>GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN</code> في إعدادات Vercel.</li>
          <li>أعد نشر المشروع (Redeploy) من Vercel حتى يُطبَّق الرمز الجديد، ثم اضغط «تحديث» هنا للتأكد.</li>
        </ol>
      </section>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
.oi-page{font-family:'Cairo',sans-serif;color:#32101A;max-width:820px}
.oi-hero{margin-bottom:20px}
.oi-eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:900;letter-spacing:.1em;color:#6B1E2D;background:rgba(107,30,45,.08);padding:4px 12px;border-radius:99px;margin-bottom:10px}
.oi-hero h1{margin:0 0 8px;font-size:24px;font-weight:900;color:#32101A}
.oi-hero p{margin:0;font-size:13.5px;color:#655B53;line-height:1.85;max-width:640px}

.oi-card{background:#FFFBF5;border:1px solid rgba(184,155,94,.28);border-radius:18px;padding:22px;box-shadow:0 12px 30px rgba(50,16,26,.06)}
.oi-card-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid rgba(184,155,94,.18)}
.oi-card-head h2{margin:0 0 6px;font-size:16px;font-weight:900;color:#32101A}
.oi-card-head p{margin:0;font-size:12.5px;color:#655B53;line-height:1.8;max-width:560px}
.oi-refresh{width:36px;height:36px;flex:none;display:grid;place-items:center;border:1px solid #D9C9B0;border-radius:10px;background:#F7F3EB;color:#6B1E2D;cursor:pointer}
.oi-refresh:disabled{opacity:.5;cursor:progress}
.oi-refresh .spin{animation:oi-spin .8s linear infinite}
@keyframes oi-spin{to{transform:rotate(360deg)}}

.oi-status{display:flex;align-items:flex-start;gap:9px;padding:13px 15px;border-radius:12px;font-size:13px;font-weight:800;line-height:1.8;margin-bottom:16px}
.oi-status-loading{background:#F7F3EB;color:#796A62}
.oi-status-ok{background:rgba(27,94,32,.09);color:#1B5E20;border:1px solid rgba(27,94,32,.22)}
.oi-status-bad{background:rgba(107,30,45,.08);color:#6B1E2D;border:1px solid rgba(107,30,45,.22)}
.oi-status-bad p{margin:5px 0 0;font-weight:700;font-size:12px;color:#6B1E2D}

.oi-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.oi-btn-primary{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#4A0E1C,#6B1E2D);color:#F7F3EB;border:0;border-radius:11px;padding:11px 20px;font-weight:900;font-size:13px;text-decoration:none}
.oi-hint{font-size:11.5px;color:#8C8274;font-weight:700}

.oi-steps{margin:0;padding-inline-start:20px;display:flex;flex-direction:column;gap:8px;font-size:12.5px;color:#4A0E1C;line-height:1.8}
.oi-steps code{background:#EFEAE0;border:1px solid rgba(184,155,94,.3);border-radius:6px;padding:1px 7px;font-size:11.5px;direction:ltr;display:inline-block}

@media(max-width:600px){
  .oi-card-head{flex-direction:column}
  .oi-actions{flex-direction:column;align-items:stretch}
  .oi-btn-primary{justify-content:center}
}
`;
