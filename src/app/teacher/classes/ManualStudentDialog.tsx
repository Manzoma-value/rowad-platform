"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { MapPin, ShieldCheck, UserPlus, X } from "lucide-react";
import { useLang } from "@/lib/language-context";

export type ManualStudent = {
  id: string;
  city: string | null;
  age: number | null;
  is_manually_added: boolean;
  profile: { full_name: string; avatar_url: string | null };
};

type Props = {
  classId: string;
  className: string;
  open: boolean;
  onClose: () => void;
  onAdded: (student: ManualStudent) => void;
};

const COPY = {
  ar: {
    eyebrow: "إضافة مباشرة إلى المجموعة",
    title: "إضافة مستفيد دون حساب",
    description: "أدخل بيانات المستفيد الذي لا يستطيع التسجيل عبر الإنترنت. سيظهر فوراً في قائمتك وتقاريرك دون إنشاء بيانات دخول.",
    fullName: "الاسم الكامل",
    fullNamePlaceholder: "مثال: أحمد محمد علي",
    city: "المدينة",
    cityPlaceholder: "اختياري",
    age: "العمر",
    agePlaceholder: "اختياري",
    note: "هذا سجل تعليمي يديره المشرف، ولا يمنح المستفيد حساباً أو بيانات دخول.",
    cancel: "إلغاء",
    add: "إضافة إلى المجموعة",
    adding: "جارٍ الإضافة...",
    nameError: "أدخل الاسم الكامل بحرفين على الأقل.",
    ageError: "أدخل عمراً صحيحاً بين 3 و100 سنة.",
    genericError: "تعذرت إضافة المستفيد. تحقق من البيانات وحاول مرة أخرى.",
    close: "إغلاق",
  },
  sq: {
    eyebrow: "Shtim i drejtpërdrejtë në grup",
    title: "Shto pjesëmarrës pa llogari",
    description: "Vendos të dhënat e pjesëmarrësit që nuk mund të regjistrohet në internet. Ai do të shfaqet menjëherë në listë dhe raporte, pa krijuar të dhëna hyrjeje.",
    fullName: "Emri i plotë",
    fullNamePlaceholder: "Shembull: Arben Hoxha",
    city: "Qyteti",
    cityPlaceholder: "Opsionale",
    age: "Mosha",
    agePlaceholder: "Opsionale",
    note: "Ky është një regjistrim mësimor i menaxhuar nga mbikëqyrësi dhe nuk krijon llogari ose të dhëna hyrjeje.",
    cancel: "Anulo",
    add: "Shto në grup",
    adding: "Duke shtuar...",
    nameError: "Vendos një emër të plotë me të paktën dy karaktere.",
    ageError: "Vendos një moshë të plotë midis 3 dhe 100.",
    genericError: "Pjesëmarrësi nuk u shtua. Kontrollo të dhënat dhe provo përsëri.",
    close: "Mbyll",
  },
} as const;

