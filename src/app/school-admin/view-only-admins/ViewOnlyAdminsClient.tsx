"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, Eye, ShieldCheck, UserRoundX } from "lucide-react";
import { useLang } from "@/lib/language-context";

type ViewOnlyAdmin = {
  id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  is_view_only: boolean;
  view_only_expires_at: string | null;
  access_expired: boolean;
  created_at: string;
};

const COPY = {
  ar: {
    eyebrow: "الإدارة · التحكم بالوصول",
    title: "حسابات العرض فقط",
    intro: "تحكّم بحسابات المشاهدة دون منحها أي قدرة على الإضافة أو التعديل أو الحذف.",
    security: "الحماية مطبّقة على الخادم وعلى الواجهة",
    securityText: "حتى الطلبات المباشرة إلى النظام تُرفض تلقائياً من حساب العرض فقط.",
    active: "نشط",
    disabled: "معطّل",
    expired: "انتهت الصلاحية",
    unlimited: "بدون تاريخ انتهاء",
    until: "متاح حتى",
    expiry: "آخر يوم للوصول",
    noExpiry: "بدون انتهاء",
    saveDate: "حفظ التاريخ",
    saving: "جارٍ الحفظ…",
    disable: "تعطيل الحساب",
    enable: "تفعيل الحساب",
    emptyTitle: "لا توجد حسابات عرض فقط",
    emptyText: "ستظهر هنا الحسابات المعيّنة مسبقاً بصلاحية العرض فقط.",
    loadError: "تعذّر تحميل الحسابات. أعد المحاولة.",
    retry: "إعادة المحاولة",
    enabledNotice: "تم تفعيل الحساب.",
    disabledNotice: "تم تعطيل الحساب فوراً.",
    dateNotice: "تم تحديث مدة الوصول.",
    chooseFuture: "حدّث تاريخ الانتهاء أولاً قبل إعادة تفعيل الحساب.",
  },
  sq: {
    eyebrow: "Administrimi · Kontrolli i aksesit",
    title: "Llogaritë vetëm për shikim",
    intro: "Menaxhoni llogaritë e shikimit pa u dhënë mundësi të shtojnë, ndryshojnë ose fshijnë të dhëna.",
    security: "Mbrojtje në server dhe në ndërfaqe",
    securityText: "Edhe kërkesat e drejtpërdrejta refuzohen automatikisht për llogaritë vetëm për shikim.",
    active: "Aktive",
    disabled: "E çaktivizuar",
    expired: "Aksesi ka skaduar",
    unlimited: "Pa datë skadimi",
    until: "Akses deri më",
    expiry: "Dita e fundit e aksesit",
    noExpiry: "Pa skadim",
    saveDate: "Ruaj datën",
    saving: "Duke ruajtur…",
    disable: "Çaktivizo llogarinë",
    enable: "Aktivizo llogarinë",
    emptyTitle: "Nuk ka llogari vetëm për shikim",
    emptyText: "Llogaritë e caktuara paraprakisht si vetëm për shikim do të shfaqen këtu.",
    loadError: "Llogaritë nuk u ngarkuan. Provo përsëri.",
    retry: "Provo përsëri",
    enabledNotice: "Llogaria u aktivizua.",
    disabledNotice: "Llogaria u çaktivizua menjëherë.",
    dateNotice: "Afati i aksesit u përditësua.",
    chooseFuture: "Përditëso fillimisht datën e skadimit para se ta aktivizosh.",
  },
  en: {
    eyebrow: "Administration · Access control",
    title: "View-only accounts",
    intro: "Manage observer accounts without giving them any ability to add, edit, or delete platform data.",
    security: "Protected in the UI and on the server",
    securityText: "Even direct requests are rejected automatically for view-only accounts.",
    active: "Active",
    disabled: "Disabled",
    expired: "Access expired",
    unlimited: "No expiry date",
    until: "Available through",
    expiry: "Last day of access",
    noExpiry: "No expiry",
    saveDate: "Save date",
    saving: "Saving…",
    disable: "Disable account",
    enable: "Enable account",
    emptyTitle: "No view-only accounts",
    emptyText: "Accounts already designated as view-only will appear here.",
    loadError: "Could not load accounts. Try again.",
    retry: "Try again",
    enabledNotice: "Account enabled.",
    disabledNotice: "Account disabled immediately.",
    dateNotice: "Access period updated.",
    chooseFuture: "Update the expiry date before enabling this account.",
  },
} as const;

