"use client";
export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import MandalaLoader from "@/components/MandalaLoader";
import IdentityStar from "@/components/IdentityStar";
import IdentityMandala from "@/components/IdentityMandala";
import { useConfirm } from "@/lib/confirm-dialog";
import {
  QUALIFICATION_L,
  EXPERIENCE_RANGE_L,
  CURRENT_ROLE_L,
  type Qualification,
  type ExperienceRange,
  type CurrentRole,
} from "@/lib/teacher-application";
import {
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  BookOpen,
  Users,
  Sparkles,
  Trash2,
} from "lucide-react";

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

type WorkshopRef = { id: string; title: string; status: "OPEN" | "CLOSED" };
type WorkshopAttendanceEntry = { day_date: string; workshop: WorkshopRef };

interface Teacher {
  id: string;
  created_at: string;
  onboarding_status: string;
  profile: { id: string; full_name: string; email: string | null; avatar_url: string | null; is_active: boolean };
  classes: TeacherClass[];
  group_memberships: TeacherGroupMembership[];
  application: TeacherApplication | null;
  workshop_signup: WorkshopRef | null;
  workshop_attendance: WorkshopAttendanceEntry[];
  _count: { lessons: number; quizzes: number; announcements: number };
}

// ── Real onboarding-status enum values (TeacherOnboardingStatus) ──
const onboardingTone: Record<string, string> = {
  ACTIVE: "good",
  UNDER_REVIEW: "warn",
  WAITING_LIST: "warn",
  PENDING_APPLICATION: "warn",
  REJECTED: "bad",
};

const ONBOARDING_LABEL: Record<string, { ar: string; sq: string; en: string }> = {
  PENDING_APPLICATION: { ar: "بانتظار تقديم الطلب", sq: "Në pritje të aplikimit", en: "Awaiting application" },
  UNDER_REVIEW: { ar: "قيد المراجعة", sq: "Në shqyrtim", en: "Under review" },
  WAITING_LIST: { ar: "قائمة الانتظار", sq: "Lista e pritjes", en: "Waiting list" },
  ACTIVE: { ar: "مفعّل", sq: "Aktiv", en: "Active" },
  REJECTED: { ar: "مرفوض", sq: "Refuzuar", en: "Rejected" },
};

function onboardingLabel(status: string, lang: string) {
  const entry = ONBOARDING_LABEL[status];
  if (!entry) return status;
  return lang === "ar" ? entry.ar : lang === "sq" ? entry.sq : entry.en;
}

// ── Application-enum labels — ar/sq come from the shared source of truth,
//    English is filled in locally since that dictionary is ar/sq only. ──
const QUALIFICATION_EN: Record<string, string> = {
  DIPLOMA: "Diploma", BACHELOR: "Bachelor's", HIGHER_DIPLOMA: "Higher diploma", MASTER: "Master's", PHD: "PhD",
};
const EXPERIENCE_EN: Record<string, string> = {
  LT_3: "Under 3 years", Y_3_5: "3–5 years", Y_6_10: "6–10 years", Y_11_15: "11–15 years", GT_15: "15+ years",
};
const CURRENT_ROLE_EN: Record<string, string> = {
  TEACHER: "Teacher", SUPERVISOR: "Educational supervisor", PRINCIPAL: "Principal", VICE_PRINCIPAL: "Vice principal",
  COUNSELOR: "Counselor", TRAINER: "Trainer", TEAM_LEAD: "Team lead", RESEARCHER: "Researcher",
  VOLUNTEER: "Volunteer", OTHER: "Other",
};

function qualificationLabel(code: string, lang: string) {
  if (lang === "en") return QUALIFICATION_EN[code] ?? code;
  const entry = QUALIFICATION_L[code as Qualification];
  return entry ? entry[lang === "sq" ? "sq" : "ar"] : code;
}
function experienceLabel(code: string, lang: string) {
  if (lang === "en") return EXPERIENCE_EN[code] ?? code;
  const entry = EXPERIENCE_RANGE_L[code as ExperienceRange];
  return entry ? entry[lang === "sq" ? "sq" : "ar"] : code;
}
function currentRoleLabel(code: string, lang: string) {
  if (lang === "en") return CURRENT_ROLE_EN[code] ?? code;
  const entry = CURRENT_ROLE_L[code as CurrentRole];
  return entry ? entry[lang === "sq" ? "sq" : "ar"] : code;
}

// ── Collapse the raw attendance log into one row per workshop ──
type WorkshopSummary = { id: string; title: string; status: string; days: number; lastDate: string; isCurrent: boolean };

