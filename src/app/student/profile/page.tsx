"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  CircleUserRound,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/language-context";
import StudentSpectrumCard from "@/components/StudentSpectrumCard";
import StudentSupportCircle from "@/components/StudentSupportCircle";
import IdentityMandala from "@/components/IdentityMandala";
import MandalaLoader from "@/components/MandalaLoader";
import type { StudentSupportCircle as StudentSupportCircleValue } from "@/lib/student-support";

type Lang = "ar" | "sq";
type ProfileData = {
  id: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  avatar_path: string | null;
  created_at: string;
  email?: string;
};

const EMPTY_CIRCLE: StudentSupportCircleValue = {
  supervisor: null,
  guardian: null,
  religious_reference: null,
  sponsor: null,
};

const COPY = {
  ar: {
    eyebrow: "الهوية والرحلة",
    title: "ملفي الشخصي",
    subtitle: "بياناتك الأساسية، دائرة الرعاية المحيطة بك، وبصمتك السلوكية في مساحة واحدة واضحة.",
    beneficiary: "المستفيد",
    active: "حساب نشط",
    joined: "عضو منذ",
    identity: "البيانات الأساسية",
    identitySub: "معلومات الحساب والتسجيل الخاصة بك.",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    accountType: "نوع الحساب",
    joinDate: "تاريخ الانضمام",
    security: "أمان الحساب",
    securitySub: "يمكنك استعادة كلمة المرور أو تغييرها بأمان من هنا.",
    password: "إدارة كلمة المرور",
    upload: "رفع صورة",
    changePhoto: "تغيير الصورة",
    removePhoto: "إزالة",
    photoHint: "PNG أو JPG أو WEBP — حتى 5 ميجابايت",
    uploading: "جارٍ الرفع...",
    toastOk: "تم تحديث الصورة بنجاح",
    toastRemove: "تمت إزالة الصورة",
    toastErr: "تعذر تحديث الصورة. حاول مرة أخرى.",
    invalidFile: "اختر صورة PNG أو JPG أو WEBP بحجم لا يتجاوز 5 ميجابايت.",
    spectrum: "بصمتي السلوكية",
    spectrumSub: "القراءة التراكمية للسمات الموثقة خلال رحلتك.",
    loadError: "تعذر تحميل الملف الشخصي.",
  },
  sq: {
    eyebrow: "Identiteti dhe rrugëtimi",
    title: "Profili im",
    subtitle: "Të dhënat bazë, rrethi yt i kujdesit dhe gjurmët e tipareve në një hapësirë të qartë.",
    beneficiary: "Pjesëmarrës",
    active: "Llogari aktive",
    joined: "Anëtar që prej",
    identity: "Të dhënat bazë",
    identitySub: "Informacioni i llogarisë dhe regjistrimit.",
    fullName: "Emri i plotë",
    email: "Email",
    accountType: "Lloji i llogarisë",
    joinDate: "Data e regjistrimit",
    security: "Siguria e llogarisë",
    securitySub: "Rivendos ose ndrysho fjalëkalimin në mënyrë të sigurt.",
    password: "Menaxho fjalëkalimin",
    upload: "Ngarko foto",
    changePhoto: "Ndrysho foton",
    removePhoto: "Hiq",
    photoHint: "PNG, JPG ose WEBP — deri në 5 MB",
    uploading: "Duke ngarkuar...",
    toastOk: "Fotoja u përditësua",
    toastRemove: "Fotoja u hoq",
    toastErr: "Fotoja nuk u përditësua. Provo përsëri.",
    invalidFile: "Zgjidh një foto PNG, JPG ose WEBP deri në 5 MB.",
    spectrum: "Gjurmët e mia të tipareve",
    spectrumSub: "Leximi i grumbulluar i tipareve të dokumentuara gjatë rrugëtimit.",
    loadError: "Profili nuk u ngarkua.",
  },
} as const;

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function formatDate(value: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-nu-latn" : "sq-AL", { dateStyle: "long" }).format(new Date(value));
}

