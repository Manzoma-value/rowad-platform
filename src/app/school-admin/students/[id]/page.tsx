"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenCheck, CalendarDays, GraduationCap, Mail, MapPin, Target, UserRound } from "lucide-react";
import StudentSpectrumCard from "@/components/StudentSpectrumCard";
import { useLang } from "@/lib/language-context";

type Student = {
  id: string;
  onboarding_status: string;
  created_at: string;
  city: string | null;
  age: number | null;
  profile: { full_name: string; email: string | null; avatar_url: string | null; is_active: boolean };
  class: { id: string; name: string } | null;
  attempts_count: number;
  passed_count: number;
  total_modules: number;
  avg_score: number | null;
  progress_pct: number;
  current_stage: { title: string } | null;
  current_module: { title: string } | null;
};

const COPY = {
  ar: {
    back: "العودة إلى المستفيدين",
    eyebrow: "الملف التربوي الشامل",
    active: "حساب نشط",
    inactive: "حساب معطّل",
    class: "المجموعة",
    city: "المدينة",
    age: "العمر",
    email: "البريد الإلكتروني",
    joined: "تاريخ الانضمام",
    attempts: "المحاولات",
    completed: "المفاهيم المكتملة",
    average: "متوسط الأداء",
    progress: "التقدم العام",
    position: "الموقع الحالي",
    notAssigned: "لم تُعيّن مجموعة بعد",
    noActivity: "لم يبدأ رحلة التعلم بعد",
    loadError: "تعذر تحميل ملف المستفيد.",
  },
  sq: {
    back: "Kthehu te pjesëmarrësit",
    eyebrow: "Profili i plotë edukativ",
    active: "Llogari aktive",
    inactive: "Llogari e çaktivizuar",
    class: "Grupi",
    city: "Qyteti",
    age: "Mosha",
    email: "Email",
    joined: "Data e regjistrimit",
    attempts: "Përpjekje",
    completed: "Koncepte të përfunduara",
    average: "Mesatarja",
    progress: "Përparimi i përgjithshëm",
    position: "Pozicioni aktual",
    notAssigned: "Ende pa grup",
    noActivity: "Ende nuk e ka filluar rrugëtimin",
    loadError: "Profili nuk u ngarkua.",
  },
} as const;

