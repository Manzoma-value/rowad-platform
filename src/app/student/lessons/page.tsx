"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import StudentConceptBanner from "@/components/StudentConceptBanner";

interface LessonListItem {
  id: string;
  title: string;
  description: string | null;
  is_graded: boolean;
  created_at: string;
  teacher_name: string;
  linked_quiz: { id: string; name: string } | null;
  content_count: number;
  question_count: number;
  attempt: { score: number | null; total: number | null; completed_at: string | null } | null;
}

const T = {
  ar: {
    title: "الدروس",
    sub: (n: number) => `${n} درس${n === 1 ? "" : "اً"} متاح${n === 1 ? "" : "ة"} في فصلك`,
    emptyTitle: "لا توجد دروس بعد",
    emptySub: "لم ينشر مدرسك أي دروس بعد. تحقق قريباً!",
    byTeacher: "بإشراف",
    blocks: "محتوى",
    questions: "أسئلة",
    graded: "مُقيَّم",
    practice: "تدريبي",
    completed: "مكتمل",
    score: "النتيجة",
    open: "افتح الدرس",
    review: "مراجعة",
  },
  sq: {
    title: "Mësimet",
    sub: (n: number) => `${n} mësim${n === 1 ? "" : "e"} në klasën tënde`,
    emptyTitle: "Ende nuk ka mësime",
    emptySub: "Mësuesi ende nuk ka publikuar mësime. Kontrollo më vonë!",
    byTeacher: "nga",
    blocks: "blloqe",
    questions: "pyetje",
    graded: "Me notë",
    practice: "Praktikë",
    completed: "I përfunduar",
    score: "Rezultati",
    open: "Hap mësimin",
    review: "Rishiko",
  },
} as const;