function summarizeWorkshops(teacher: Teacher): WorkshopSummary[] {
  const map = new Map<string, WorkshopSummary>();
  for (const entry of teacher.workshop_attendance) {
    const w = entry.workshop;
    const existing = map.get(w.id);
    if (existing) {
      existing.days += 1;
      if (entry.day_date > existing.lastDate) existing.lastDate = entry.day_date;
    } else {
      map.set(w.id, { id: w.id, title: w.title, status: w.status, days: 1, lastDate: entry.day_date, isCurrent: false });
    }
  }
  if (teacher.workshop_signup) {
    const sid = teacher.workshop_signup.id;
    const isCurrent = teacher.workshop_signup.status === "OPEN";
    const existing = map.get(sid);
    if (existing) existing.isCurrent = isCurrent;
    else map.set(sid, { id: sid, title: teacher.workshop_signup.title, status: teacher.workshop_signup.status, days: 0, lastDate: "", isCurrent });
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    return (b.lastDate || "").localeCompare(a.lastDate || "");
  });
}

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

  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const labels = {
    title: tr.teachers,
    eyebrow: lang === "ar" ? "إدارة الكوادر التعليمية" : lang === "sq" ? "Menaxhimi i mësuesve" : "Teacher Management",
    subtitle: lang === "ar" ? "ملف شامل لكل معلم: فصوله، مجموعاته، بياناته والورش التي حضرها." : lang === "sq" ? "Pamje e plotë për çdo mësues: klasa, grupe, të dhëna dhe punëtoritë." : "A complete view of each teacher: classes, groups, info and workshops attended.",
    search: lang === "ar" ? "ابحث باسم المعلم، البريد، الفصل، المجموعة أو المدينة..." : lang === "sq" ? "Kërko sipas emrit, emailit, klasës, grupit ose qytetit..." : "Search by name, email, class, group or city...",
    active: lang === "ar" ? "نشط" : lang === "sq" ? "Aktiv" : "Active",
    inactive: lang === "ar" ? "معطل" : lang === "sq" ? "Jo aktiv" : "Inactive",
    teachers: lang === "ar" ? "معلم" : lang === "sq" ? "mësues" : "teachers",
    classes: lang === "ar" ? "الفصول" : lang === "sq" ? "Klasat" : "Classes",
    groups: lang === "ar" ? "المجموعات" : lang === "sq" ? "Grupet" : "Groups",
    teacherInfo: lang === "ar" ? "بيانات المعلم" : lang === "sq" ? "Të dhënat e mësuesit" : "Teacher info",
    noApplication: lang === "ar" ? "لم يقدّم بياناته بعد" : lang === "sq" ? "Nuk ka plotësuar aplikimin ende" : "No info on file yet",
    qualification: lang === "ar" ? "المؤهل العلمي" : lang === "sq" ? "Kualifikimi" : "Qualification",
    specialization: lang === "ar" ? "التخصص" : lang === "sq" ? "Specializimi" : "Specialization",
    experience: lang === "ar" ? "سنوات الخبرة" : lang === "sq" ? "Vitet e përvojës" : "Experience",
    currentRoleLbl: lang === "ar" ? "الدور الحالي" : lang === "sq" ? "Roli aktual" : "Current role",
    submittedAt: lang === "ar" ? "تاريخ التقديم" : lang === "sq" ? "Data e aplikimit" : "Submitted",
    location: lang === "ar" ? "الموقع" : lang === "sq" ? "Vendndodhja" : "Location",
    workshops: lang === "ar" ? "الورش التدريبية" : lang === "sq" ? "Punëtoritë" : "Workshops",
    attendingNow: lang === "ar" ? "يحضر الآن" : lang === "sq" ? "Po merr pjesë tani" : "Attending now",
    daysAttended: lang === "ar" ? "أيام حضور" : lang === "sq" ? "ditë pjesëmarrje" : "days attended",
    noWorkshops: lang === "ar" ? "لم يسجّل في أي ورشة بعد" : lang === "sq" ? "Nuk është regjistruar në asnjë punëtori ende" : "Not registered in any workshop yet",
    noClasses: lang === "ar" ? "لا توجد فصول مرتبطة" : lang === "sq" ? "Pa klasa" : "No classes assigned",
    noGroups: lang === "ar" ? "لا توجد مجموعات" : lang === "sq" ? "Pa grupe" : "No groups",
    content: lang === "ar" ? "المحتوى" : lang === "sq" ? "Përmbajtja" : "Content",
    students: lang === "ar" ? "طلاب" : lang === "sq" ? "nxënës" : "students",
    lessons: lang === "ar" ? "دروس" : lang === "sq" ? "mësime" : "lessons",
    quizzes: lang === "ar" ? "اختبارات" : lang === "sq" ? "kuize" : "quizzes",
    activate: lang === "ar" ? "تفعيل" : lang === "sq" ? "Aktivizo" : "Activate",
    deactivate: lang === "ar" ? "تعطيل" : lang === "sq" ? "Çaktivizo" : "Deactivate",
    deleteTeacher: lang === "ar" ? "حذف المعلم" : lang === "sq" ? "Fshi mësuesin" : "Delete teacher",
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const r = await fetch(`/api/school-admin/teachers/${deleteTarget.id}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setDeleteError(d.error ?? (lang === "ar" ? "تعذر حذف المعلم" : lang === "sq" ? "Fshirja dështoi" : "Failed to delete teacher"));
        return;
      }
      setTeachers((prev) => prev.filter((teacher) => teacher.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteError(lang === "ar" ? "تعذر الاتصال بالخادم" : lang === "sq" ? "Lidhja dështoi" : "Connection failed");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <MandalaLoader label={tr.loading} />;

  return (
    <div className="te-page" dir={dir}>
      <section className="te-hero">
        <div className="te-hero-star" aria-hidden="true">
          <IdentityMandala size={270} stroke="#D9C9B0" opacity={0.9} spin spinDuration={130} />
        </div>
        <div>
          <p className="te-eyebrow">
            <IdentityStar size={11} strokeWidth={5} color="#D9C9B0" />
            {labels.eyebrow}
          </p>
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
        <Link href="/school-admin/applications">{labels.teacherInfo}</Link>
        <Link href="/school-admin/teacher-groups">{labels.groups}</Link>
      </section>

      {toggleError && <div className="te-error">{toggleError}</div>}

      {filteredTeachers.length === 0 ? (
        <div className="te-empty">{tr.noTeachers}</div>
      ) : (
        <div className="te-grid">
          {filteredTeachers.map((teacher, index) => {
            const workshopSummaries = summarizeWorkshops(teacher);
            return (
              <article key={teacher.id} className="te-card" style={{ animationDelay: `${index * 35}ms` }}>
                <div className="te-card-watermark" aria-hidden="true">
                  <IdentityMandala size={130} stroke="#4A0E1C" opacity={0.05} />
                </div>

                <button
                  type="button"
                  data-write="true"
                  className="te-delete-btn"
                  onClick={() => { setDeleteTarget(teacher); setDeleteError(""); }}
                  title={labels.deleteTeacher}
                  aria-label={labels.deleteTeacher}
                >
                  <Trash2 size={15} strokeWidth={1.8} />
                </button>

                <div className="te-card-top">
                  <Avatar teacher={teacher} />
                  <div className="te-identity">
                    <div className="te-name-row">
                      <h2>{teacher.profile.full_name}</h2>
                    </div>
                    <div className="te-badge-row">
                      <span className={`te-status ${teacher.profile.is_active ? "good" : "bad"}`}>
                        <span className="te-status-dot" />
                        {teacher.profile.is_active ? labels.active : labels.inactive}
                      </span>
                      <span className={`te-pill ${onboardingTone[teacher.onboarding_status] ?? ""}`}>
                        {onboardingLabel(teacher.onboarding_status, lang)}
                      </span>
                    </div>
                    <div className="te-contact">
                      {teacher.profile.email && <span><Mail size={12} strokeWidth={2} />{teacher.profile.email}</span>}
                      {teacher.application?.phone && <span><Phone size={12} strokeWidth={2} />{teacher.application.phone}</span>}
                      {teacher.application && <span><MapPin size={12} strokeWidth={2} />{teacher.application.city}, {teacher.application.country}</span>}
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

                <div className="te-sections">
                  <InfoBlock title={labels.teacherInfo} icon={<GraduationCap size={13} strokeWidth={2} />}>
                    {teacher.application ? (
                      <div className="te-info-grid">
                        <InfoItem label={labels.qualification} value={qualificationLabel(teacher.application.qualification, lang)} />
                        <InfoItem label={labels.specialization} value={teacher.application.specialization} />
                        <InfoItem label={labels.experience} value={experienceLabel(teacher.application.years_of_experience, lang)} />
                        <InfoItem label={labels.currentRoleLbl} value={currentRoleLabel(teacher.application.current_role, lang)} />
                        <InfoItem
                          label={labels.submittedAt}
                          value={new Date(teacher.application.submitted_at).toLocaleDateString(lang === "ar" ? "ar-SA-u-nu-latn" : lang === "sq" ? "sq-AL" : "en-GB")}
                        />
                        <InfoItem label={labels.location} value={`${teacher.application.city}, ${teacher.application.country}`} />
                      </div>
                    ) : (
                      <p className="te-muted">{labels.noApplication}</p>
                    )}
                  </InfoBlock>

                  <InfoBlock title={labels.workshops} icon={<Sparkles size={13} strokeWidth={2} />}>
                    {workshopSummaries.length > 0 ? (
                      <div className="te-workshop-list">
                        {workshopSummaries.map((w) => (
                          <div key={w.id} className={`te-workshop-item ${w.isCurrent ? "live" : ""}`}>
                            {w.isCurrent && <span className="te-live-dot" />}
                            <div className="te-workshop-text">
                              <strong>{w.title}</strong>
                              <span>{w.isCurrent ? labels.attendingNow : `${w.days} ${labels.daysAttended}`}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="te-muted">{labels.noWorkshops}</p>
                    )}
                  </InfoBlock>

                  <InfoBlock title={labels.classes} icon={<BookOpen size={13} strokeWidth={2} />}>
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

                  <InfoBlock title={labels.groups} icon={<Users size={13} strokeWidth={2} />}>
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
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <DeleteTeacherModal
          teacher={deleteTarget}
          lang={lang}
          deleting={deleting}
          error={deleteError}
          onCancel={() => { if (!deleting) { setDeleteTarget(null); setDeleteError(""); } }}
          onConfirm={confirmDelete}
        />
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
        <Image src={teacher.profile.avatar_url} alt={teacher.profile.full_name} width={68} height={68} />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function InfoBlock({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="te-info">
      <h3>{icon}{title}</h3>
      {children}
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="te-info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// ── Delete confirmation — bespoke (not the generic useConfirm) because it
//    needs to show the teacher's classes and groups, not just a sentence. ──
function DeleteTeacherModal({
  teacher,
  lang,
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  teacher: Teacher;
  lang: "ar" | "sq" | "en";
  deleting: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const L = {
    title: lang === "ar" ? "حذف المعلم نهائياً" : lang === "sq" ? "Fshije mësuesin përfundimisht" : "Delete teacher permanently",
    warn: lang === "ar"
      ? "سيتم حذف هذا المعلم نهائياً من قاعدة البيانات مع جميع بياناته. هذا الإجراء لا يمكن التراجع عنه."
      : lang === "sq"
        ? "Ky mësues do të fshihet përfundimisht nga baza e të dhënave me të gjitha të dhënat e tij. Ky veprim nuk mund të zhbëhet."
        : "This teacher will be permanently removed from the database along with all their data. This action cannot be undone.",
    classesImpact: lang === "ar" ? "الفصول التي سيفقد الوصول إليها" : lang === "sq" ? "Klasat që do të humbasë" : "Classes they will lose access to",
    groupsImpact: lang === "ar" ? "المجموعات التي سيُزال منها" : lang === "sq" ? "Grupet nga të cilat do të hiqet" : "Groups they will be removed from",
    noImpact: lang === "ar" ? "لا توجد فصول أو مجموعات مرتبطة بهذا المعلم." : lang === "sq" ? "Nuk ka klasa apo grupe të lidhura me këtë mësues." : "No classes or groups linked to this teacher.",
    students: lang === "ar" ? "طالب" : lang === "sq" ? "nxënës" : "students",
    cancel: lang === "ar" ? "إلغاء" : lang === "sq" ? "Anulo" : "Cancel",
    confirm: lang === "ar" ? "حذف نهائياً" : lang === "sq" ? "Fshij përfundimisht" : "Delete permanently",
    deletingNow: lang === "ar" ? "جارٍ الحذف..." : lang === "sq" ? "Duke fshirë..." : "Deleting...",
  };

  return (
    <div className="tdel-overlay" role="dialog" aria-modal="true" onClick={deleting ? undefined : onCancel}>
      <div className="tdel-card" dir={dir} onClick={(e) => e.stopPropagation()}>
        <div className="tdel-icon"><Trash2 size={24} strokeWidth={1.7} /></div>
        <h3 className="tdel-title">{L.title}</h3>

        <div className="tdel-teacher">
          <Avatar teacher={teacher} />
          <div className="tdel-teacher-text">
            <strong>{teacher.profile.full_name}</strong>
            {teacher.profile.email && <span>{teacher.profile.email}</span>}
          </div>
        </div>

        <p className="tdel-warn">{L.warn}</p>

        {(teacher.classes.length > 0 || teacher.group_memberships.length > 0) ? (
          <div className="tdel-impact">
            {teacher.classes.length > 0 && (
              <div className="tdel-impact-block">
                <span className="tdel-impact-label">{L.classesImpact}</span>
                <div className="tdel-impact-chips">
                  {teacher.classes.map((c) => (
                    <span key={c.id} className="tdel-chip">{c.name} · {c._count?.students ?? 0} {L.students}</span>
                  ))}
                </div>
              </div>
            )}
            {teacher.group_memberships.length > 0 && (
              <div className="tdel-impact-block">
                <span className="tdel-impact-label">{L.groupsImpact}</span>
                <div className="tdel-impact-chips">
                  {teacher.group_memberships.map((m) => (
                    <span key={m.group.id} className="tdel-chip">{m.group.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="tdel-noimpact">{L.noImpact}</p>
        )}

        {error && <p className="tdel-error">{error}</p>}

        <div className="tdel-actions">
          <button type="button" className="tdel-btn-cancel" onClick={onCancel} disabled={deleting}>{L.cancel}</button>
          <button type="button" className="tdel-btn-confirm" onClick={onConfirm} disabled={deleting}>
            {deleting ? <span className="tdel-spin" /> : <Trash2 size={14} strokeWidth={2} />}
            {deleting ? L.deletingNow : L.confirm}
          </button>
        </div>
      </div>
      <style>{tdelStyles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@500;700&family=Cairo:wght@400;600;700;800&display=swap');
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

  .te-page { --font-head:'Noto Kufi Arabic','Cairo',sans-serif; display:flex; flex-direction:column; gap:18px; font-family:'Cairo',sans-serif; color:#1A1A1A; }
  .te-hero {
    display:grid; grid-template-columns: minmax(0,1fr) auto; gap:22px; align-items:end;
    padding:28px 30px; border-radius:24px; overflow:hidden; position:relative;
    background: radial-gradient(circle at 85% -30%, rgba(184,160,130,.22), transparent 44%), radial-gradient(circle at 10% 120%, rgba(107,30,45,.55), transparent 46%), linear-gradient(140deg,#32101A 0%,#4A0E1C 55%,#5B1526 100%);
    border:1px solid rgba(184,160,130,.38); color:#FFFBF5;
    box-shadow: 0 22px 55px rgba(50,16,26,.25), inset 0 1px 0 rgba(217,201,176,.12);
  }
  .te-hero:before { content:""; position:absolute; top:0; inset-inline:28px; height:1.5px; background:linear-gradient(90deg,transparent,rgba(217,201,176,.55) 30%,rgba(217,201,176,.55) 70%,transparent); }
  .te-hero-star { position:absolute; inset-inline-end:-70px; top:50%; transform:translateY(-50%); opacity:.14; pointer-events:none; }
  .te-eyebrow { margin:0 0 6px; display:flex; align-items:center; gap:8px; color:#D9C9B0; font-size:10.5px; font-weight:700; letter-spacing:.22em; text-transform:uppercase; }
  .te-hero h1 { margin:0; font-family:var(--font-head); font-size:27px; font-weight:700; color:#FFFBF5; line-height:1.4; }
  .te-hero p { max-width:620px; margin:8px 0 0; color:rgba(239,234,224,.72); font-size:13.5px; line-height:1.9; font-weight:400; }
  .te-hero-metrics { display:grid; grid-template-columns:repeat(4, minmax(74px,1fr)); gap:10px; position:relative; z-index:1; }
  .te-metric { padding:12px 14px; border-radius:16px; background:rgba(50,16,26,.45); border:1px solid rgba(184,160,130,.30); backdrop-filter:blur(10px); min-width:78px; box-shadow:inset 0 1px 0 rgba(217,201,176,.10); }
  .te-metric strong { display:block; color:#D9C9B0; font-family:var(--font-head); font-size:22px; line-height:1.2; font-weight:700; }
  .te-metric span { display:block; margin-top:6px; color:rgba(239,234,224,.68); font-size:11px; font-weight:600; }

  .te-toolbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .te-toolbar input { flex:1; min-width:260px; height:48px; border-radius:16px; border:1px solid rgba(184,160,130,.22); background:#FFFBF5; padding:0 16px; font:700 13px 'Cairo',sans-serif; color:#1A1A1A; outline:none; transition:border-color .18s, box-shadow .18s; }
  .te-toolbar input:focus { border-color:rgba(184,160,130,.55); box-shadow:0 0 0 4px rgba(184,160,130,.10); }
  .te-toolbar a { height:48px; display:inline-flex; align-items:center; justify-content:center; padding:0 18px; border-radius:16px; background:linear-gradient(180deg,#5B1526,#32101A); border:1px solid rgba(184,160,130,.35); color:#D9C9B0; font-size:12px; font-weight:700; text-decoration:none; transition:box-shadow .18s ease, transform .18s ease; }
  .te-toolbar a:hover { box-shadow:0 6px 20px rgba(184,160,130,.25); transform:translateY(-1px); }
  .te-error { padding:12px 14px; border-radius:14px; color:#6B1E2D; background:rgba(107,30,45,.07); border:1px solid rgba(107,30,45,.18); font-size:13px; font-weight:800; }
  .te-empty { padding:60px; text-align:center; border-radius:22px; background:#FFFBF5; border:1px solid rgba(184,160,130,.16); color:#796A62; font-weight:800; }

  .te-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
  .te-card {
    position:relative; overflow:hidden;
    display:flex; flex-direction:column; gap:14px; padding:20px;
    border-radius:24px; background:linear-gradient(180deg,#FFFBF5,#FBF8F1);
    border:1px solid rgba(184,160,130,.20);
    box-shadow:0 14px 34px rgba(50,16,26,.06);
    animation:fadeUp .35s ease both;
    transition:transform .22s cubic-bezier(.22,1,.36,1), border-color .22s ease, box-shadow .22s ease;
  }
  .te-card:hover { transform:translateY(-3px); border-color:rgba(184,160,130,.42); box-shadow:0 20px 44px rgba(50,16,26,.11); }
  .te-card:before { content:""; position:absolute; top:0; inset-inline:20px; height:2px; background:linear-gradient(90deg,transparent,#B8A082,transparent); }
  .te-card-watermark { position:absolute; inset-inline-end:-24px; bottom:-24px; pointer-events:none; z-index:0; }

  .te-delete-btn {
    position:absolute; top:14px; inset-inline-end:14px; z-index:2;
    display:flex; align-items:center; justify-content:center;
    width:32px; height:32px; border-radius:10px;
    background:rgba(255,255,255,.7); border:1px solid rgba(184,160,130,.22);
    color:#8F765B; cursor:pointer; transition:all .18s ease;
  }
  .te-delete-btn:hover { background:rgba(107,30,45,.08); border-color:rgba(107,30,45,.30); color:#6B1E2D; transform:scale(1.06); }

  .te-card-top { position:relative; z-index:1; display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:14px; align-items:center; }
  .te-avatar { width:68px; height:68px; border-radius:18px; overflow:hidden; background:linear-gradient(150deg,#4A0E1C,#32101A); color:#D9C9B0; display:flex; align-items:center; justify-content:center; font-family:var(--font-head); font-size:21px; font-weight:700; border:1px solid rgba(184,160,130,.30); box-shadow:0 6px 18px rgba(50,16,26,.18), inset 0 1px 0 rgba(217,201,176,.14); flex-shrink:0; }
  .te-avatar img { width:100%; height:100%; object-fit:cover; }
  .te-identity { min-width:0; }
  .te-name-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .te-name-row h2 { margin:0; font-family:var(--font-head); font-size:16.5px; font-weight:700; color:#1A1A1A; }
  .te-badge-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:6px; }
  .te-contact { display:flex; gap:12px; flex-wrap:wrap; margin-top:8px; }
  .te-contact span { display:inline-flex; align-items:center; gap:5px; color:#796A62; font-size:11.5px; font-weight:700; }
  .te-contact svg { color:#B8A082; flex-shrink:0; }

  .te-status, .te-pill { display:inline-flex; align-items:center; gap:5px; border-radius:999px; padding:3px 10px; font-size:10.5px; font-weight:800; border:1px solid rgba(184,160,130,.18); background:rgba(184,160,130,.08); color:#8F765B; }
  .te-status-dot { width:6px; height:6px; border-radius:50%; background:currentColor; flex-shrink:0; }
  .te-status.good, .te-pill.good { color:#1B5E20; background:rgba(27,94,32,.09); border-color:rgba(27,94,32,.18); }
  .te-status.bad, .te-pill.bad { color:#6B1E2D; background:rgba(107,30,45,.08); border-color:rgba(107,30,45,.18); }
  .te-pill.warn { color:#8F765B; background:rgba(184,160,130,.12); border-color:rgba(184,160,130,.22); }

  .te-toggle { position:relative; z-index:1; border:1px solid; border-radius:14px; min-width:80px; height:38px; padding:0 14px; font:800 11px 'Cairo',sans-serif; cursor:pointer; transition:.18s ease; }
  .te-toggle.off { color:#6B1E2D; background:rgba(107,30,45,.06); border-color:rgba(107,30,45,.18); }
  .te-toggle.off:hover:not(:disabled) { background:rgba(107,30,45,.11); }
  .te-toggle.on { color:#1B5E20; background:rgba(27,94,32,.08); border-color:rgba(27,94,32,.20); }
  .te-toggle.on:hover:not(:disabled) { background:rgba(27,94,32,.14); }
  .te-toggle:disabled { opacity:.55; cursor:not-allowed; }

  .te-sections { position:relative; z-index:1; display:grid; grid-template-columns:1fr; gap:10px; }
  .te-info { border:1px solid rgba(184,160,130,.14); border-radius:18px; padding:14px; background:rgba(255,255,255,.55); }
  .te-info h3 { display:flex; align-items:center; gap:7px; margin:0 0 11px; color:#655B53; font-family:var(--font-head); font-size:12px; font-weight:700; }
  .te-info h3 svg { color:#B8A082; }

  .te-info-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px 14px; }
  .te-info-item { display:flex; flex-direction:column; gap:3px; padding-bottom:8px; border-bottom:1px dashed rgba(184,160,130,.18); min-width:0; }
  .te-info-item span { font-size:10px; font-weight:700; letter-spacing:.04em; color:#8F765B; }
  .te-info-item strong { font-size:12.5px; font-weight:700; color:#1A1A1A; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

  .te-workshop-list { display:flex; flex-direction:column; gap:8px; }
  .te-workshop-item { display:flex; align-items:center; gap:9px; padding:10px 12px; border-radius:13px; background:#F7F3EB; border:1px solid rgba(184,160,130,.13); }
  .te-workshop-item.live { background:linear-gradient(90deg,rgba(27,94,32,.08),rgba(27,94,32,.03)); border-color:rgba(27,94,32,.22); }
  .te-live-dot { width:8px; height:8px; border-radius:50%; background:#1B5E20; flex-shrink:0; box-shadow:0 0 0 3px rgba(27,94,32,.18); animation:te-livepulse 1.8s ease-in-out infinite; }
  @keyframes te-livepulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.55; transform:scale(1.25); } }
  .te-workshop-text { display:flex; flex-direction:column; gap:2px; min-width:0; }
  .te-workshop-text strong { font-size:12.5px; font-weight:700; color:#1A1A1A; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .te-workshop-text span { font-size:11px; font-weight:700; color:#8F765B; }
  .te-workshop-item.live .te-workshop-text span { color:#1B5E20; }

  .te-chip-list { display:flex; flex-direction:column; gap:8px; }
  .te-chip-list.compact { flex-direction:row; flex-wrap:wrap; }
  .te-class-chip { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:10px; align-items:center; padding:10px 12px; border-radius:14px; background:#F7F3EB; border:1px solid rgba(184,160,130,.13); text-decoration:none; color:#1A1A1A; transition:border-color .18s ease; }
  .te-class-chip:hover { border-color:rgba(184,160,130,.35); }
  .te-class-chip strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12.5px; }
  .te-class-chip span { color:#796A62; font-size:11px; font-weight:800; white-space:nowrap; }
  .te-group-chip { display:inline-flex; padding:8px 11px; border-radius:999px; text-decoration:none; color:#8F765B; background:rgba(184,160,130,.12); border:1px solid rgba(184,160,130,.20); font-size:11.5px; font-weight:800; transition:border-color .18s ease; }
  .te-group-chip:hover { border-color:rgba(184,160,130,.45); }
  .te-muted { margin:0; color:#796A62; font-size:12px; font-weight:700; }

  .te-card-footer { position:relative; z-index:1; display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:auto; padding-top:12px; border-top:1px dashed rgba(184,160,130,.22); color:#796A62; font-size:11.5px; font-weight:700; }
  .te-card-footer strong { color:#1A1A1A; }

  @media(max-width:1100px){ .te-grid{grid-template-columns:1fr} .te-hero{grid-template-columns:1fr} .te-hero-metrics{grid-template-columns:repeat(4,1fr)} }
  @media(max-width:700px){
    .te-hero{padding:20px;border-radius:20px}.te-hero h1{font-size:24px}.te-hero-metrics{grid-template-columns:repeat(2,1fr)}
    .te-toolbar input{min-width:100%}.te-toolbar a{flex:1}.te-card{padding:16px}.te-card-top{grid-template-columns:auto minmax(0,1fr)}.te-toggle{grid-column:1/-1;width:100%}
    .te-class-chip,.te-info-grid{grid-template-columns:1fr}.te-card-footer{gap:7px}
  }
`;

const tdelStyles = `
  @keyframes tdel-overlay-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes tdel-card-in { from { opacity: 0; transform: scale(.94) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  @keyframes tdel-spin { to { transform: rotate(360deg); } }

  .tdel-overlay {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center; padding: 18px;
    background: rgba(26,17,14,0.58); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    animation: tdel-overlay-in 0.18s ease; font-family: 'Cairo','Noto Kufi Arabic',sans-serif;
  }
  .tdel-card {
    max-width: 460px; width: 100%; max-height: 88vh; overflow-y: auto;
    background: linear-gradient(165deg, #FFFBF5 0%, #F7F3EB 100%);
    border: 1.5px solid rgba(107,30,45,0.28); border-radius: 22px;
    padding: 28px 26px 22px; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    box-shadow: 0 30px 76px rgba(50,16,26,0.30), inset 0 1px 0 rgba(255,255,255,0.6);
    animation: tdel-card-in 0.22s cubic-bezier(.22,1.4,.36,1);
  }
  .tdel-icon {
    width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    background: rgba(107,30,45,0.09); color: #6B1E2D; margin-bottom: 4px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
  }
  .tdel-title { font-family: 'Noto Kufi Arabic','Cairo',sans-serif; font-size: 19px; font-weight: 700; color: #6B1E2D; margin: 0; }

  .tdel-teacher { display: flex; align-items: center; gap: 12px; width: 100%; margin-top: 10px; padding: 12px 14px; border-radius: 16px; background: rgba(255,255,255,.55); border: 1px solid rgba(184,160,130,.22); text-align: start; }
  .tdel-teacher-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .tdel-teacher-text strong { font-size: 13.5px; font-weight: 700; color: #1A1A1A; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tdel-teacher-text span { font-size: 11.5px; color: #796A62; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .tdel-warn { font-size: 13.5px; font-weight: 600; color: #5A4A30; line-height: 1.75; margin: 10px 0 0; }

  .tdel-impact { width: 100%; display: flex; flex-direction: column; gap: 12px; margin-top: 10px; text-align: start; }
  .tdel-impact-block { display: flex; flex-direction: column; gap: 7px; }
  .tdel-impact-label { font-size: 11px; font-weight: 800; color: #6B1E2D; letter-spacing: .02em; }
  .tdel-impact-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .tdel-chip { display: inline-flex; padding: 6px 11px; border-radius: 999px; background: rgba(107,30,45,0.06); border: 1px solid rgba(107,30,45,0.18); color: #6B1E2D; font-size: 11.5px; font-weight: 700; }
  .tdel-noimpact { margin: 10px 0 0; font-size: 12.5px; font-weight: 600; color: #796A62; }

  .tdel-error { width: 100%; margin: 10px 0 0; padding: 10px 12px; border-radius: 12px; background: rgba(107,30,45,.08); border: 1px solid rgba(107,30,45,.22); color: #6B1E2D; font-size: 12.5px; font-weight: 700; }

  .tdel-actions { display: flex; gap: 10px; margin-top: 18px; width: 100%; }
  .tdel-btn-cancel, .tdel-btn-confirm {
    flex: 1; min-height: 46px; display: flex; align-items: center; justify-content: center; gap: 7px;
    padding: 11px 18px; border-radius: 12px; font-family: inherit; font-size: 13.5px; font-weight: 800;
    cursor: pointer; transition: all 0.18s cubic-bezier(.22,1,.36,1); border: 1.5px solid;
  }
  .tdel-btn-cancel { background: rgba(255,255,255,0.7); border-color: rgba(184,160,130,0.32); color: #5A4A30; }
  .tdel-btn-cancel:hover:not(:disabled) { background: #FFFBF5; border-color: #B8A082; color: #4A0E1C; }
  .tdel-btn-confirm { background: linear-gradient(135deg,#8E2424,#6B1E2D); border-color: rgba(255,200,170,0.45); color: #FFE9D6; box-shadow: 0 6px 18px rgba(107,30,45,0.32); }
  .tdel-btn-confirm:hover:not(:disabled) { background: linear-gradient(135deg,#9C2A2A,#882323); transform: translateY(-1px); box-shadow: 0 10px 26px rgba(107,30,45,0.42); }
  .tdel-btn-cancel:disabled, .tdel-btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
  .tdel-spin { width: 13px; height: 13px; border: 2px solid rgba(255,233,214,0.35); border-top-color: #FFE9D6; border-radius: 50%; animation: tdel-spin 0.7s linear infinite; }

  @media(max-width:420px){
    .tdel-card { padding: 22px 18px 18px; border-radius: 18px; }
    .tdel-title { font-size: 17px; }
    .tdel-actions { flex-direction: column-reverse; }
  }
`;
