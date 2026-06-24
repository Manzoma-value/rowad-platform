"use client";

// Compact "your current concept" banner — drop into the top of any student
// dashboard page. Fetches /api/student/current-concept and surfaces:
//   • current concept name + stage
//   • overall progress (X of Y concepts done)
//   • per-requirement breakdown for the current concept (admin questions,
//     teacher lessons, teacher quizzes)
//
// Renders nothing if the student has no school, no roadmap, or already
// finished every concept (in which case it shows a celebratory state).
import { useEffect, useState } from "react";
import { useLang } from "@/lib/language-context";

type Current = {
  module_id: string;
  title: string;
  description: string | null;
  stage_id: string;
  stage_title: string;
  stage_order: number;
  module_order: number;
  admin_questions_done: boolean;
  admin_total_questions: number;
  lessons_total: number;
  lessons_done: number;
  quizzes_total: number;
  quizzes_done: number;
  is_complete: boolean;
};
type State = {
  current: Current | null;
  completed_module_ids: string[];
  upcoming_module_ids: string[];
  total_modules: number;
  completed_count: number;
};

const UI = {
  ar: {
    youAreOn: "أنت الآن في",
    progress: "تقدّمك في الخريطة",
    of: "من",
    concepts: "مفهوم",
    admin: "أسئلة الخريطة",
    lessons: "دروس المعلم",
    quizzes: "اختبارات المعلم",
    done: "✓",
    finishedAllTitle: "أحسنت! 🎉",
    finishedAllBody: "أنهيت كل المفاهيم في الخريطة. تابع متابعة أنشطتك.",
    noRoadmap: "",
  },
  sq: {
    youAreOn: "Aktualisht je në",
    progress: "Përparimi yt në hartë",
    of: "nga",
    concepts: "koncepte",
    admin: "Pyetjet e hartës",
    lessons: "Mësimet e mësuesit",
    quizzes: "Kuizet e mësuesit",
    done: "✓",
    finishedAllTitle: "Bravo! 🎉",
    finishedAllBody: "Përfundove të gjitha konceptet në hartë. Vazhdo aktivitetet e tjera.",
    noRoadmap: "",
  },
} as const;