export default function StudentLessonsPage() {
  const { lang } = useLang();
  const t = T[lang === "sq" ? "sq" : "ar"];
  const dir = lang === "sq" ? "ltr" : "rtl";

  const [lessons, setLessons] = useState<LessonListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/lessons")
      .then((r) => r.json())
      .then((d) => setLessons(d.lessons ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="sll-page" dir={dir}>
        <style>{css}</style>
        <div className="sll-loading"><div className="sll-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="sll-page" dir={dir}>
      <style>{css}</style>
      <StudentConceptBanner />

      {/* Header */}
      <div className="sll-hd">
        <div className="sll-hd-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>
        <div>
          <h1 className="sll-title">{t.title}</h1>
          <p className="sll-sub">{t.sub(lessons.length)}</p>
        </div>
      </div>

      {/* Rule */}
      <div className="sll-rule">
        <div className="sll-rule-line" />
        <div className="sll-rule-diamond" />
        <div className="sll-rule-line" />
      </div>

      {/* Body */}
      {lessons.length === 0 ? (
        <div className="sll-empty">
          <div className="sll-empty-icon">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h2 className="sll-empty-title">{t.emptyTitle}</h2>
          <p className="sll-empty-sub">{t.emptySub}</p>
        </div>
      ) : (
        <div className="sll-grid">
          {lessons.map((lesson, i) => {
            const isDone = !!lesson.attempt?.completed_at;
            return (
              <Link
                key={lesson.id}
                href={`/student/lessons/${lesson.id}`}
                className={`sll-card${isDone ? " sll-card--done" : ""}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="sll-card-head">
                  <span className={`sll-chip sll-chip--${lesson.is_graded ? "gold" : "purple"}`}>
                    {lesson.is_graded ? "★" : "↻"} {lesson.is_graded ? t.graded : t.practice}
                  </span>
                  {isDone && (
                    <span className="sll-chip sll-chip--green">
                      ✓ {t.completed}
                      {lesson.attempt?.score !== null && lesson.attempt?.total !== null && (
                        <> · {lesson.attempt!.score}/{lesson.attempt!.total}</>
                      )}
                    </span>
                  )}
                </div>
                <h3 className="sll-card-title">{lesson.title}</h3>
                {lesson.description && <p className="sll-card-desc">{lesson.description}</p>}
                <div className="sll-card-meta">
                  <span className="sll-card-by">{t.byTeacher} <strong>{lesson.teacher_name}</strong></span>
                </div>
                <div className="sll-card-stats">
                  <span className="sll-stat">📖 {lesson.content_count} {t.blocks}</span>
                  {lesson.question_count > 0 && (
                    <span className="sll-stat">📝 {lesson.question_count} {t.questions}</span>
                  )}
                </div>
                <span className="sll-card-cta">{isDone ? t.review : t.open} →</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes sll-spin{to{transform:rotate(360deg)}}
@keyframes sll-fadeup{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

:root{
  --gold:#B8A082; --gold-deep:#B8A082; --gold-soft:#D9C9B0;
  --gold-pale:rgba(184,160,130,0.06);
  --gold-border:rgba(184,160,130,0.20);
  --black:#1A1A1A;
  --text:#1E1C18; --text2:#3A3020; --text3:#8A7860;
  --bg:#EFEAE0; --surface:#FFFFFF; --surface2:#FAFAF7;
  --border:rgba(26,26,26,0.07);
  --green:#1B5E20; --green-l:rgba(45,138,74,0.08);
  --purple:#6D3FB3; --purple-l:rgba(109,63,179,0.07);
  --font:'Cairo',sans-serif;
}

.sll-page{font-family:var(--font); display:flex; flex-direction:column; gap:20px; color:var(--text)}
.sll-loading{display:flex;justify-content:center;padding:80px 0}
.sll-spinner{width:36px;height:36px;border:3px solid rgba(184,160,130,0.15);border-top-color:var(--gold);border-radius:50%;animation:sll-spin .7s linear infinite}

/* Header */
.sll-hd{display:flex;align-items:center;gap:14px;animation:sll-fadeup .35s ease both}
.sll-hd-icon{
  width:50px;height:50px;border-radius:14px;flex-shrink:0;
  background:linear-gradient(135deg, var(--gold-soft), var(--gold-deep));
  color:var(--black); display:flex; align-items:center; justify-content:center;
  box-shadow:0 4px 14px rgba(184,160,130,0.3);
}
.sll-title{font-size:24px;font-weight:900;color:var(--black);letter-spacing:-0.3px}
.sll-sub{font-size:12.5px;color:var(--text3);margin-top:3px;font-weight:500}

/* Rule */
.sll-rule{display:flex;align-items:center;gap:10px}
.sll-rule-line{flex:1;height:1px;background:var(--border)}
.sll-rule-diamond{width:5px;height:5px;background:var(--gold);transform:rotate(45deg);opacity:0.5;flex-shrink:0}

/* Empty */
.sll-empty{
  background:var(--surface); border:1px solid var(--border); border-radius:20px;
  padding:64px 30px; text-align:center;
  display:flex; flex-direction:column; align-items:center; gap:12px;
}
.sll-empty-icon{
  width:74px;height:74px;border-radius:20px;
  background:var(--gold-pale);border:1px solid var(--gold-border);
  color:var(--gold-deep); display:flex; align-items:center; justify-content:center;
}
.sll-empty-title{font-size:18px;font-weight:800;color:var(--black)}
.sll-empty-sub{font-size:13px;color:var(--text3);max-width:320px;line-height:1.7}

/* Grid */
.sll-grid{
  display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));
  gap:14px;
}

/* Card */
.sll-card{
  background:var(--surface); border:1px solid var(--border); border-radius:16px;
  padding:18px; display:flex; flex-direction:column; gap:10px;
  text-decoration:none; color:inherit;
  transition:all .22s cubic-bezier(0.22,1,0.36,1);
  position:relative; overflow:hidden;
  animation:sll-fadeup .4s ease both;
  box-shadow:0 1px 3px rgba(0,0,0,0.04);
}
.sll-card:hover{
  transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,0.08);
  border-color:var(--gold-border);
}
.sll-card::before{
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  background:linear-gradient(90deg, var(--gold), var(--gold-deep));
  opacity:0; transition:opacity .22s;
}
.sll-card:hover::before{opacity:1}
.sll-card--done{background:linear-gradient(180deg, rgba(45,138,74,0.03), var(--surface))}

.sll-card-head{display:flex;gap:6px;flex-wrap:wrap}
.sll-chip{
  display:inline-flex; align-items:center; gap:4px;
  font-size:10.5px; font-weight:800; padding:4px 10px; border-radius:100px;
  letter-spacing:.02em;
}
.sll-chip--gold{background:var(--gold-pale); color:#8F765B; border:1px solid var(--gold-border)}
.sll-chip--purple{background:var(--purple-l); color:var(--purple); border:1px solid rgba(109,63,179,0.18)}
.sll-chip--green{background:var(--green-l); color:var(--green); border:1px solid rgba(45,138,74,0.2)}

.sll-card-title{font-size:15.5px;font-weight:800;color:var(--black);line-height:1.4}
.sll-card-desc{
  font-size:12.5px;color:var(--text3);line-height:1.55;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}
.sll-card-meta{font-size:11.5px;color:var(--text3);font-weight:500}
.sll-card-by strong{color:var(--text2); font-weight:700}

.sll-card-stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:auto;padding-top:4px}
.sll-stat{font-size:11px;color:var(--text2);font-weight:600}

.sll-card-cta{
  font-size:12px; color:var(--gold-deep); font-weight:800;
  align-self:flex-end; padding-top:6px;
  border-top:1px dashed var(--border);
  width:100%; text-align:end;
}

@media (max-width:500px){
  .sll-grid{grid-template-columns:1fr; gap:10px}
  .sll-card{padding:16px}
  .sll-title{font-size:21px}
}
`;
