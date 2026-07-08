"use client";
export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import MandalaLoader from "@/components/MandalaLoader";
import { useConfirm } from "@/lib/confirm-dialog";

type TeacherClass = {
  id: string;
  name: string;
  _count?: { students: number; lessons: number; quizzes: number };
};

type TeacherGroupMembership = {
  joined_at: string;
  group: { id: string; name: string; description: string | null };
};

type TeacherApplication = {
  id: string;
  age: number;
  country: string;
  city: string;
  phone: string;
  email: string;
  current_role: string;
  qualification: string;
  specialization: string;
  years_of_experience: string;
  languages: unknown;
  submitted_at: string;
  reviewed_at: string | null;
};

interface Teacher {
  id: string;
  created_at: string;
  onboarding_status: string;
  profile: { id: string; full_name: string; email: string | null; avatar_url: string | null; is_active: boolean };
  classes: TeacherClass[];
  group_memberships: TeacherGroupMembership[];
  application: TeacherApplication | null;
  workshop_signup: { id: string; title: string } | null;
  _count: { lessons: number; quizzes: number; announcements: number };
}

const statusTone: Record<string, string> = {
  APPROVED: "good",
  ACTIVE: "good",
  PENDING_APPLICATION: "warn",
  PENDING_REVIEW: "warn",
  REJECTED: "bad",
};