export default function StudentConceptBanner({
  compact = false,
}: { compact?: boolean }) {
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/current-concept", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d))
      .catch(() => setState(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !state || state.total_modules === 0) return null;

  const pct = state.total_modules > 0
    ? Math.round((state.completed_count / state.total_modules) * 100)
    : 0;

  if (!state.current) {
    return (
      <div className="scb scb--done" dir={dir}>
        <div className="scb-pat" />
        <div className="scb-inner">
          <h2 className="scb-title scb-title--done">{T.finishedAllTitle}</h2>
          <p className="scb-sub">{T.finishedAllBody}</p>
        </div>
        <BannerStyles />
      </div>
    );
  }

  const c = state.current;
  return (
    <div className={`scb${compact ? " scb--compact" : ""}`} dir={dir}>
      <div className="scb-pat" />
      <div className="scb-inner">
        <div className="scb-row1">
          <div className="scb-trail">
            <span className="scb-stage">{c.stage_title}</span>
            <span className="scb-sep">·</span>
            <span className="scb-mnum">#{c.module_order}</span>
          </div>
          <div className="scb-overall">
            <span className="scb-overall-pct">{pct}%</span>
            <span className="scb-overall-lbl">{state.completed_count} {T.of} {state.total_modules} {T.concepts}</span>
          </div>
        </div>

        <h2 className="scb-title">
          <span className="scb-prefix">{T.youAreOn}</span>
          <span className="scb-concept">{c.title}</span>
        </h2>

        {!compact && c.description && (
          <p className="scb-desc">{c.description}</p>
        )}

        <div className="scb-reqs">
          <Req
            label={T.admin}
            done={c.admin_questions_done ? 1 : 0}
            total={c.admin_total_questions > 0 ? 1 : 0}
          />
          <Req label={T.lessons} done={c.lessons_done} total={c.lessons_total} />
          <Req label={T.quizzes} done={c.quizzes_done} total={c.quizzes_total} />
        </div>

        <div className="scb-bar">
          <div className="scb-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <BannerStyles />
    </div>
  );
}

function Req({ label, done, total }: { label: string; done: number; total: number }) {
  const isDone = total > 0 && done >= total;
  const isEmpty = total === 0;
  return (
    <div className={`scb-req${isDone ? " is-done" : ""}${isEmpty ? " is-empty" : ""}`}>
      <span className="scb-req-num">{isEmpty ? "—" : `${done}/${total}`}</span>
      <span className="scb-req-lbl">{label}</span>
    </div>
  );
}

function BannerStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
      .scb {
        position: relative;
        background: linear-gradient(165deg, #1E2329 0%, #11151A 100%);
        color: #F5E5BC;
        border: 1px solid rgba(200,169,106,0.42);
        border-radius: 18px;
        padding: 22px 24px;
        margin-bottom: 22px;
        font-family: 'Cairo', 'Tajawal', sans-serif;
        overflow: hidden;
        box-shadow: 0 12px 36px rgba(8,11,12,0.18);
      }
      .scb--compact { padding: 16px 18px; }
      .scb--done { background: linear-gradient(165deg, #2D8A4A 0%, #1E5C2E 100%); color: #FFF; }
      .scb-pat {
        position: absolute; inset: 0;
        background:
          radial-gradient(ellipse at 80% 30%, rgba(229,185,60,0.15), transparent 55%),
          radial-gradient(ellipse at 20% 80%, rgba(229,185,60,0.08), transparent 50%);
        pointer-events: none;
      }
      .scb-inner { position: relative; z-index: 1; }
      .scb-row1 { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 8px; }
      .scb-trail { display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 800; color: rgba(232,194,127,0.85); letter-spacing: 0.04em; text-transform: uppercase; }
      .scb-stage { background: rgba(229,185,60,0.16); padding: 3px 11px; border-radius: 99px; }
      .scb-mnum { color: rgba(232,194,127,0.7); }
      .scb-sep { opacity: 0.4; }
      .scb-overall { display: flex; align-items: baseline; gap: 8px; }
      .scb-overall-pct { font-size: 22px; font-weight: 900; color: #E5B93C; }
      .scb-overall-lbl { font-size: 11.5px; color: rgba(232,194,127,0.7); font-weight: 600; }
      .scb-title { font-size: 22px; font-weight: 900; margin: 4px 0 8px; line-height: 1.35; display: flex; flex-direction: column; gap: 4px; }
      .scb--compact .scb-title { font-size: 17px; }
      .scb-prefix { font-size: 12px; font-weight: 700; color: rgba(232,194,127,0.65); letter-spacing: 0.04em; text-transform: uppercase; }
      .scb-concept { color: #F5E5BC; }
      .scb-title--done { font-size: 22px; }
      .scb-desc { font-size: 13.5px; color: rgba(245,229,188,0.78); margin: 0 0 14px; line-height: 1.85; max-width: 700px; }
      .scb-sub { font-size: 14px; color: rgba(255,255,255,0.88); margin: 4px 0 0; line-height: 1.85; }
      .scb-reqs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px; }
      .scb-req {
        background: rgba(245,229,188,0.06);
        border: 1px solid rgba(200,169,106,0.22);
        border-radius: 11px; padding: 10px 12px;
        display: flex; flex-direction: column; gap: 3px;
        transition: all 0.15s;
      }
      .scb-req.is-done { background: rgba(45,138,74,0.20); border-color: rgba(45,138,74,0.5); }
      .scb-req.is-empty { opacity: 0.5; }
      .scb-req-num { font-size: 17px; font-weight: 900; color: #E5B93C; }
      .scb-req.is-done .scb-req-num { color: #6FCB87; }
      .scb-req-lbl { font-size: 11px; font-weight: 700; color: rgba(232,194,127,0.65); letter-spacing: 0.04em; text-transform: uppercase; }
      .scb-bar {
        height: 6px; background: rgba(245,229,188,0.10); border-radius: 99px;
        overflow: hidden; margin-top: 14px;
      }
      .scb-bar-fill {
        height: 100%; background: linear-gradient(90deg,#D8C28A,#E5B93C);
        border-radius: 99px; transition: width 0.4s ease;
      }
      @media (max-width: 520px) {
        .scb-reqs { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}