export default function AdminStudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = COPY[L];
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/school-admin/students?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => setStudent((payload.students ?? []).find((item: Student) => item.id === id) ?? null))
      .catch(() => setStudent(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="asp-loading"><span /></div>;
  if (!student) return <div className="asp-error">{T.loadError}</div>;

  const initials = student.profile.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  const date = new Date(student.created_at).toLocaleDateString(L === "ar" ? "ar-SA-u-nu-latn" : "sq-AL", { year: "numeric", month: "long", day: "numeric" });

  return (
    <main className="asp" dir={L === "ar" ? "rtl" : "ltr"}>
      <Link href="/school-admin/students" className="asp-back">{L === "ar" ? <ArrowRight size={15} /> : <ArrowLeft size={15} />}{T.back}</Link>
      <header className="asp-hero">
        <i className="asp-orbit one" /><i className="asp-orbit two" />
        <div className="asp-person">
          <div className="asp-avatar">{student.profile.avatar_url ? <Image src={student.profile.avatar_url} alt={student.profile.full_name} width={82} height={82} /> : initials}</div>
          <div><span>{T.eyebrow}</span><h1>{student.profile.full_name}</h1><p className={student.profile.is_active ? "active" : "inactive"}>{student.profile.is_active ? T.active : T.inactive}</p></div>
        </div>
        <div className="asp-progress"><small>{T.progress}</small><strong>{student.progress_pct}%</strong><div><span style={{ width: `${student.progress_pct}%` }} /></div></div>
      </header>

      <section className="asp-metrics">
        <Metric icon={<BookOpenCheck />} value={student.attempts_count} label={T.attempts} />
        <Metric icon={<Target />} value={student.passed_count} label={T.completed} />
        <Metric icon={<GraduationCap />} value={student.avg_score === null ? "—" : `${student.avg_score}%`} label={T.average} />
      </section>

      <section className="asp-info">
        <Info icon={<GraduationCap />} label={T.class} value={student.class?.name ?? T.notAssigned} />
        <Info icon={<MapPin />} label={T.city} value={student.city ?? "—"} />
        <Info icon={<UserRound />} label={T.age} value={student.age?.toString() ?? "—"} />
        <Info icon={<Mail />} label={T.email} value={student.profile.email ?? "—"} ltr />
        <Info icon={<CalendarDays />} label={T.joined} value={date} />
        <Info icon={<Target />} label={T.position} value={student.current_module ? `${student.current_stage?.title ?? ""} · ${student.current_module.title}` : T.noActivity} />
      </section>

      <StudentSpectrumCard endpoint={`/api/school-admin/reports/classes/students/${id}/traits`} />
      <style>{styles}</style>
    </main>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return <article><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>;
}

function Info({ icon, label, value, ltr = false }: { icon: React.ReactNode; label: string; value: string; ltr?: boolean }) {
  return <article><span>{icon}</span><div><small>{label}</small><strong dir={ltr ? "ltr" : undefined}>{value}</strong></div></article>;
}

const styles = `
.asp{display:flex;flex-direction:column;gap:16px;padding:22px 22px 55px;font-family:'Cairo',sans-serif;color:#32101A}.asp-back{display:inline-flex;align-items:center;gap:6px;width:max-content;color:#6B1E2D;font-size:11px;font-weight:900;text-decoration:none}.asp-hero{position:relative;display:flex;align-items:center;justify-content:space-between;gap:22px;overflow:hidden;border-radius:25px;background:radial-gradient(circle at 8% 12%,rgba(217,201,176,.17),transparent 28%),linear-gradient(135deg,#32101A,#6B1E2D 70%,#4A0E1C);padding:25px 28px;color:#FFFBF5;box-shadow:0 20px 48px rgba(107,30,45,.18)}.asp-orbit{position:absolute;border:1px solid rgba(217,201,176,.13);border-radius:50%}.asp-orbit.one{width:230px;height:230px;inset-inline-end:-70px;top:-130px}.asp-orbit.two{width:140px;height:140px;inset-inline-end:55px;bottom:-105px}.asp-person{position:relative;z-index:1;display:flex;align-items:center;gap:16px;min-width:0}.asp-avatar{display:grid;width:82px;height:82px;flex:none;place-items:center;overflow:hidden;border:1px solid rgba(217,201,176,.3);border-radius:23px;background:rgba(217,201,176,.13);font-size:26px;font-weight:900}.asp-avatar img{width:100%;height:100%;object-fit:cover}.asp-person>div>span{color:#D9C9B0;font-size:9.5px;font-weight:900;letter-spacing:.1em}.asp-person h1{margin:4px 0;font-size:26px;font-weight:900}.asp-person p{display:inline-flex;border-radius:999px;padding:4px 9px;font-size:8.5px;font-weight:900}.asp-person p.active{background:rgba(27,94,32,.22);color:#D9C9B0}.asp-person p.inactive{background:rgba(217,201,176,.12);color:#D9C9B0}.asp-progress{position:relative;z-index:1;display:flex;width:180px;flex-direction:column;gap:5px;border:1px solid rgba(217,201,176,.2);border-radius:17px;background:rgba(50,16,26,.34);padding:12px 15px}.asp-progress small{color:#D9C9B0;font-size:9px;font-weight:800}.asp-progress strong{font-size:25px}.asp-progress>div{height:6px;overflow:hidden;border-radius:999px;background:rgba(217,201,176,.15)}.asp-progress>div span{display:block;height:100%;border-radius:inherit;background:#D9C9B0}.asp-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.asp-metrics article{display:flex;align-items:center;gap:10px;border:1px solid #E5E0D5;border-radius:15px;background:#FFFBF5;padding:13px}.asp-metrics article>span{display:grid;width:38px;height:38px;place-items:center;border-radius:11px;background:#EFEAE0;color:#6B1E2D}.asp-metrics article>span svg{width:17px}.asp-metrics article>div{display:flex;flex-direction:column}.asp-metrics strong{font-size:17px}.asp-metrics small{color:#796A62;font-size:9px;font-weight:800}.asp-info{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;border:1px solid #E5E0D5;border-radius:18px;background:#FFFBF5;padding:12px}.asp-info article{display:flex;align-items:center;gap:9px;border-radius:12px;background:#F7F3EB;padding:10px}.asp-info article>span{color:#8F765B}.asp-info article>span svg{width:15px}.asp-info article>div{display:flex;min-width:0;flex-direction:column}.asp-info small{color:#796A62;font-size:8.5px}.asp-info strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.asp-loading,.asp-error{display:grid;min-height:60vh;place-items:center;color:#796A62;font:800 12px 'Cairo',sans-serif}.asp-loading span{width:28px;height:28px;border:3px solid #D9C9B0;border-top-color:#6B1E2D;border-radius:50%;animation:asp-spin .7s linear infinite}@keyframes asp-spin{to{transform:rotate(360deg)}}@media(max-width:760px){.asp{padding:14px 14px 45px}.asp-hero{align-items:flex-start;flex-direction:column;padding:20px}.asp-progress{width:100%}.asp-metrics,.asp-info{grid-template-columns:1fr 1fr}.asp-person h1{font-size:21px}}@media(max-width:480px){.asp-metrics,.asp-info{grid-template-columns:1fr}.asp-avatar{width:66px;height:66px;border-radius:18px}}
`;
