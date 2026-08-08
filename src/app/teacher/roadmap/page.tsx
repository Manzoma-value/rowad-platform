"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Layers,
  MapPin,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import TeacherLoadError from "@/components/TeacherLoadError";
import { HowItWorks } from "../components/HowItWorks";
import { teacherUI, type ReviewStatus } from "../components/teacher-ui";

type RoadmapModule = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  _count: { contents: number; questions: number };
  lessons: { id: string; title: string; review_status: ReviewStatus; is_legacy: boolean }[];
  quizzes: { id: string; name: string; review_status: ReviewStatus; is_legacy: boolean }[];
};

type RoadmapStage = { id: string; title: string; qualification_ar: string | null; qualification_sq: string | null; order: number; modules: RoadmapModule[] };
type Roadmap = { id: string; title: string; stages: RoadmapStage[] };

const UI = {
  ar: {
    eyebrow: "الخريطة التعليمية",
    title: "ابنِ محتواك حسب خريطة المنصة",
    sub: "الخريطة مقسّمة إلى مراحل، وكل مرحلة تحتوي مفاهيم. مهمتك: أن تضيف لكل مفهوم درساً واختباراً، ثم ترسلهما للمراجعة حتى يظهرا للمستفيدين.",
    stage: "المرحلة",
    concept: "مفهوم",
    concepts: "مفاهيم",
    open: "افتح المفهوم",
    start: "ابدأ الآن",
    addFirst: "أضف أول درس",
    empty: "لم يتم إعداد الخريطة بعد لمنصتك.",
    emptySub: "تواصل مع إدارة المنصة لإعداد المراحل والمفاهيم، وستظهر لك هنا مباشرة.",
    lessons: "درس",
    quizzes: "اختبار",
    done: "مكتمل",
    inProgress: "قيد العمل",
    notStarted: "لم يبدأ",
    searchPh: "ابحث عن مفهوم أو مرحلة...",
    filterAll: "كل المفاهيم",
    filterTodo: "بحاجة لعمل",
    filterDone: "مكتملة",
    statConcepts: "إجمالي المفاهيم",
    statCovered: "مفاهيم غطّيتها",
    statPending: "بانتظار المراجعة",
    statApproved: "معتمد ومنشور",
    noResults: "لا توجد نتائج مطابقة لبحثك.",
    qualification: "الأهلية المستهدفة",
    needsWork: "ينقصه محتوى",
    coverage: "نسبة تغطيتك لهذه المرحلة",
    guide: [
      { title: "افتح مفهوماً", body: "اضغط على أي بطاقة مفهوم بالأسفل. ستجد داخلها شرح الإدارة والأسئلة المرجعية." },
      { title: "أضف درساً أو اختباراً", body: "من داخل المفهوم اضغط «إضافة درس» أو «إضافة اختبار». لا يمكن إنشاؤهما من خارج الخريطة." },
      { title: "ابنِ المحتوى", body: "أضف نصوصاً وصوراً وفيديو للدرس، وأسئلة اختيار من متعدد أو صح/خطأ." },
      { title: "أرسل للمراجعة", body: "بعد الانتهاء اضغط «إرسال للمراجعة». يظهر للمستفيدين فقط بعد اعتماد الإدارة." },
    ],
  },
  sq: {
    eyebrow: "Harta Edukative",
    title: "Ndërto përmbajtjen sipas hartës së platformës",
    sub: "Harta ndahet në faza, dhe çdo fazë përmban koncepte. Detyra jote: shto një mësim dhe një kuiz për çdo koncept, pastaj dërgoji për shqyrtim që t'u shfaqen pjesëmarrësve.",
    stage: "Faza",
    concept: "koncept",
    concepts: "koncepte",
    open: "Hap konceptin",
    start: "Fillo tani",
    addFirst: "Shto mësimin e parë",
    empty: "Harta ende nuk është konfiguruar për platformën tuaj.",
    emptySub: "Kontakto administratën për të konfiguruar fazat dhe konceptet.",
    lessons: "mësim",
    quizzes: "kuiz",
    done: "I plotë",
    inProgress: "Në punë",
    notStarted: "Pa filluar",
    searchPh: "Kërko koncept ose fazë...",
    filterAll: "Të gjitha",
    filterTodo: "Kërkon punë",
    filterDone: "Të plota",
    statConcepts: "Koncepte gjithsej",
    statCovered: "Koncepte të mbuluara",
    statPending: "Në shqyrtim",
    statApproved: "Miratuar",
    noResults: "Nuk ka rezultate.",
    qualification: "Aftësia përfundimtare",
    needsWork: "I mungon përmbajtje",
    coverage: "Mbulimi yt i kësaj faze",
    guide: [
      { title: "Hap një koncept", body: "Kliko çdo kartë koncepti më poshtë për të parë materialin e administratës." },
      { title: "Shto mësim ose kuiz", body: "Brenda konceptit kliko «Shto mësim» ose «Shto kuiz». Nuk krijohen nga jashtë hartës." },
      { title: "Ndërto përmbajtjen", body: "Shto tekst, foto dhe video, si dhe pyetje me opsione ose të saktë/gabuar." },
      { title: "Dërgo për shqyrtim", body: "Në fund kliko «Dërgo për shqyrtim». Pjesëmarrësit e shohin vetëm pas miratimit." },
    ],
  },
} as const;