function inputDate(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function statusOf(admin: ViewOnlyAdmin, copy: (typeof COPY)[keyof typeof COPY]) {
  if (!admin.is_active) return { label: copy.disabled, tone: "off" };
  if (admin.access_expired) return { label: copy.expired, tone: "expired" };
  return { label: copy.active, tone: "on" };
}

export default function ViewOnlyAdminsClient() {
  const { lang } = useLang();
  const language = lang === "ar" ? "ar" : lang === "sq" ? "sq" : "en";
  const copy = COPY[language];
  const locale = language === "ar" ? "ar-SA-u-nu-latn" : language === "sq" ? "sq-AL" : "en-GB";
  const [admins, setAdmins] = useState<ViewOnlyAdmin[]>([]);
  const [draftDates, setDraftDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Riyadh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/school-admin/view-only-admins", { cache: "no-store" });
      if (!response.ok) throw new Error("load");
      const data = (await response.json()) as { admins?: ViewOnlyAdmin[] };
      const list = data.admins ?? [];
      setAdmins(list);
      setDraftDates(Object.fromEntries(list.map((admin) => [admin.id, inputDate(admin.view_only_expires_at)])));
    } catch {
      setError(copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateAdmin(
    admin: ViewOnlyAdmin,
    changes: { is_active?: boolean; expires_on?: string | null },
    successMessage: string,
  ) {
    setBusyId(admin.id);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/school-admin/view-only-admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = (await response.json()) as { admin?: ViewOnlyAdmin; error?: string };
      if (!response.ok || !data.admin) throw new Error(data.error || "update");
      setAdmins((current) => current.map((item) => (item.id === admin.id ? data.admin! : item)));
      setDraftDates((current) => ({
        ...current,
        [admin.id]: inputDate(data.admin!.view_only_expires_at),
      }));
      setNotice(successMessage);
    } catch (caught) {
      setError(caught instanceof Error && caught.message !== "update" ? caught.message : copy.loadError);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="vo-page">
      <section className="vo-hero">
        <div>
          <div className="vo-eyebrow"><ShieldCheck size={15} />{copy.eyebrow}</div>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>
        <div className="vo-count" aria-label={`${admins.length}`}>
          <Eye size={20} />
          <strong>{admins.length}</strong>
        </div>
      </section>

      <section className="vo-security">
        <span className="vo-security-icon"><Check size={18} /></span>
        <div><strong>{copy.security}</strong><p>{copy.securityText}</p></div>
      </section>

      {notice && <div className="vo-notice" role="status">{notice}</div>}
      {error && (
        <div className="vo-error" role="alert">
          <span>{error}</span>
          {!loading && admins.length === 0 && <button onClick={() => void load()}>{copy.retry}</button>}
        </div>
      )}

      {loading ? (
        <div className="vo-grid" aria-label="Loading">
          {[0, 1].map((item) => <div key={item} className="vo-card vo-skeleton" />)}
        </div>
      ) : admins.length === 0 && !error ? (
        <section className="vo-empty">
          <Eye size={28} />
          <h2>{copy.emptyTitle}</h2>
          <p>{copy.emptyText}</p>
        </section>
      ) : (
        <div className="vo-grid">
          {admins.map((admin) => {
            const status = statusOf(admin, copy);
            const dateValue = draftDates[admin.id] ?? "";
            const unchanged = dateValue === inputDate(admin.view_only_expires_at);
            const cannotEnable = admin.access_expired && !admin.is_active;
            return (
              <article className="vo-card" key={admin.id}>
                <header>
                  <div className="vo-avatar">{admin.full_name.trim().charAt(0).toUpperCase() || "A"}</div>
                  <div className="vo-person">
                    <h2>{admin.full_name}</h2>
                    <p dir="ltr">{admin.email || "—"}</p>
                  </div>
                  <span className={`vo-status vo-status--${status.tone}`}>
                    <i />{status.label}
                  </span>
                </header>

                <div className="vo-access-line">
                  <Clock3 size={16} />
                  <span>
                    {admin.view_only_expires_at
                      ? `${copy.until} ${new Date(admin.view_only_expires_at).toLocaleDateString(locale, {
                          dateStyle: "long",
                          timeZone: "Asia/Riyadh",
                        })}`
                      : copy.unlimited}
                  </span>
                </div>

                <div className="vo-date-box" data-write="true">
                  <label htmlFor={`expiry-${admin.id}`}>
                    <CalendarDays size={15} />{copy.expiry}
                  </label>
                  <div className="vo-date-row">
                    <input
                      id={`expiry-${admin.id}`}
                      type="date"
                      min={today}
                      value={dateValue}
                      disabled={busyId === admin.id}
                      onChange={(event) =>
                        setDraftDates((current) => ({ ...current, [admin.id]: event.target.value }))
                      }
                    />
                    <button
                      className="vo-save"
                      disabled={busyId === admin.id || unchanged}
                      onClick={() =>
                        void updateAdmin(admin, { expires_on: dateValue || null }, copy.dateNotice)
                      }
                    >
                      {busyId === admin.id ? copy.saving : copy.saveDate}
                    </button>
                  </div>
                  <button
                    className="vo-clear"
                    disabled={busyId === admin.id || dateValue === ""}
                    onClick={() => setDraftDates((current) => ({ ...current, [admin.id]: "" }))}
                  >
                    {copy.noExpiry}
                  </button>
                </div>

                {cannotEnable && <p className="vo-hint">{copy.chooseFuture}</p>}
                <button
                  data-write="true"
                  className={`vo-toggle ${admin.is_active ? "vo-toggle--danger" : ""}`}
                  disabled={busyId === admin.id || cannotEnable}
                  onClick={() =>
                    void updateAdmin(
                      admin,
                      { is_active: !admin.is_active },
                      admin.is_active ? copy.disabledNotice : copy.enabledNotice,
                    )
                  }
                >
                  {admin.is_active ? <UserRoundX size={17} /> : <ShieldCheck size={17} />}
                  {admin.is_active ? copy.disable : copy.enable}
                </button>
              </article>
            );
          })}
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
.vo-page{max-width:1100px;margin:0 auto;padding:12px 0 48px;color:#31131b}
.vo-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:28px 30px;border:1px solid rgba(107,30,45,.12);border-radius:24px;background:linear-gradient(145deg,#fffdf9,#f7f0e7);box-shadow:0 12px 36px rgba(62,25,34,.06)}
.vo-eyebrow{display:flex;align-items:center;gap:7px;color:#7c2438;font-size:12px;font-weight:850;letter-spacing:.03em;margin-bottom:10px}
.vo-hero h1{font-size:clamp(26px,4vw,38px);line-height:1.15;font-weight:950;letter-spacing:-.04em;margin:0}
.vo-hero p{max-width:680px;margin:10px 0 0;color:#74645e;font-size:14px;line-height:1.8;font-weight:600}
.vo-count{width:72px;height:72px;display:flex;align-items:center;justify-content:center;gap:7px;border-radius:20px;color:#fff;background:#681a2d;box-shadow:0 12px 24px rgba(104,26,45,.18);flex:0 0 auto}
.vo-count strong{font-size:22px}.vo-security{display:flex;align-items:center;gap:13px;margin:18px 0 24px;padding:16px 18px;border-radius:16px;background:#f3ede3;border:1px solid rgba(86,104,71,.15)}
.vo-security-icon{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#4f6945;color:white;flex:0 0 auto}
.vo-security strong{font-size:13px;font-weight:900;color:#3d5237}.vo-security p{font-size:12px;color:#6f7468;margin:3px 0 0;line-height:1.55}
.vo-notice,.vo-error{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:13px 16px;border-radius:13px;margin-bottom:16px;font-size:13px;font-weight:750}
.vo-notice{background:#edf5e9;color:#38552e;border:1px solid #cadfc1}.vo-error{background:#fff0f1;color:#7b1e31;border:1px solid #efc8d0}
.vo-error button{border:0;background:#7b1e31;color:white;border-radius:8px;padding:7px 12px;font:inherit;cursor:pointer}
.vo-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
.vo-card{background:#fffdf9;border:1px solid rgba(107,30,45,.13);border-radius:20px;padding:22px;box-shadow:0 9px 28px rgba(55,24,30,.055)}
.vo-card header{display:flex;align-items:center;gap:12px}.vo-avatar{width:46px;height:46px;border-radius:14px;background:#681a2d;color:#f5e8d5;display:grid;place-items:center;font-size:18px;font-weight:950;flex:0 0 auto}
.vo-person{min-width:0;flex:1}.vo-person h2{font-size:16px;line-height:1.35;font-weight:900;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vo-person p{font-size:11.5px;color:#87766f;margin:3px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:start}
.vo-status{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 9px;font-size:10.5px;font-weight:900;white-space:nowrap}
.vo-status i{width:6px;height:6px;border-radius:50%;background:currentColor}.vo-status--on{color:#42613a;background:#eef5eb}.vo-status--off{color:#7b1e31;background:#f8e9ec}.vo-status--expired{color:#85612c;background:#faf0de}
.vo-access-line{display:flex;align-items:center;gap:8px;margin:18px 0 12px;padding:11px 12px;border-radius:11px;background:#f8f3ec;color:#74645e;font-size:12.5px;font-weight:700}
.vo-date-box{padding:14px;border:1px solid #eadfd1;border-radius:14px}.vo-date-box label{display:flex;align-items:center;gap:7px;font-size:11.5px;color:#6b1e2d;font-weight:850;margin-bottom:9px}
.vo-date-row{display:flex;gap:8px}.vo-date-row input{min-width:0;flex:1;height:42px;border:1px solid #ddcdbb;border-radius:10px;background:white;padding:0 10px;color:#382027;font:inherit;font-size:12px}
.vo-date-row input:focus{outline:2px solid rgba(107,30,45,.16);border-color:#7b1e31}.vo-save,.vo-clear,.vo-toggle{font:inherit;font-weight:850;cursor:pointer;transition:.16s ease}
.vo-save{border:0;border-radius:10px;background:#681a2d;color:white;padding:0 15px;font-size:11.5px}.vo-clear{border:0;background:transparent;color:#8a7169;font-size:10.5px;padding:8px 2px 0}
.vo-save:disabled,.vo-clear:disabled,.vo-toggle:disabled{opacity:.45;cursor:not-allowed}.vo-toggle{display:flex;justify-content:center;align-items:center;gap:8px;width:100%;margin-top:12px;padding:12px;border:1px solid #b8c8af;border-radius:12px;background:#f2f7ef;color:#3e5a36;font-size:12px}
.vo-toggle--danger{border-color:#e0bbc3;background:#fff7f8;color:#7b1e31}.vo-toggle:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 7px 16px rgba(60,25,33,.08)}
.vo-hint{margin:10px 3px 0;font-size:10.5px;color:#8a6127;font-weight:750;line-height:1.5}
.vo-empty{text-align:center;padding:58px 24px;border:1px dashed #cfbca9;border-radius:20px;color:#836f65;background:rgba(255,253,249,.62)}
.vo-empty svg{color:#8b3043}.vo-empty h2{font-size:18px;color:#4b202b;margin:12px 0 5px}.vo-empty p{font-size:13px;margin:0}
.vo-skeleton{height:330px;background:linear-gradient(100deg,#f7f1e9 20%,#fffaf3 38%,#f7f1e9 56%);background-size:200% 100%;animation:vo-shimmer 1.2s infinite}
@keyframes vo-shimmer{to{background-position:-200% 0}}
@media(max-width:760px){.vo-page{padding-top:2px}.vo-hero{align-items:center;padding:22px}.vo-count{width:58px;height:58px}.vo-grid{grid-template-columns:1fr}.vo-card{padding:18px}}
@media(max-width:440px){.vo-hero{align-items:flex-start}.vo-count{display:none}.vo-date-row{flex-direction:column}.vo-save{height:40px}.vo-status{position:absolute;inset-inline-end:18px;top:18px}.vo-card{position:relative}.vo-card header{padding-inline-end:80px}}
`;
