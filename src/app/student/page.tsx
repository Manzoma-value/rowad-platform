"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { t } from "@/lib/translations";
import MandalaLoader from "@/components/MandalaLoader";
import StudentConceptBanner from "@/components/StudentConceptBanner";
import { cachedFetch } from "@/lib/api-cache";

type Announcement = {
  id: string;
  content: string;
  created_at: string;
  teacher: { profile: { full_name: string } };
};

type StudentData = {
  profile: { full_name: string };
  school: { name: string; name_alt?: string | null } | null;
  onboarding_status?: string;
  class: {
    id: string;
    name: string;
    teacher: { profile: { full_name: string } } | null;
    students: { id: string; profile: { full_name: string } }[];
  } | null;
};

export default function StudentPage() {
  const { lang } = useLang();
  const tr = t[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [data, setData] = useState<StudentData | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const labels = {
    learning: lang === "ar" ? "مساحتي التعليمية" : lang === "sq" ? "Hapësira ime" : "My learning space",
    subtitle: lang === "ar" ? "كل ما تحتاجه اليوم: دروسك، مجتمعك، زملاؤك، وإعلانات معلمك." : lang === "sq" ? "Gjithçka për sot: mësimet, komuniteti, shokët dhe njoftimet." : "Everything for today: lessons, community, classmates and teacher announcements.",
    overview: lang === "ar" ? "نظرة سريعة" : lang === "sq" ? "Pamje e shpejtë" : "Quick overview",
    teacher: lang === "ar" ? "المعلم" : lang === "sq" ? "Mësuesi" : "Teacher",
    classmates: tr.classmates,
    announcements: tr.announcements,
    community: lang === "ar" ? "المجتمع" : lang === "sq" ? "Komuniteti" : "Community",
    continue: lang === "ar" ? "متابعة" : lang === "sq" ? "Vazhdo" : "Continue",
    status: lang === "ar" ? "الحالة" : lang === "sq" ? "Statusi" : "Status",
    noTeacher: lang === "ar" ? "لم يحدد بعد" : lang === "sq" ? "Ende pa mësues" : "Not assigned yet",
    latest: lang === "ar" ? "أحدث الإعلانات" : lang === "sq" ? "Njoftimet e fundit" : "Latest announcements",
    actions: lang === "ar" ? "أين أذهب الآن؟" : lang === "sq" ? "Ku të shkoj tani?" : "Where to go next?",
  };

  useEffect(() => {
    cachedFetch<StudentData>("/api/student", 60_000)
      .then(async (student) => {
        setData(student);
        if (student.class) {
          const ann = await cachedFetch<Announcement[]>(`/api/student/announcements?classId=${student.class.id}`, 30_000);
          setAnnouncements(Array.isArray(ann) ? ann : []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const initials = useMemo(() => {
    const name = data?.profile?.full_name ?? "طالب";
    return name.split(" ").map((word) => word[0]).slice(0, 2).join("");
  }, [data?.profile?.full_name]);

  if (loading) return <MandalaLoader label={tr.loading} />;

  const classmatesCount = Math.max((data?.class?.students.length ?? 0) - 1, 0);
  const schoolName = lang === "ar" ? data?.school?.name : data?.school?.name_alt || data?.school?.name;

  const overview = [
    { label: tr.myClass, value: data?.class?.name ?? tr.noClass },
    { label: labels.teacher, value: data?.class?.teacher?.profile.full_name ?? labels.noTeacher },
    { label: labels.classmates, value: classmatesCount.toString() },
    { label: labels.announcements, value: announcements.length.toString() },
  ];

  const actions = [
    { href: "/student/roadmap", title: tr.questionBank, sub: tr.questionBankSub },
    { href: "/student/quizzes", title: tr.quizzes, sub: tr.quizzesActionSub },
    { href: "/student/classes", title: tr.myClass, sub: tr.myClassActionSub },
    { href: "/student/hub", title: labels.community, sub: lang === "ar" ? "شارك وتابع مجتمع المدرسة." : lang === "sq" ? "Merr pjesë në komunitet." : "Join the school community." },
  ];

  return (
    <div className="sd-shell" dir={dir}>
      <main className="sd-main">
        <StudentConceptBanner />

        <section className="sd-hero">
          <div className="sd-hero-copy">
            <span>{labels.learning}</span>
            <h1>{tr.welcome}، {data?.profile?.full_name}</h1>
            <p>{labels.subtitle}</p>
            <div className="sd-hero-tags">
              {schoolName && <em>{schoolName}</em>}
              <em>{labels.status}: {(data?.onboarding_status ?? "ACTIVE").replaceAll("_", " ")}</em>
            </div>
          </div>
          <div className="sd-avatar">{initials}</div>
        </section>

        {!data?.class ? (
          <section className="sd-empty-state">
            <div className="sd-empty-icon">◇</div>
            <h2>{tr.noClass}</h2>
            <p>{tr.noClassContact}</p>
          </section>
        ) : (
          <>
            <section className="sd-overview">
              <div className="sd-section-title"><h2>{labels.overview}</h2></div>
              <div className="sd-overview-grid">
                {overview.map((item) => (
                  <div key={item.label} className="sd-stat">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="sd-grid">
              <article className="sd-card sd-ann-card">
                <div className="sd-card-head">
                  <strong>{labels.latest}</strong>
                  <span>{announcements.length}</span>
                </div>
                <div className="sd-ann-list">
                  {announcements.length === 0 ? (
                    <div className="sd-void"><p>{tr.noAnnouncements}</p></div>
                  ) : announcements.slice(0, 5).map((announcement, index) => (
                    <div key={announcement.id} className="sd-ann-item" style={{ animationDelay: `${index * 45}ms` }}>
                      <p>{announcement.content}</p>
                      <div>
                        <span>{announcement.teacher.profile.full_name}</span>
                        <span>{new Date(announcement.created_at).toLocaleDateString(lang === "ar" ? "ar-SA-u-nu-latn" : "sq-AL", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="sd-card sd-class-card">
                <div className="sd-card-head">
                  <strong>{labels.classmates}</strong>
                  <span>{data.class.students.length}</span>
                </div>
                <div className="sd-roster">
                  {data.class.students.slice(0, 10).map((student, index) => {
                    const isMe = student.profile.full_name === data.profile.full_name;
                    return (
                      <div key={student.id} className={`sd-roster-row ${isMe ? "is-me" : ""}`} style={{ animationDelay: `${index * 35}ms` }}>
                        <div>{student.profile.full_name.charAt(0)}</div>
                        <span>{student.profile.full_name}</span>
                        {isMe && <em>{tr.youBadge}</em>}
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>
          </>
        )}

        <section className="sd-actions-wrap">
          <div className="sd-section-title"><h2>{labels.actions}</h2></div>
          <div className="sd-actions">
            {actions.map((action, index) => (
              <Link key={action.href} href={action.href} className="sd-action" style={{ animationDelay: `${index * 55}ms` }}>
                <div>
                  <strong>{action.title}</strong>
                  <span>{action.sub}</span>
                </div>
                <em>{labels.continue}</em>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
  @keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  .sd-shell{min-height:100%;width:100%;background:#EFEAE0;font-family:'Cairo',Tajawal,sans-serif;color:#1A1A1A}.sd-main{padding:26px 22px;display:flex;flex-direction:column;gap:18px;width:100%;max-width:1220px;margin-inline:auto}.sd-hero{position:relative;overflow:hidden;border-radius:28px;padding:30px;display:flex;justify-content:space-between;gap:22px;align-items:center;background:radial-gradient(circle at 18% 15%,rgba(184,160,130,.20),transparent 30%),linear-gradient(135deg,#1A1A1A,#1A1A1A 66%,#6B1E2D);border:1px solid rgba(184,160,130,.24);box-shadow:0 18px 45px rgba(26,26,26,.13);animation:rise .35s ease both}.sd-hero:after{content:"";position:absolute;inset-inline-end:-110px;top:-120px;width:330px;height:330px;border-radius:999px;border:1px solid rgba(184,160,130,.14);box-shadow:inset 0 0 80px rgba(184,160,130,.08)}.sd-hero-copy{position:relative;z-index:1}.sd-hero-copy>span{display:block;color:#D9C9B0;font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.sd-hero h1{margin:7px 0 8px;color:#fff;font-size:30px;font-weight:900;letter-spacing:-.5px}.sd-hero p{max-width:680px;margin:0;color:rgba(255,255,255,.72);font-size:13.5px;line-height:1.8}.sd-hero-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}.sd-hero-tags em{font-style:normal;color:#D9C9B0;background:rgba(184,160,130,.10);border:1px solid rgba(184,160,130,.20);border-radius:999px;padding:5px 11px;font-size:11px;font-weight:900}.sd-avatar{position:relative;z-index:1;width:78px;height:78px;border-radius:24px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.07);border:1px solid rgba(184,160,130,.32);color:#B8A082;font-size:24px;font-weight:900;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
  .sd-section-title h2{margin:0;font-size:17px;font-weight:900}.sd-overview,.sd-actions-wrap{display:flex;flex-direction:column;gap:10px}.sd-overview-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.sd-stat{min-height:112px;border-radius:22px;padding:17px;background:#FFFBF5;border:1px solid rgba(184,160,130,.16);box-shadow:0 10px 28px rgba(26,26,26,.045)}.sd-stat span{display:block;color:#796A62;font-size:11.5px;font-weight:900}.sd-stat strong{display:block;margin-top:15px;font-size:21px;font-weight:900;color:#1A1A1A;line-height:1.25;word-break:break-word}.sd-grid{display:grid;grid-template-columns:1.35fr .85fr;gap:14px}.sd-card{border-radius:24px;background:#FFFBF5;border:1px solid rgba(184,160,130,.16);box-shadow:0 10px 28px rgba(26,26,26,.045);overflow:hidden;animation:rise .35s ease both}.sd-card-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:15px 18px;border-bottom:1px solid rgba(184,160,130,.10);background:rgba(184,160,130,.035)}.sd-card-head strong{font-size:14px;font-weight:900}.sd-card-head span{border-radius:999px;padding:3px 10px;background:rgba(184,160,130,.12);color:#8F765B;font-size:11px;font-weight:900}.sd-ann-list{display:flex;flex-direction:column;gap:0;padding:8px 12px;max-height:390px;overflow:auto}.sd-ann-item{padding:14px 8px;border-bottom:1px solid rgba(184,160,130,.08);animation:rise .3s ease both}.sd-ann-item:last-child{border-bottom:0}.sd-ann-item p{margin:0;color:#4A0E1C;font-size:13.5px;line-height:1.75}.sd-ann-item div{display:flex;justify-content:space-between;gap:12px;margin-top:8px;color:#8F765B;font-size:11px;font-weight:800}.sd-void{padding:36px;text-align:center;color:#796A62;font-size:13px;font-weight:800}.sd-roster{padding:10px;display:flex;flex-direction:column;gap:5px;max-height:390px;overflow:auto}.sd-roster-row{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:14px;animation:rise .25s ease both}.sd-roster-row:hover{background:rgba(184,160,130,.06)}.sd-roster-row.is-me{background:#1A1A1A;color:#fff}.sd-roster-row div{width:32px;height:32px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:rgba(184,160,130,.10);border:1px solid rgba(184,160,130,.18);color:#8F765B;font-weight:900}.sd-roster-row.is-me div{color:#B8A082}.sd-roster-row span{flex:1;font-size:12.5px;font-weight:800}.sd-roster-row em{font-style:normal;color:#D9C9B0;background:rgba(184,160,130,.12);border:1px solid rgba(184,160,130,.20);border-radius:999px;padding:2px 8px;font-size:10px;font-weight:900}
  .sd-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.sd-action{min-height:138px;display:flex;flex-direction:column;justify-content:space-between;gap:14px;padding:17px;border-radius:22px;background:linear-gradient(180deg,#FFFBF5,#F7F3EB);border:1px solid rgba(184,160,130,.16);box-shadow:0 10px 28px rgba(26,26,26,.045);text-decoration:none;color:#1A1A1A;transition:.2s ease;animation:rise .35s ease both}.sd-action:hover{transform:translateY(-3px);border-color:rgba(184,160,130,.42);box-shadow:0 16px 34px rgba(26,26,26,.075)}.sd-action strong{display:block;font-size:15px;font-weight:900}.sd-action span{display:block;margin-top:6px;color:#796A62;font-size:12px;line-height:1.65;font-weight:700}.sd-action em{align-self:flex-start;font-style:normal;background:#1A1A1A;color:#D9C9B0;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:900}.sd-empty-state{background:#FFFBF5;border:1px solid rgba(184,160,130,.15);border-radius:22px;padding:54px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;animation:rise .35s ease both}.sd-empty-icon{font-size:38px;color:rgba(184,160,130,.45)}.sd-empty-state h2{margin:0;font-size:18px;font-weight:900}.sd-empty-state p{margin:0;color:#796A62;font-size:13px;font-weight:700}
  @media(max-width:980px){.sd-overview-grid,.sd-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.sd-grid{grid-template-columns:1fr}.sd-hero{align-items:flex-start}.sd-avatar{width:62px;height:62px;border-radius:20px}}
  @media(max-width:600px){.sd-main{padding:16px;gap:14px}.sd-hero{padding:20px;border-radius:22px}.sd-hero h1{font-size:23px}.sd-hero p{font-size:12.5px}.sd-avatar{display:none}.sd-overview-grid,.sd-actions{grid-template-columns:1fr}.sd-stat,.sd-action{min-height:auto}.sd-card,.sd-stat,.sd-action{border-radius:18px}.sd-empty-state{padding:34px 18px}}
`;
