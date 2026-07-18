"use client";

import { useEffect, useState } from "react";
import { ExternalLink, GraduationCap, Save, School, ShieldCheck } from "lucide-react";
import MandalaLoader from "@/components/MandalaLoader";
import { useLang } from "@/lib/language-context";
import type { LandingFlow } from "@/lib/landing-flow";

type AccessResponse = {
  flow: LandingFlow;
  school: { name: string; slug: string };
};

const copy = {
  ar: {
    eyebrow: "بوابة الوصول",
    title: "مسار الصفحة الرئيسية",
    sub: "حدد الجمهور الذي تستقبله المنصة الآن. ينعكس التغيير فورًا على صفحة المدرسة العامة.",
    live: "المسار المنشور حاليًا",
    teacher: "مسار المعلمين",
    teacherSub: "تظهر بوابة تسجيل الدخول فقط، من دون إنشاء حساب عام.",
    student: "مسار الطلاب",
    studentSub: "تظهر خيارات تسجيل الدخول وإنشاء حساب الطالب.",
    teacherNote: "التسجيل العام مغلق. تبقى دعوات المعلمين وروابط الورش فعالة.",
    studentNote: "التسجيل العام متاح للطلاب الجدد من صفحة المدرسة.",
    save: "نشر المسار",
    saving: "جارٍ النشر...",
    saved: "تم تحديث مسار الصفحة بنجاح",
    preview: "فتح الصفحة العامة",
    error: "تعذر تحديث المسار. حاول مرة أخرى.",
  },
  sq: {
    eyebrow: "Porta e hyrjes",
    title: "Rrjedha e faqes kryesore",
    sub: "Zgjidhni audiencën që platforma pranon tani. Ndryshimi shfaqet menjëherë në faqen publike.",
    live: "Rrjedha e publikuar",
    teacher: "Rrjedha e mësuesve",
    teacherSub: "Shfaqet vetëm hyrja, pa regjistrim publik.",
    student: "Rrjedha e nxënësve",
    studentSub: "Shfaqen hyrja dhe krijimi i llogarisë së nxënësit.",
    teacherNote: "Regjistrimi publik është mbyllur. Ftesat dhe lidhjet e forumeve mbeten aktive.",
    studentNote: "Regjistrimi publik është i hapur për nxënësit e rinj.",
    save: "Publiko rrjedhën",
    saving: "Duke publikuar...",
    saved: "Rrjedha u përditësua me sukses",
    preview: "Hap faqen publike",
    error: "Rrjedha nuk u përditësua. Provoni përsëri.",
  },
  en: {
    eyebrow: "Access gateway",
    title: "Landing page flow",
    sub: "Choose the audience the platform is welcoming now. Changes appear immediately on the public school page.",
    live: "Currently published flow",
    teacher: "Teacher flow",
    teacherSub: "Shows the login portal only, with no public account creation.",
    student: "Student flow",
    studentSub: "Shows student login and account creation options.",
    teacherNote: "Public signup is closed. Teacher invitations and workshop links remain active.",
    studentNote: "Public signup is available to new students from the school page.",
    save: "Publish flow",
    saving: "Publishing...",
    saved: "Landing flow updated successfully",
    preview: "Open public page",
    error: "The flow could not be updated. Please try again.",
  },
};