export default function ManualStudentDialog({ classId, className, open, onClose, onAdded }: Props) {
  const { lang } = useLang();
  const T = COPY[lang === "sq" ? "sq" : "ar"];
  const dir = lang === "sq" ? "ltr" : "rtl";
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [age, setAge] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [busy, onClose, open]);

  useEffect(() => {
    if (!open) return;
    setFullName("");
    setCity("");
    setAge("");
    setError("");
  }, [classId, open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = fullName.trim();
    if (normalizedName.length < 2) {
      setError(T.nameError);
      return;
    }

    const normalizedAge = age.trim() ? Number(age) : undefined;
    if (normalizedAge !== undefined && (!Number.isInteger(normalizedAge) || normalizedAge < 3 || normalizedAge > 100)) {
      setError(T.ageError);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/teacher/classes/${classId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: normalizedName,
          city: city.trim() || undefined,
          age: normalizedAge,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.student) throw new Error();
      onAdded(payload.student);
      onClose();
    } catch {
      setError(T.genericError);
    } finally {
      setBusy(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="ms-overlay" role="presentation" onMouseDown={() => !busy && onClose()} dir={dir}>
      <section className="ms-dialog" role="dialog" aria-modal="true" aria-labelledby="manual-student-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="ms-head">
          <span><UserPlus size={22} /></span>
          <div><small>{T.eyebrow}</small><h2 id="manual-student-title">{T.title}</h2><p>{className}</p></div>
          <button type="button" onClick={onClose} disabled={busy} aria-label={T.close}><X size={19} /></button>
        </header>

        <form className="ms-form" onSubmit={submit} noValidate>
          <p className="ms-description">{T.description}</p>
          <label className="ms-field ms-full">
            <span>{T.fullName}<b>*</b></span>
            <input autoFocus required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={T.fullNamePlaceholder} minLength={2} maxLength={120} autoComplete="off" />
          </label>
          <div className="ms-grid">
            <label className="ms-field">
              <span>{T.city}</span>
              <div><MapPin size={15} /><input value={city} onChange={(event) => setCity(event.target.value)} placeholder={T.cityPlaceholder} maxLength={100} autoComplete="address-level2" /></div>
            </label>
            <label className="ms-field">
              <span>{T.age}</span>
              <input type="number" inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} placeholder={T.agePlaceholder} min={3} max={100} step={1} />
            </label>
          </div>
          <div className="ms-note"><ShieldCheck size={17} /><p>{T.note}</p></div>
          {error && <p className="ms-error" role="alert">{error}</p>}
          <footer>
            <button type="button" className="secondary" onClick={onClose} disabled={busy}>{T.cancel}</button>
            <button type="submit" className="primary" disabled={busy || fullName.trim().length < 2}>{busy ? <><i />{T.adding}</> : <><UserPlus size={16} />{T.add}</>}</button>
          </footer>
        </form>
        <style>{styles}</style>
      </section>
    </div>,
    document.body,
  );
}

const styles = `
  .ms-overlay{position:fixed;z-index:2147483100;inset:0;display:grid;place-items:center;background:rgba(107,30,45,.72);padding:18px;backdrop-filter:blur(12px);font-family:'Cairo',sans-serif;color:#32101A}
  .ms-dialog{width:min(590px,100%);overflow:hidden;border:1px solid rgba(217,201,176,.35);border-radius:24px;background:#F7F3EB;box-shadow:0 38px 110px rgba(107,30,45,.38);animation:msIn .2s ease}
  .ms-head{display:flex;align-items:center;gap:12px;background:radial-gradient(circle at 12% -15%,rgba(217,201,176,.18),transparent 34%),linear-gradient(135deg,#32101A,#6B1E2D);padding:18px 20px}
  .ms-head>span{display:grid;width:48px;height:48px;flex:none;place-items:center;border:1px solid rgba(217,201,176,.24);border-radius:14px;background:rgba(217,201,176,.12);color:#D9C9B0}
  .ms-head>div{min-width:0;flex:1}.ms-head small{color:#D9C9B0;font-size:8px;font-weight:900;letter-spacing:.08em}.ms-head h2{margin:1px 0;color:#FFFBF5;font-size:18px}.ms-head p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#D9C9B0;font-size:9px;font-weight:700}
  .ms-head>button{display:grid;width:39px;height:39px;place-items:center;border:1px solid rgba(217,201,176,.2);border-radius:11px;background:rgba(255,251,245,.08);color:#FFFBF5;cursor:pointer}.ms-head>button:disabled{opacity:.45}
  .ms-form{display:flex;flex-direction:column;gap:14px;padding:20px}.ms-description{color:#655B53;font-size:10.5px;font-weight:700;line-height:1.8}
  .ms-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.ms-field{display:flex;flex-direction:column;gap:6px}.ms-field>span{color:#32101A;font-size:9px;font-weight:900}.ms-field b{margin-inline-start:3px;color:#6B1E2D}
  .ms-field input{width:100%;height:44px;border:1px solid #E5E0D5;border-radius:11px;background:#FFFBF5;padding:0 12px;color:#32101A;font:700 10.5px 'Cairo',sans-serif;outline:none}.ms-field input:focus{border-color:#B8A082;box-shadow:0 0 0 3px rgba(184,160,130,.13)}.ms-field input::placeholder{color:#8F765B}
  .ms-field>div{position:relative}.ms-field>div>svg{position:absolute;inset-inline-start:11px;top:14px;color:#8F765B}.ms-field>div>input{padding-inline-start:34px}
  .ms-note{display:flex;align-items:flex-start;gap:8px;border:1px solid #D9C9B0;border-radius:11px;background:#EFEAE0;padding:10px;color:#6B1E2D}.ms-note svg{flex:none;margin-top:1px}.ms-note p{color:#655B53;font-size:9px;font-weight:800;line-height:1.65}
  .ms-error{border-radius:9px;background:rgba(107,30,45,.08);padding:8px 10px;color:#6B1E2D;font-size:9px;font-weight:900}
  .ms-form footer{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #E5E0D5;padding-top:14px}.ms-form footer button{display:flex;min-height:41px;align-items:center;justify-content:center;gap:6px;border-radius:11px;padding:0 15px;font:900 9.5px 'Cairo',sans-serif;cursor:pointer}.ms-form footer button:disabled{opacity:.48;cursor:not-allowed}.ms-form footer .secondary{border:1px solid #D9C9B0;background:#FFFBF5;color:#6B1E2D}.ms-form footer .primary{border:1px solid #6B1E2D;background:#6B1E2D;color:#FFFBF5}.ms-form footer i{width:14px;height:14px;border:2px solid rgba(255,251,245,.32);border-top-color:#FFFBF5;border-radius:50%;animation:msSpin .7s linear infinite}
  @keyframes msIn{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}@keyframes msSpin{to{transform:rotate(360deg)}}
  @media(max-width:560px){.ms-overlay{align-items:end;padding:0}.ms-dialog{max-height:100dvh;border-radius:22px 22px 0 0}.ms-head{padding:15px}.ms-form{padding:16px}.ms-grid{grid-template-columns:1fr}.ms-form footer{display:grid;grid-template-columns:1fr 1fr}.ms-form footer button{padding:0 8px}}
`;