export default function SchoolAdminTeachersPage() {
  const { lang } = useLang();
  const tr = t[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const confirm = useConfirm();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState("");

  const labels = {
    title: tr.teachers,
    eyebrow: lang === "ar" ? "إدارة الكوادر التعليمية" : lang === "sq" ? "Menaxhimi i mësuesve" : "Teacher Management",
    subtitle: lang === "ar" ? "ملف شامل لكل معلم: فصوله، مجموعاته، طلبه وبيانات التواصل." : lang === "sq" ? "Pamje e plotë për çdo mësues: klasa, grupe, aplikim dhe kontakt." : "A complete view of each teacher: classes, groups, application and contact.",
    search: lang === "ar" ? "ابحث باسم المعلم، البريد، الفصل، المجموعة أو المدينة..." : lang === "sq" ? "Kërko sipas emrit, emailit, klasës, grupit ose qytetit..." : "Search by name, email, class, group or city...",
    active: lang === "ar" ? "نشط" : lang === "sq" ? "Aktiv" : "Active",
    inactive: lang === "ar" ? "معطل" : lang === "sq" ? "Jo aktiv" : "Inactive",
    teachers: lang === "ar" ? "معلم" : lang === "sq" ? "mësues" : "teachers",
    classes: lang === "ar" ? "الفصول" : lang === "sq" ? "Klasat" : "Classes",
    groups: lang === "ar" ? "المجموعات" : lang === "sq" ? "Grupet" : "Groups",
    application: lang === "ar" ? "طلب المعلم" : lang === "sq" ? "Aplikimi" : "Application",
    noApplication: lang === "ar" ? "لا يوجد طلب محفوظ" : lang === "sq" ? "Nuk ka aplikim" : "No application on file",
    workshop: lang === "ar" ? "ورشة التسجيل" : lang === "sq" ? "Punëtoria" : "Workshop",
    noClasses: lang === "ar" ? "لا توجد فصول مرتبطة" : lang === "sq" ? "Pa klasa" : "No classes assigned",
    noGroups: lang === "ar" ? "لا توجد مجموعات" : lang === "sq" ? "Pa grupe" : "No groups",
    content: lang === "ar" ? "المحتوى" : lang === "sq" ? "Përmbajtja" : "Content",
    students: lang === "ar" ? "طلاب" : lang === "sq" ? "nxënës" : "students",
    lessons: lang === "ar" ? "دروس" : lang === "sq" ? "mësime" : "lessons",
    quizzes: lang === "ar" ? "اختبارات" : lang === "sq" ? "kuize" : "quizzes",
    activate: lang === "ar" ? "تفعيل" : lang === "sq" ? "Aktivizo" : "Activate",
    deactivate: lang === "ar" ? "تعطيل" : lang === "sq" ? "Çaktivizo" : "Deactivate",
  };

  useEffect(() => {
    fetch("/api/school-admin/teachers")
      .then((r) => r.json())
      .then((d) => setTeachers(d.teachers ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filteredTeachers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return teachers;
    return teachers.filter((teacher) => {
      const haystack = [
        teacher.profile.full_name,
        teacher.profile.email,
        teacher.application?.phone,
        teacher.application?.city,
        teacher.application?.country,
        teacher.application?.specialization,
        ...teacher.classes.map((klass) => klass.name),
        ...teacher.group_memberships.map((membership) => membership.group.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, teachers]);

  const totals = useMemo(() => {
    const active = teachers.filter((teacher) => teacher.profile.is_active).length;
    const withClasses = teachers.filter((teacher) => teacher.classes.length > 0).length;
    const withGroups = teachers.filter((teacher) => teacher.group_memberships.length > 0).length;
    return { active, withClasses, withGroups };
  }, [teachers]);

  const toggleTeacher = async (teacherId: string, currentActive: boolean) => {
    if (currentActive) {
      const ok = await confirm({
        title: lang === "ar" ? "تعطيل المعلم" : lang === "sq" ? "Çaktivizo mësuesin" : "Deactivate teacher",
        message: lang === "ar"
          ? "سيتم تعطيل وصول هذا المعلم إلى لوحته فوراً. لن يتمكن من الدخول حتى تعيد تفعيله."
          : lang === "sq"
            ? "Ky mësues do të humbasë qasjen menjëherë. Nuk do të mund të hyjë derisa ta riaktivizoni."
            : "This teacher will lose access immediately. They won't be able to log in until you reactivate them.",
        variant: "warning",
        confirmText: labels.deactivate,
        irreversible: false,
      });
      if (!ok) return;
    }
    setToggling(teacherId);
    setToggleError("");
    try {
      const r = await fetch(`/api/school-admin/teachers/${teacherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      const d = await r.json();
      if (!r.ok) {
        setToggleError(d.error ?? (lang === "ar" ? "حدث خطأ" : "Something went wrong"));
        return;
      }
      setTeachers((prev) =>
        prev.map((teacher) =>
          teacher.id === teacherId
            ? { ...teacher, profile: { ...teacher.profile, is_active: !currentActive } }
            : teacher,
        ),
      );
    } catch {
      setToggleError(lang === "ar" ? "تعذر الاتصال بالخادم" : lang === "sq" ? "Lidhja dështoi" : "Connection failed");
    } finally {
      setToggling(null);
    }
  };

  if (loading) return <MandalaLoader label={tr.loading} />;

  return (
    <div className="te-page" dir={dir}>
      <section className="te-hero">
        <div>
          <p className="te-eyebrow">{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <p>{labels.subtitle}</p>
        </div>
        <div className="te-hero-metrics">
          <Metric value={teachers.length} label={labels.teachers} />
          <Metric value={totals.active} label={labels.active} />
          <Metric value={totals.withClasses} label={labels.classes} />
          <Metric value={totals.withGroups} label={labels.groups} />
        </div>
      </section>

      <section className="te-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} />
        <Link href="/school-admin/applications">{labels.application}</Link>
        <Link href="/school-admin/teacher-groups">{labels.groups}</Link>
      </section>

      {toggleError && <div className="te-error">{toggleError}</div>}

      {filteredTeachers.length === 0 ? (
        <div className="te-empty">{tr.noTeachers}</div>
      ) : (
        <div className="te-grid">
          {filteredTeachers.map((teacher, index) => (
            <article key={teacher.id} className="te-card" style={{ animationDelay: `${index * 35}ms` }}>
              <div className="te-card-top">
                <Avatar teacher={teacher} />
                <div className="te-identity">
                  <div className="te-name-row">
                    <h2>{teacher.profile.full_name}</h2>
                    <span className={`te-status ${teacher.profile.is_active ? "good" : "bad"}`}>
                      {teacher.profile.is_active ? labels.active : labels.inactive}
                    </span>
                  </div>
                  <div className="te-contact">
                    {teacher.profile.email && <span>{teacher.profile.email}</span>}
                    {teacher.application?.phone && <span>{teacher.application.phone}</span>}
                  </div>
                </div>
                <button
                  data-write="true"
                  className={`te-toggle ${teacher.profile.is_active ? "off" : "on"}`}
                  onClick={() => toggleTeacher(teacher.id, teacher.profile.is_active)}
                  disabled={toggling === teacher.id}
                >
                  {toggling === teacher.id ? "..." : teacher.profile.is_active ? labels.deactivate : labels.activate}
                </button>
              </div>

              <div className="te-meta-strip">
                <span className={`te-pill ${statusTone[teacher.onboarding_status] ?? ""}`}>{teacher.onboarding_status.replaceAll("_", " ")}</span>
                {teacher.application && <span>{teacher.application.city}, {teacher.application.country}</span>}
                {teacher.workshop_signup && <span>{labels.workshop}: {teacher.workshop_signup.title}</span>}
              </div>

              <div className="te-sections">
                <InfoBlock title={labels.application}>
                  {teacher.application ? (
                    <div className="te-app-grid">
                      <span>{teacher.application.specialization}</span>
                      <span>{teacher.application.qualification.replaceAll("_", " ")}</span>
                      <span>{teacher.application.years_of_experience.replaceAll("_", " ")}</span>
                      <span>{new Date(teacher.application.submitted_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "sq-AL")}</span>
                    </div>
                  ) : (
                    <p className="te-muted">{labels.noApplication}</p>
                  )}
                </InfoBlock>

                <InfoBlock title={labels.classes}>
                  {teacher.classes.length > 0 ? (
                    <div className="te-chip-list">
                      {teacher.classes.map((klass) => (
                        <Link key={klass.id} className="te-class-chip" href="/school-admin/classes">
                          <strong>{klass.name}</strong>
                          <span>{klass._count?.students ?? 0} {labels.students}</span>
                          <span>{klass._count?.lessons ?? 0} {labels.lessons} · {klass._count?.quizzes ?? 0} {labels.quizzes}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="te-muted">{labels.noClasses}</p>
                  )}
                </InfoBlock>

                <InfoBlock title={labels.groups}>
                  {teacher.group_memberships.length > 0 ? (
                    <div className="te-chip-list compact">
                      {teacher.group_memberships.map((membership) => (
                        <Link key={membership.group.id} className="te-group-chip" href="/school-admin/teacher-groups">
                          {membership.group.name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="te-muted">{labels.noGroups}</p>
                  )}
                </InfoBlock>
              </div>

              <div className="te-card-footer">
                <span>{labels.content}</span>
                <strong>{teacher._count.lessons} {labels.lessons}</strong>
                <strong>{teacher._count.quizzes} {labels.quizzes}</strong>
                <strong>{teacher._count.announcements} {lang === "ar" ? "إعلانات" : lang === "sq" ? "njoftime" : "announcements"}</strong>
              </div>
            </article>
          ))}
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="te-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Avatar({ teacher }: { teacher: Teacher }) {
  const initials = teacher.profile.full_name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="te-avatar">
      {teacher.profile.avatar_url ? (
        <Image src={teacher.profile.avatar_url} alt={teacher.profile.full_name} width={64} height={64} />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="te-info">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

  .te-page { display:flex; flex-direction:column; gap:18px; font-family:'Cairo',sans-serif; color:#0B0B0C; }
  .te-hero {
    display:grid; grid-template-columns: minmax(0,1fr) auto; gap:22px; align-items:end;
    padding:26px; border-radius:26px; overflow:hidden; position:relative;
    background: radial-gradient(circle at 12% 18%, rgba(200,169,106,.22), transparent 32%), linear-gradient(135deg,#0B1118,#07101A 55%,#11100C);
    border:1px solid rgba(200,169,106,.25); color:#fff;
    box-shadow: 0 18px 45px rgba(8,11,12,.14);
  }
  .te-hero:after { content:""; position:absolute; inset-inline-end:-90px; top:-110px; width:300px; height:300px; border-radius:999px; border:1px solid rgba(200,169,106,.16); box-shadow: inset 0 0 70px rgba(200,169,106,.08); }
  .te-eyebrow { margin:0 0 6px; color:#D9BC78; font-size:11px; font-weight:900; letter-spacing:.16em; text-transform:uppercase; }
  .te-hero h1 { margin:0; font-size:30px; font-weight:900; letter-spacing:-.5px; }
  .te-hero p { max-width:620px; margin:8px 0 0; color:rgba(255,255,255,.72); font-size:13.5px; line-height:1.75; }
  .te-hero-metrics { display:grid; grid-template-columns:repeat(4, minmax(74px,1fr)); gap:10px; position:relative; z-index:1; }
  .te-metric { padding:12px; border-radius:16px; background:rgba(255,255,255,.07); border:1px solid rgba(200,169,106,.18); backdrop-filter:blur(10px); min-width:78px; }
  .te-metric strong { display:block; color:#E5B93C; font-size:24px; line-height:1; font-weight:900; }
  .te-metric span { display:block; margin-top:6px; color:rgba(255,255,255,.68); font-size:11px; font-weight:800; }

  .te-toolbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .te-toolbar input { flex:1; min-width:260px; height:48px; border-radius:16px; border:1px solid rgba(200,169,106,.22); background:#FFFDF8; padding:0 16px; font:700 13px 'Cairo',sans-serif; color:#17120B; outline:none; }
  .te-toolbar input:focus { border-color:rgba(200,169,106,.55); box-shadow:0 0 0 4px rgba(200,169,106,.10); }
  .te-toolbar a { height:48px; display:inline-flex; align-items:center; justify-content:center; padding:0 16px; border-radius:16px; background:#0B1118; border:1px solid rgba(200,169,106,.22); color:#D9BC78; font-size:12px; font-weight:900; text-decoration:none; }
  .te-error { padding:12px 14px; border-radius:14px; color:#8b1a1a; background:rgba(139,26,26,.07); border:1px solid rgba(139,26,26,.18); font-size:13px; font-weight:800; }
  .te-empty { padding:60px; text-align:center; border-radius:22px; background:#FFFDF8; border:1px solid rgba(200,169,106,.16); color:#8A7B60; font-weight:800; }

  .te-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
  .te-card { display:flex; flex-direction:column; gap:14px; padding:18px; border-radius:24px; background:#FFFDF8; border:1px solid rgba(200,169,106,.18); box-shadow:0 12px 30px rgba(8,11,12,.055); animation:fadeUp .35s ease both; }
  .te-card-top { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:13px; align-items:center; }
  .te-avatar { width:64px; height:64px; border-radius:18px; overflow:hidden; background:#0B1118; color:#D9BC78; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:900; border:1px solid rgba(200,169,106,.25); }
  .te-avatar img { width:100%; height:100%; object-fit:cover; }
  .te-identity { min-width:0; }
  .te-name-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .te-name-row h2 { margin:0; font-size:18px; font-weight:900; color:#0B0B0C; }
  .te-contact { display:flex; gap:8px; flex-wrap:wrap; margin-top:5px; color:#8A7B60; font-size:11.5px; font-weight:700; }
  .te-status, .te-pill { display:inline-flex; align-items:center; border-radius:999px; padding:3px 9px; font-size:10.5px; font-weight:900; border:1px solid rgba(200,169,106,.18); background:rgba(200,169,106,.08); color:#8A6523; }
  .te-status.good, .te-pill.good { color:#247247; background:rgba(45,138,74,.09); border-color:rgba(45,138,74,.18); }
  .te-status.bad, .te-pill.bad { color:#8b1a1a; background:rgba(139,26,26,.08); border-color:rgba(139,26,26,.18); }
  .te-pill.warn { color:#9A681E; background:rgba(229,185,60,.12); border-color:rgba(229,185,60,.22); }
  .te-toggle { border:1px solid; border-radius:14px; min-width:76px; height:38px; padding:0 12px; font:900 11px 'Cairo',sans-serif; cursor:pointer; transition:.18s ease; }
  .te-toggle.off { color:#8b1a1a; background:rgba(139,26,26,.06); border-color:rgba(139,26,26,.18); }
  .te-toggle.on { color:#247247; background:rgba(45,138,74,.08); border-color:rgba(45,138,74,.20); }
  .te-toggle:disabled { opacity:.55; cursor:not-allowed; }
  .te-meta-strip { display:flex; gap:8px; flex-wrap:wrap; padding:10px 12px; border-radius:16px; background:rgba(200,169,106,.055); border:1px solid rgba(200,169,106,.12); color:#735E37; font-size:11.5px; font-weight:800; }
  .te-sections { display:grid; grid-template-columns:1fr; gap:10px; }
  .te-info { border:1px solid rgba(200,169,106,.12); border-radius:18px; padding:13px; background:rgba(255,255,255,.5); }
  .te-info h3 { margin:0 0 9px; color:#3D3526; font-size:12px; font-weight:900; }
  .te-app-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
  .te-app-grid span { padding:8px 10px; border-radius:12px; background:#F7F1E6; color:#4B3A1E; font-size:11.5px; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .te-chip-list { display:flex; flex-direction:column; gap:8px; }
  .te-chip-list.compact { flex-direction:row; flex-wrap:wrap; }
  .te-class-chip { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:10px; align-items:center; padding:10px 12px; border-radius:14px; background:#F6F1E8; border:1px solid rgba(200,169,106,.13); text-decoration:none; color:#0B0B0C; }
  .te-class-chip strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12.5px; }
  .te-class-chip span { color:#8A7B60; font-size:11px; font-weight:800; white-space:nowrap; }
  .te-group-chip { display:inline-flex; padding:8px 11px; border-radius:999px; text-decoration:none; color:#6F4F16; background:rgba(200,169,106,.12); border:1px solid rgba(200,169,106,.20); font-size:11.5px; font-weight:900; }
  .te-muted { margin:0; color:#9A8A70; font-size:12px; font-weight:800; }
  .te-card-footer { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:auto; padding-top:12px; border-top:1px dashed rgba(200,169,106,.22); color:#8A7B60; font-size:11.5px; font-weight:800; }
  .te-card-footer strong { color:#0B0B0C; }

  @media(max-width:1100px){ .te-grid{grid-template-columns:1fr} .te-hero{grid-template-columns:1fr} .te-hero-metrics{grid-template-columns:repeat(4,1fr)} }
  @media(max-width:700px){
    .te-hero{padding:20px;border-radius:20px}.te-hero h1{font-size:24px}.te-hero-metrics{grid-template-columns:repeat(2,1fr)}
    .te-toolbar input{min-width:100%}.te-toolbar a{flex:1}.te-card{padding:14px}.te-card-top{grid-template-columns:auto minmax(0,1fr)}.te-toggle{grid-column:1/-1;width:100%}
    .te-class-chip,.te-app-grid{grid-template-columns:1fr}.te-card-footer{gap:7px}
  }
`;