export default function LandingAccessPage() {
  const { lang } = useLang();
  const t = copy[lang];
  const [data, setData] = useState<AccessResponse | null>(null);
  const [selected, setSelected] = useState<LandingFlow>("student");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<"saved" | "error" | null>(null);

  useEffect(() => {
    fetch("/api/school-admin/landing-access", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load_failed");
        return res.json() as Promise<AccessResponse>;
      })
      .then((value) => {
        setData(value);
        setSelected(value.flow);
      })
      .catch(() => setMessage("error"));
  }, []);

  async function save() {
    if (!data || selected === data.flow) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/school-admin/landing-access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow: selected }),
      });
      if (!res.ok) throw new Error("save_failed");
      const result = (await res.json()) as { flow: LandingFlow };
      setData({ ...data, flow: result.flow });
      setSelected(result.flow);
      setMessage("saved");
    } catch {
      setMessage("error");
    } finally {
      setSaving(false);
    }
  }

  if (!data && !message) return <MandalaLoader />;

  const isRtl = lang === "ar";
  const current = data?.flow ?? selected;

  return (
    <main className="landing-access" dir={isRtl ? "rtl" : "ltr"}>
      <header className="landing-access-head">
        <span>{t.eyebrow}</span>
        <h1>{t.title}</h1>
        <p>{t.sub}</p>
      </header>

      {data && (
        <section className="landing-access-workspace">
          <div className="landing-access-status">
            <div>
              <span>{t.live}</span>
              <strong>{current === "teacher" ? t.teacher : t.student}</strong>
              <small>{data.school.name}</small>
            </div>
            <ShieldCheck size={28} strokeWidth={1.6} />
          </div>

          <div className="landing-access-selector" role="radiogroup" aria-label={t.title}>
            <button
              type="button"
              role="radio"
              aria-checked={selected === "teacher"}
              className={selected === "teacher" ? "active" : ""}
              onClick={() => { setSelected("teacher"); setMessage(null); }}
            >
              <GraduationCap size={22} strokeWidth={1.7} />
              <span><strong>{t.teacher}</strong><small>{t.teacherSub}</small></span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={selected === "student"}
              className={selected === "student" ? "active" : ""}
              onClick={() => { setSelected("student"); setMessage(null); }}
            >
              <School size={22} strokeWidth={1.7} />
              <span><strong>{t.student}</strong><small>{t.studentSub}</small></span>
            </button>
          </div>

          <div className="landing-access-note">
            <span aria-hidden="true" />
            <p>{selected === "teacher" ? t.teacherNote : t.studentNote}</p>
          </div>

          <div className="landing-access-actions">
            <button type="button" className="landing-access-save" onClick={save} disabled={saving || selected === data.flow}>
              <Save size={17} />
              {saving ? t.saving : t.save}
            </button>
            <a href={`/schools/${data.school.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              {t.preview}
            </a>
          </div>

          {message && <p className={`landing-access-message ${message}`}>{message === "saved" ? t.saved : t.error}</p>}
        </section>
      )}

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .landing-access{font-family:'Cairo',sans-serif;display:flex;flex-direction:column;gap:20px;color:#1A1A1A}
  .landing-access-head{position:relative;overflow:hidden;padding:28px 30px;border-block:1px solid rgba(184,160,130,.30);background:linear-gradient(110deg,#32101A,#4A0E1C 62%,#5B1526)}
  .landing-access-head:after{content:"";position:absolute;inset-inline-end:7%;top:-80px;width:220px;height:220px;border:1px solid rgba(217,201,176,.12);border-radius:50%;box-shadow:0 0 0 28px rgba(217,201,176,.035),0 0 0 58px rgba(217,201,176,.025)}
  .landing-access-head span{position:relative;z-index:1;color:#B8A082;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
  .landing-access-head h1{position:relative;z-index:1;margin:8px 0;color:#FFFBF5;font-size:26px;line-height:1.4}
  .landing-access-head p{position:relative;z-index:1;margin:0;max-width:720px;color:rgba(239,234,224,.74);font-size:13px;line-height:1.8}
  .landing-access-workspace{padding:26px 30px;background:#FFFBF5;border-block:1px solid rgba(184,160,130,.24);box-shadow:0 16px 40px rgba(50,16,26,.06)}
  .landing-access-status{display:flex;align-items:center;justify-content:space-between;gap:20px;padding-bottom:20px;border-bottom:1px solid rgba(184,160,130,.22);color:#6B1E2D}
  .landing-access-status div{display:flex;flex-direction:column;gap:3px}.landing-access-status span{color:#8F765B;font-size:10px;font-weight:700}.landing-access-status strong{font-size:18px}.landing-access-status small{color:#796A62;font-size:11px}
  .landing-access-selector{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:22px;padding:5px;background:#EFEAE0;border:1px solid rgba(184,160,130,.25);border-radius:8px}
  .landing-access-selector button{min-height:94px;display:flex;align-items:center;gap:14px;padding:16px 18px;text-align:start;border:1px solid transparent;border-radius:6px;background:transparent;color:#796A62;font-family:inherit;cursor:pointer;transition:.18s ease}
  .landing-access-selector button:hover{background:rgba(255,251,245,.58);color:#4A0E1C}.landing-access-selector button.active{background:#FFFBF5;border-color:rgba(184,160,130,.46);color:#4A0E1C;box-shadow:0 7px 18px rgba(50,16,26,.08)}
  .landing-access-selector button>span{display:flex;flex-direction:column;gap:4px}.landing-access-selector strong{font-size:13px}.landing-access-selector small{color:#8C8274;font-size:11px;line-height:1.65}
  .landing-access-note{display:flex;align-items:center;gap:10px;margin-top:18px;padding:12px 14px;border-inline-start:3px solid #B8A082;background:rgba(184,160,130,.09)}.landing-access-note span{width:7px;height:7px;border-radius:50%;background:#6B1E2D}.landing-access-note p{margin:0;color:#655B53;font-size:12px;font-weight:600}
  .landing-access-actions{display:flex;align-items:center;gap:10px;margin-top:22px}.landing-access-actions button,.landing-access-actions a{height:42px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 18px;border-radius:7px;font-family:inherit;font-size:12px;font-weight:800;text-decoration:none;transition:.18s ease}
  .landing-access-save{border:1px solid #4A0E1C;background:#4A0E1C;color:#FFFBF5;cursor:pointer}.landing-access-save:hover:not(:disabled){background:#6B1E2D}.landing-access-save:disabled{opacity:.42;cursor:not-allowed}.landing-access-actions a{border:1px solid rgba(107,30,45,.25);color:#6B1E2D;background:#FFFBF5}
  .landing-access-message{margin:14px 0 0;font-size:12px;font-weight:700}.landing-access-message.saved{color:#1B5E20}.landing-access-message.error{color:#6B1E2D}
  @media(max-width:700px){.landing-access-head,.landing-access-workspace{padding-inline:18px}.landing-access-selector{grid-template-columns:1fr}.landing-access-actions{align-items:stretch;flex-direction:column}.landing-access-actions button,.landing-access-actions a{width:100%}}
`;
