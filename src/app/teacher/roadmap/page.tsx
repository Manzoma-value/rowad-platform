"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import TeacherLoadError from "@/components/TeacherLoadError";

type ReviewStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

type RoadmapModule = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  _count: { contents: number; questions: number };
  lessons: { id: string; title: string; review_status: ReviewStatus; is_legacy: boolean }[];
  quizzes: { id: string; name: string; review_status: ReviewStatus; is_legacy: boolean }[];
};

type RoadmapStage = {
  id: string;
  title: string;
  order: number;
  modules: RoadmapModule[];
};

type Roadmap = {
  id: string;
  title: string;
  stages: RoadmapStage[];
};

const UI = {
  ar: {
    title: "الخريطة التعليمية",
    sub: "تصفّح المسار الكامل من المراحل إلى المفاهيم. ادخل على أي مفهوم لتعرض محتواه ولتضيف درساً أو اختباراً مرتبطاً به.",
    stage: "مرحلة",
    module: "مفهوم",
    open: "افتح المفهوم",
    counts: (c: number, q: number) => `${c} محتوى · ${q} سؤال`,
    yourLessons: (n: number) => `${n} درس لديك`,
    yourQuizzes: (n: number) => `${n} اختبار لديك`,
    empty: "لم يتم إعداد الخريطة بعد لمدرستك.",
    statusDRAFT: "مسودة",
    statusPENDING_REVIEW: "قيد المراجعة",
    statusAPPROVED: "معتمد",
    statusREJECTED: "مرفوض",
    legacyTag: "قديم",
  },
  sq: {
    title: "Harta Edukative",
    sub: "Shfleto të gjithë rrugëtimin nga fazat tek konceptet. Hap çdo koncept për të parë përmbajtjen dhe për të shtuar një mësim ose kuiz të lidhur me të.",
    stage: "Faza",
    module: "Koncepti",
    open: "Hap konceptin",
    counts: (c: number, q: number) => `${c} përmbajtje · ${q} pyetje`,
    yourLessons: (n: number) => `${n} mësime tuat`,
    yourQuizzes: (n: number) => `${n} kuize tuat`,
    empty: "Harta ende nuk është konfiguruar për shkollën tuaj.",
    statusDRAFT: "Draft",
    statusPENDING_REVIEW: "Në shqyrtim",
    statusAPPROVED: "Miratuar",
    statusREJECTED: "Refuzuar",
    legacyTag: "I vjetër",
  },
} as const;

export default function TeacherRoadmapPage() {
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadRoadmap = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    fetch("/api/teacher/roadmap", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setRoadmap(d?.roadmap ?? null))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(loadRoadmap);
    return () => cancelAnimationFrame(frame);
  }, [loadRoadmap]);

  if (loading) return <MandalaLoader />;
  if (loadError) return <TeacherLoadError onRetry={loadRoadmap} />;

  return (
    <div className="tr-page" dir={dir}>
      <header className="tr-hero">
        <h1 className="tr-title">{T.title}</h1>
        <p className="tr-sub">{T.sub}</p>
      </header>

      {!roadmap || roadmap.stages.length === 0 ? (
        <div className="tr-empty">{T.empty}</div>
      ) : (
        <div className="tr-stages">
          {roadmap.stages.map((stage) => (
            <section key={stage.id} className="tr-stage">
              <header className="tr-stage-head">
                <span className="tr-stage-badge">{T.stage} {stage.order}</span>
                <h2 className="tr-stage-title">{stage.title}</h2>
              </header>
              <div className="tr-modules">
                {stage.modules.map((m) => (
                  <Link
                    key={m.id}
                    href={`/teacher/roadmap/modules/${m.id}`}
                    className="tr-module"
                  >
                    <div className="tr-module-head">
                      <span className="tr-mod-badge">{T.module} {m.order}</span>
                      <h3 className="tr-mod-title">{m.title}</h3>
                    </div>
                    {m.description && <p className="tr-mod-desc">{m.description}</p>}
                    <div className="tr-mod-meta">
                      <span className="tr-mod-counts">{T.counts(m._count.contents, m._count.questions)}</span>
                    </div>
                    <div className="tr-mod-mine">
                      <span className="tr-mine-row">
                        <span className="tr-mine-num">{m.lessons.filter((l) => !l.is_legacy).length}</span>
                        <span className="tr-mine-lbl">{T.yourLessons(m.lessons.filter((l) => !l.is_legacy).length)}</span>
                      </span>
                      <span className="tr-mine-row">
                        <span className="tr-mine-num">{m.quizzes.filter((q) => !q.is_legacy).length}</span>
                        <span className="tr-mine-lbl">{T.yourQuizzes(m.quizzes.filter((q) => !q.is_legacy).length)}</span>
                      </span>
                    </div>
                    <div className="tr-mod-cta">
                      <span>{T.open} →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        .tr-page { font-family: 'Cairo', sans-serif; }
        .tr-hero { margin-bottom: 22px; }
        .tr-title { font-size: 24px; font-weight: 900; color: #32101A; margin: 0 0 6px; }
        .tr-sub { font-size: 13.5px; color: #655B53; max-width: 740px; line-height: 1.85; margin: 0; }
        .tr-empty { padding: 60px 20px; text-align: center; background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 14px; color: #8C8274; font-weight: 700; }
        .tr-stages { display: flex; flex-direction: column; gap: 26px; }
        .tr-stage { background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 16px; padding: 20px; }
        .tr-stage-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .tr-stage-badge { background: linear-gradient(180deg,#5B1526,#32101A); color: #B8A082; padding: 4px 12px; border-radius: 99px; font-size: 11.5px; font-weight: 800; letter-spacing: 0.04em; }
        .tr-stage-title { font-size: 18px; font-weight: 900; color: #32101A; margin: 0; }
        .tr-modules { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap: 14px; }
        .tr-module { display: flex; flex-direction: column; gap: 8px; padding: 16px; border: 1.5px solid rgba(107,30,45,0.30); border-radius: 14px; background: linear-gradient(165deg,#F7F3EB,#EFEAE0); text-decoration: none; color: inherit; transition: all .18s; box-shadow: 0 4px 12px rgba(107,30,45,0.06); }
        .tr-module:hover { border-color: rgba(107,30,45,0.65); transform: translateY(-2px); box-shadow: 0 8px 22px rgba(107,30,45,0.16); }
        .tr-module-head { display: flex; flex-direction: column; gap: 4px; }
        .tr-mod-badge { background: rgba(107,30,45,0.16); color: #6B1E2D; padding: 2px 9px; border-radius: 99px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; align-self: flex-start; }
        .tr-mod-title { font-size: 15px; font-weight: 900; color: #32101A; margin: 0; line-height: 1.3; }
        .tr-mod-desc { font-size: 12.5px; color: #6B1E2D; line-height: 1.7; margin: 0; }
        .tr-mod-meta { font-size: 11.5px; color: #8F765B; font-weight: 700; }
        .tr-mod-mine { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #4A0E1C; }
        .tr-mine-row { display: flex; align-items: center; gap: 8px; }
        .tr-mine-num { font-weight: 900; color: #6B1E2D; min-width: 16px; display: inline-block; }
        .tr-mod-cta { font-size: 12.5px; font-weight: 800; color: #6B1E2D; margin-top: auto; padding-top: 6px; }
      `}</style>
    </div>
  );
}