export default function StudentProfilePage() {
  const { lang: rawLang } = useLang();
  const lang: Lang = rawLang === "sq" ? "sq" : "ar";
  const t = COPY[lang];
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [supportCircle, setSupportCircle] = useState<StudentSupportCircleValue>(EMPTY_CIRCLE);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/profile", { cache: "no-store" }),
      fetch("/api/student/support-circle", { cache: "no-store" }),
    ]).then(async ([profileResponse, circleResponse]) => {
      if (!profileResponse.ok) throw new Error();
      const [profilePayload, circlePayload] = await Promise.all([
        profileResponse.json(),
        circleResponse.ok ? circleResponse.json() : Promise.resolve({}),
      ]);
      if (!active) return;
      setProfile(profilePayload.profile ? { ...profilePayload.profile, email: profilePayload.email } : null);
      setSupportCircle(circlePayload.support_circle ?? EMPTY_CIRCLE);
    }).catch(() => {
      if (active) setProfile(null);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const showToast = useCallback((text: string, ok: boolean) => {
    setToast({ text, ok });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  async function uploadAvatar(file: File) {
    if (!profile) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      showToast(t.invalidFile, false);
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      if (profile.avatar_path) await supabase.storage.from("avatars").remove([profile.avatar_path]);
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `profiles/${profile.id}/avatar-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: data.publicUrl, avatar_path: path }),
      });
      if (!response.ok) throw new Error();
      setProfile((current) => current ? { ...current, avatar_url: data.publicUrl, avatar_path: path } : current);
      showToast(t.toastOk, true);
    } catch {
      showToast(t.toastErr, false);
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    if (!profile || uploading) return;
    setUploading(true);
    try {
      const response = await fetch("/api/profile", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setProfile((current) => current ? { ...current, avatar_url: null, avatar_path: null } : current);
      showToast(t.toastRemove, true);
    } catch {
      showToast(t.toastErr, false);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <MandalaLoader />;
  if (!profile) return <main className="sp-error" dir={lang === "ar" ? "rtl" : "ltr"}>{t.loadError}<style>{styles}</style></main>;

  return <main className="sp" dir={lang === "ar" ? "rtl" : "ltr"}>
    {toast && <div className={`sp-toast ${toast.ok ? "ok" : "error"}`}><CheckCircle2 size={15}/>{toast.text}</div>}
    <header className="sp-hero">
      <div className="sp-art" aria-hidden="true"><IdentityMandala size={360} stroke="#D9C9B0" opacity={0.11} spin spinDuration={130}/></div>
      <div className="sp-person">
        <div className="sp-avatar">{profile.avatar_url ? <Image src={profile.avatar_url} alt={profile.full_name} fill sizes="104px" /> : <span>{initials(profile.full_name)}</span>}<button type="button" onClick={() => fileRef.current?.click()} aria-label={t.changePhoto} title={t.changePhoto}><Camera size={16}/></button></div>
        <div><span className="sp-eyebrow"><Sparkles size={13}/>{t.eyebrow}</span><h1>{profile.full_name}</h1><p>{t.subtitle}</p><div className="sp-tags"><span><CircleUserRound size={13}/>{t.beneficiary}</span><span><ShieldCheck size={13}/>{t.active}</span></div></div>
      </div>
      <div className="sp-joined"><small>{t.joined}</small><strong>{formatDate(profile.created_at, lang)}</strong><CalendarDays size={21}/></div>
    </header>

    <section className="sp-layout">
      <aside className="sp-photo-card">
        <div className="sp-photo-ring">{profile.avatar_url ? <Image src={profile.avatar_url} alt={profile.full_name} fill sizes="150px" /> : <span>{initials(profile.full_name)}</span>}</div>
        <h2>{profile.full_name}</h2><p>{t.beneficiary}</p>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.target.value = ""; }}/>
        <button type="button" className="sp-upload" onClick={() => fileRef.current?.click()} disabled={uploading}><Upload size={15}/>{uploading ? t.uploading : profile.avatar_url ? t.changePhoto : t.upload}</button>
        {profile.avatar_url && <button type="button" className="sp-remove" onClick={() => void removeAvatar()} disabled={uploading}><Trash2 size={14}/>{t.removePhoto}</button>}
        <small>{t.photoHint}</small>
      </aside>

      <div className="sp-main-card">
        <header><span><CircleUserRound size={18}/></span><div><h2>{t.identity}</h2><p>{t.identitySub}</p></div></header>
        <div className="sp-info-grid">
          <article><span><CircleUserRound/></span><div><small>{t.fullName}</small><strong>{profile.full_name}</strong></div></article>
          <article><span><Mail/></span><div><small>{t.email}</small><strong dir="ltr">{profile.email ?? "—"}</strong></div></article>
          <article><span><ShieldCheck/></span><div><small>{t.accountType}</small><strong>{t.beneficiary}</strong></div></article>
          <article><span><CalendarDays/></span><div><small>{t.joinDate}</small><strong>{formatDate(profile.created_at, lang)}</strong></div></article>
        </div>
        <div className="sp-security"><span><KeyRound/></span><div><strong>{t.security}</strong><small>{t.securitySub}</small></div><Link href="/forgot-password">{t.password}</Link></div>
      </div>
    </section>

    <StudentSupportCircle value={supportCircle} lang={lang} />

    <section className="sp-spectrum"><header><span><Sparkles/></span><div><h2>{t.spectrum}</h2><p>{t.spectrumSub}</p></div></header><StudentSpectrumCard endpoint="/api/student/traits" /></section>
    <style>{styles}</style>
  </main>;
}

const styles = `
.sp,.sp *{box-sizing:border-box}.sp{max-width:1380px;margin:0 auto;padding:10px 0 70px;color:#32101A;font-family:'Cairo',sans-serif}.sp-error{min-height:60vh;display:grid;place-items:center;color:#6B1E2D;font-family:'Cairo',sans-serif;font-weight:900}.sp-toast{position:fixed;top:24px;inset-inline-end:24px;z-index:7000;display:flex;align-items:center;gap:7px;padding:11px 15px;border-radius:12px;background:#1B5E20;color:#fff;font-size:10px;font-weight:900;box-shadow:0 12px 30px rgba(26,26,26,.2)}.sp-toast.error{background:#6B1E2D}.sp-hero{position:relative;isolation:isolate;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:26px;min-height:245px;padding:34px;border-radius:31px;background:radial-gradient(circle at 8% 110%,rgba(184,160,130,.27),transparent 34%),linear-gradient(135deg,#32101A,#4A0E1C 52%,#6B1E2D);color:#FFFBF5;box-shadow:0 25px 60px rgba(107,30,45,.22)}.sp-hero:after{content:'';position:absolute;inset:10px;z-index:-1;border:1px solid rgba(217,201,176,.15);border-radius:23px}.sp-art{position:absolute;inset-inline-end:-70px;bottom:-110px;z-index:-1}.sp-person{display:flex;align-items:center;gap:21px;min-width:0}.sp-avatar{position:relative;width:104px;height:104px;overflow:hidden;display:grid;place-items:center;flex:none;border:5px solid rgba(255,251,245,.1);border-radius:29px;background:#1A1A1A;color:#D9C9B0;font-size:25px;font-weight:900;box-shadow:0 12px 28px rgba(26,26,26,.25)}.sp-avatar img,.sp-photo-ring img{object-fit:cover}.sp-avatar button{position:absolute;inset-inline-end:5px;bottom:5px;width:31px;height:31px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:#6B1E2D;color:#fff;cursor:pointer}.sp-eyebrow{display:flex;align-items:center;gap:6px;color:#D9C9B0;font-size:9.5px;font-weight:900;letter-spacing:.08em}.sp-person h1{margin:5px 0 3px;font-size:clamp(25px,3vw,35px);line-height:1.3}.sp-person p{max-width:620px;margin:0;color:rgba(255,251,245,.67);font-size:11px;line-height:1.8}.sp-tags{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}.sp-tags span{display:flex;align-items:center;gap:5px;padding:5px 9px;border:1px solid rgba(217,201,176,.17);border-radius:999px;background:rgba(255,251,245,.07);color:#D9C9B0;font-size:8.5px;font-weight:900}.sp-joined{position:relative;z-index:1;min-width:190px;padding:16px;border:1px solid rgba(217,201,176,.18);border-radius:18px;background:rgba(26,26,26,.17);backdrop-filter:blur(9px)}.sp-joined small,.sp-joined strong{display:block}.sp-joined small{color:#D9C9B0;font-size:9px;font-weight:800}.sp-joined strong{margin-top:4px;font-size:12px}.sp-joined svg{margin-top:14px;color:#D9C9B0}.sp-layout{display:grid;grid-template-columns:270px minmax(0,1fr);gap:14px;margin:15px 0}.sp-photo-card,.sp-main-card,.sp-spectrum{border:1px solid rgba(107,30,45,.12);border-radius:23px;background:#FFFBF5;box-shadow:0 12px 34px rgba(107,30,45,.055)}.sp-photo-card{display:flex;align-items:center;flex-direction:column;padding:20px;text-align:center}.sp-photo-ring{position:relative;width:132px;height:132px;overflow:hidden;display:grid;place-items:center;border:7px solid #F7F3EB;border-radius:36px;background:linear-gradient(145deg,#4A0E1C,#1A1A1A);color:#D9C9B0;font-size:29px;font-weight:900;box-shadow:0 10px 25px rgba(107,30,45,.17)}.sp-photo-card h2{margin:12px 0 0;font-size:15px}.sp-photo-card>p{margin:1px 0 12px;color:#8F765B;font-size:9px;font-weight:800}.sp-photo-card button{width:100%;min-height:39px;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:11px;font:900 9px 'Cairo',sans-serif;cursor:pointer}.sp-upload{border:0;background:#6B1E2D;color:#fff}.sp-remove{margin-top:6px;border:1px solid rgba(107,30,45,.18);background:#fff;color:#6B1E2D}.sp-photo-card button:disabled{opacity:.55;cursor:wait}.sp-photo-card>small{margin-top:9px;color:#8C8274;font-size:7.5px}.sp-main-card{padding:20px}.sp-main-card>header,.sp-spectrum>header{display:flex;align-items:flex-start;gap:10px;margin-bottom:15px}.sp-main-card>header>span,.sp-spectrum>header>span{width:39px;height:39px;display:grid;place-items:center;flex:none;border-radius:12px;background:#F7F3EB;color:#6B1E2D}.sp-main-card>header h2,.sp-spectrum>header h2{margin:0;font-size:15px}.sp-main-card>header p,.sp-spectrum>header p{margin:2px 0 0;color:#796A62;font-size:9.5px;line-height:1.7}.sp-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sp-info-grid article{display:flex;align-items:center;gap:10px;min-width:0;padding:12px;border:1px solid rgba(107,30,45,.09);border-radius:14px;background:#F7F3EB}.sp-info-grid article>span{width:34px;height:34px;display:grid;place-items:center;flex:none;border-radius:10px;background:#FFFBF5;color:#8F765B}.sp-info-grid svg{width:16px}.sp-info-grid div{min-width:0}.sp-info-grid small,.sp-info-grid strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sp-info-grid small{color:#796A62;font-size:8px;font-weight:800}.sp-info-grid strong{margin-top:2px;font-size:10.5px}.sp-security{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;margin-top:10px;padding:12px;border:1px solid rgba(27,94,32,.13);border-radius:14px;background:rgba(27,94,32,.045)}.sp-security>span{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:#1B5E20;color:#fff}.sp-security>span svg{width:16px}.sp-security strong,.sp-security small{display:block}.sp-security strong{font-size:10.5px}.sp-security small{color:#796A62;font-size:8px}.sp-security a{padding:7px 10px;border-radius:9px;background:#1B5E20;color:#fff;font-size:8px;font-weight:900;text-decoration:none}.sp-spectrum{margin-top:15px;padding:20px}.sp-spectrum>header>span svg{width:18px}
@media(max-width:820px){.sp{padding:8px 12px 55px}.sp-hero{align-items:flex-start;flex-direction:column;padding:25px;border-radius:24px}.sp-person{align-items:flex-start}.sp-joined{width:100%}.sp-layout{grid-template-columns:1fr}.sp-photo-card{display:grid;grid-template-columns:auto minmax(0,1fr);text-align:start}.sp-photo-ring{grid-row:1/6;width:105px;height:105px;margin-inline-end:14px;border-radius:28px}.sp-photo-card button{grid-column:2}.sp-photo-card>small{grid-column:2}.sp-info-grid{grid-template-columns:1fr}}@media(max-width:520px){.sp-person{flex-direction:column}.sp-avatar{width:82px;height:82px;border-radius:23px}.sp-photo-card{display:flex;text-align:center}.sp-photo-ring{margin:0}.sp-photo-card button,.sp-photo-card>small{grid-column:auto}.sp-security{grid-template-columns:auto 1fr}.sp-security a{grid-column:1/-1;text-align:center}.sp-toast{top:12px;inset-inline:12px}}
@media(prefers-reduced-motion:reduce){.sp-art{display:none}}
`;