type Filter = "all" | "todo" | "done";

export default function TeacherRoadmapPage() {
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const loadRoadmap = useCallback(async () => {
    setLoadError(false);
    try {
      const response = await fetch("/api/teacher/roadmap", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRoadmap(data?.roadmap ?? null);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Awaited directly rather than scheduled with requestAnimationFrame: rAF is
  // paused in a backgrounded tab, which left the page stuck on its loader.
  useEffect(() => { void loadRoadmap(); }, [loadRoadmap]);

  /** A concept counts as "covered" once it has at least one non-legacy lesson. */
  const stats = useMemo(() => {
    const modules = roadmap?.stages.flatMap((stage) => stage.modules) ?? [];
    const own = (item: RoadmapModule) => ({
      lessons: item.lessons.filter((lesson) => !lesson.is_legacy),
      quizzes: item.quizzes.filter((quiz) => !quiz.is_legacy),
    });
    let covered = 0, pending = 0, approved = 0;
    for (const concept of modules) {
      const { lessons, quizzes } = own(concept);
      if (lessons.length > 0) covered += 1;
      for (const entry of [...lessons, ...quizzes]) {
        if (entry.review_status === "PENDING_REVIEW") pending += 1;
        if (entry.review_status === "APPROVED") approved += 1;
      }
    }
    return { total: modules.length, covered, pending, approved };
  }, [roadmap]);

  const visibleStages = useMemo(() => {
    if (!roadmap) return [];
    const needle = query.trim().toLowerCase();
    return roadmap.stages
      .map((stage) => ({
        ...stage,
        modules: stage.modules.filter((concept) => {
          const ownLessons = concept.lessons.filter((lesson) => !lesson.is_legacy).length;
          const ownQuizzes = concept.quizzes.filter((quiz) => !quiz.is_legacy).length;
          const complete = ownLessons > 0 && ownQuizzes > 0;
          if (filter === "todo" && complete) return false;
          if (filter === "done" && !complete) return false;
          if (!needle) return true;
          return `${concept.title} ${concept.description ?? ""} ${stage.title}`.toLowerCase().includes(needle);
        }),
      }))
      .filter((stage) => stage.modules.length > 0);
  }, [roadmap, query, filter]);

  if (loading) return <MandalaLoader />;
  if (loadError) return <TeacherLoadError onRetry={() => { setLoading(true); void loadRoadmap(); }} />;

  return (
    <div className="tui tr" dir={dir}>
      <header className="tui-hero">
        <div className="tui-hero-inner">
          <div>
            <span className="tui-eyebrow"><MapPin size={12} />{T.eyebrow}</span>
            <h1>{T.title}</h1>
            <p>{T.sub}</p>
          </div>
        </div>
        <div className="tui-stats">
          <div className="tui-stat"><b>{stats.total}</b><span>{T.statConcepts}</span></div>
          <div className="tui-stat"><b>{stats.covered}</b><span>{T.statCovered}</span></div>
          <div className="tui-stat"><b>{stats.pending}</b><span>{T.statPending}</span></div>
          <div className="tui-stat"><b>{stats.approved}</b><span>{T.statApproved}</span></div>
        </div>
      </header>

      <HowItWorks id="roadmap" steps={T.guide as unknown as { title: string; body: string }[]} lang={L} />

      {!roadmap || roadmap.stages.length === 0 ? (
        <div className="tui-card">
          <div className="tui-empty">
            <span className="tui-empty-icon"><Layers size={22} /></span>
            <strong>{T.empty}</strong>
            <p>{T.emptySub}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="tr-toolbar">
            <label className="tui-search">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={T.searchPh} />
            </label>
            <div className="tr-filters" role="group" aria-label={T.filterAll}>
              <SlidersHorizontal size={14} className="tr-filter-icon" />
              {([["all", T.filterAll], ["todo", T.filterTodo], ["done", T.filterDone]] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`tr-filter${filter === key ? " active" : ""}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {visibleStages.length === 0 ? (
            <div className="tui-card"><div className="tui-empty"><strong>{T.noResults}</strong></div></div>
          ) : (
            <div className="tr-stages">
              {visibleStages.map((stage) => {
                const complete = stage.modules.filter((concept) =>
                  concept.lessons.some((lesson) => !lesson.is_legacy) &&
                  concept.quizzes.some((quiz) => !quiz.is_legacy)).length;
                const percent = stage.modules.length ? Math.round((complete / stage.modules.length) * 100) : 0;
                return (
                  <section key={stage.id} className="tr-stage">
                    <header className="tr-stage-head">
                      <div className="tr-stage-id">
                        <span className="tr-stage-num">{stage.order}</span>
                        <div>
                          <span className="tr-stage-eyebrow">{T.stage} {stage.order}</span>
                          <h2>{stage.title}</h2>
                        </div>
                      </div>
                      <div className="tr-stage-progress">
                        <div className="tr-stage-progress-top">
                          <span>{T.coverage}</span>
                          <b>{complete}/{stage.modules.length}</b>
                        </div>
                        <div className="tui-bar"><i style={{ width: `${percent}%` }} /></div>
                      </div>
                    </header>

                    {(stage.qualification_ar || stage.qualification_sq) && (
                      <div className="tr-qualification">
                        <span>✦</span>
                        <div>
                          <small>{T.qualification}</small>
                          <strong>{L === "sq" ? stage.qualification_sq || stage.qualification_ar : stage.qualification_ar || stage.qualification_sq}</strong>
                        </div>
                      </div>
                    )}

                    <div className="tr-modules">
                      {stage.modules.map((concept) => {
                        const lessons = concept.lessons.filter((lesson) => !lesson.is_legacy);
                        const quizzes = concept.quizzes.filter((quiz) => !quiz.is_legacy);
                        const state = lessons.length && quizzes.length ? "done" : (lessons.length || quizzes.length) ? "progress" : "empty";
                        return (
                          <Link key={concept.id} href={`/teacher/roadmap/modules/${concept.id}`} className={`tr-module is-${state}`}>
                            <div className="tr-mod-top">
                              <span className="tr-mod-order">{T.concept} {concept.order}</span>
                              <span className={`tui-chip ${state === "done" ? "tui-chip-approved" : state === "progress" ? "tui-chip-pending" : "tui-chip-neutral"}`}>
                                {state === "done" ? <><CheckCircle2 size={11} />{T.done}</>
                                  : state === "progress" ? <><Clock3 size={11} />{T.inProgress}</>
                                  : T.notStarted}
                              </span>
                            </div>
                            <h3>{concept.title}</h3>
                            {concept.description && <p className="tr-mod-desc">{concept.description}</p>}

                            <div className="tr-mod-counts">
                              <span className={lessons.length ? "has" : ""}>
                                <BookOpen size={13} />{lessons.length} {T.lessons}
                              </span>
                              <span className={quizzes.length ? "has" : ""}>
                                <ClipboardList size={13} />{quizzes.length} {T.quizzes}
                              </span>
                            </div>

                            <span className="tr-mod-cta">
                              {state === "empty" ? T.addFirst : T.open}
                              <span aria-hidden="true">{L === "ar" ? "←" : "→"}</span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <style>{teacherUI}</style>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
.tr{padding-bottom:28px}
.tr-toolbar{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.tr-filters{display:flex;align-items:center;gap:5px;border:1px solid #D9C9B0;border-radius:12px;background:#FFFBF5;padding:4px 9px}
.tr-filter-icon{color:#8C8274;flex:none}
.tr-filter{min-height:32px;border:0;border-radius:9px;background:none;color:#655B53;padding:0 11px;font:800 11.5px 'Cairo',sans-serif;cursor:pointer;white-space:nowrap}
.tr-filter.active{background:linear-gradient(140deg,#6B1E2D,#32101A);color:#F7F3EB}

.tr-stages{display:flex;flex-direction:column;gap:14px}
.tr-stage{border:1px solid rgba(107,30,45,.2);border-radius:20px;background:#FFFBF5;padding:clamp(14px,2vw,20px);box-shadow:0 12px 30px rgba(107,30,45,.055)}
.tr-stage-head{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;
  margin-bottom:15px;padding-bottom:13px;border-bottom:1px solid rgba(107,30,45,.16)}
.tr-stage-id{display:flex;align-items:center;gap:12px;min-width:0}
.tr-stage-num{display:grid;place-items:center;width:42px;height:42px;flex:none;border-radius:14px;
  background:linear-gradient(140deg,#6B1E2D,#32101A);color:#D9C9B0;font-size:17px;font-weight:900}
.tr-stage-eyebrow{display:block;font-size:9.5px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#8F765B}
.tr-stage-head h2{margin:3px 0 0;font-size:17px;font-weight:900;color:#32101A}
.tr-stage-progress{min-width:min(230px,100%);flex:1;max-width:300px}
.tr-stage-progress-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px}
.tr-stage-progress-top span{font-size:10.5px;font-weight:800;color:#8C8274}
.tr-stage-progress-top b{font-size:12.5px;color:#32101A}
.tr-qualification{display:flex;align-items:flex-start;gap:10px;margin:12px 0 14px;border:1px solid rgba(184,160,130,.34);border-radius:14px;background:linear-gradient(135deg,#F7F3EB,#FFFBF5);padding:11px 13px}.tr-qualification>span{display:grid;place-items:center;width:28px;height:28px;flex:none;border-radius:9px;background:#6B1E2D;color:#D9C9B0}.tr-qualification small{display:block;color:#8F765B;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.tr-qualification strong{display:block;margin-top:2px;color:#32101A;font-size:12px;line-height:1.65}

.tr-modules{display:grid;grid-template-columns:repeat(auto-fill,minmax(252px,1fr));gap:11px}
.tr-module{display:flex;flex-direction:column;gap:8px;padding:15px;border-radius:16px;text-decoration:none;color:inherit;
  border:1px solid #E5E0D5;background:#FFFFFF;transition:transform .16s,box-shadow .16s,border-color .16s}
.tr-module:hover{transform:translateY(-2px);border-color:rgba(107,30,45,.45);box-shadow:0 12px 26px rgba(107,30,45,.13)}
.tr-module.is-empty{border-style:dashed;border-color:rgba(107,30,45,.5);background:rgba(107,30,45,.05)}
.tr-module.is-done{border-color:rgba(27,94,32,.26)}
.tr-mod-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.tr-mod-order{font-size:9.5px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#8F765B}
.tr-module h3{margin:0;font-size:14.5px;font-weight:900;line-height:1.4;color:#32101A}
.tr-mod-desc{margin:0;font-size:11.5px;line-height:1.75;color:#655B53;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tr-mod-counts{display:flex;gap:7px;flex-wrap:wrap;margin-top:2px}
.tr-mod-counts span{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 9px;
  background:#EFEAE0;color:#8C8274;font-size:10.5px;font-weight:800}
.tr-mod-counts span.has{background:rgba(27,94,32,.11);color:#1B5E20}
.tr-mod-cta{display:flex;align-items:center;gap:6px;margin-top:auto;padding-top:8px;font-size:12px;font-weight:900;color:#6B1E2D}

@media(max-width:560px){
  .tr-toolbar{flex-direction:column}
  .tr-toolbar>*{min-width:0;max-width:100%}
  .tr-filters{min-width:0;max-width:100%;overflow-x:auto}
  .tr-stage-head{gap:12px}
  .tr-stage-progress{max-width:none}
  .tr-modules{grid-template-columns:1fr}
}
`;
