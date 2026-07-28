"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import { useLang } from "@/lib/language-context";
import { cachedFetch } from "@/lib/api-cache";
import MandalaLoader from "@/components/MandalaLoader";
import TeacherLoadError from "@/components/TeacherLoadError";
import { HowItWorks } from "../components/HowItWorks";
import { teacherUI, reviewChipClass, reviewLabel, type ReviewStatus } from "../components/teacher-ui";

type QuizRow = {
  id: string;
  name: string;
  is_legacy: boolean;
  review_status: ReviewStatus;
  reviewer_notes: string | null;
  module: { id: string; title: string; stage: { id: string; title: string; order: number } } | null;
  class: { id: string; name: string };
  _count: { questions: number; attempts: number };
};

const UI = {
  ar: {
    eyebrow: "الاختبارات",
    title: "كل اختباراتك في مكان واحد",
    sub: "الاختبار أسئلة فقط بدون شرح. الاختبارات الجديدة تُنشأ من داخل الخريطة التعليمية لأن كل اختبار يجب أن يرتبط بمفهوم.",
    openRoadmap: "إنشاء اختبار من الخريطة",
    statAll: "إجمالي الاختبارات",
    statDraft: "مسودات",
    statPending: "قيد المراجعة",
    statLive: "ظاهر للطلاب",
    searchPh: "ابحث باسم الاختبار أو الفصل...",
    filterAll: "الكل",
    filterDraft: "مسودة",
    filterPending: "قيد المراجعة",
    filterApproved: "معتمد",
    filterRejected: "يحتاج تعديل",
    emptyTitle: "لا توجد اختبارات بعد",
    emptySub: "ابدأ من الخريطة التعليمية: افتح أي مفهوم ثم اضغط «إضافة اختبار».",
    noResults: "لا توجد اختبارات مطابقة لبحثك.",
    concept: "مفهوم",
    noConcept: "غير مرتبط بمفهوم",
    legacy: "قديم",
    questions: "سؤال",
    attempts: "طالب أجاب",
    noQuestions: "بدون أسئلة — أضف أسئلة قبل الإرسال",
    needsFix: "يحتاج تعديل — راجع ملاحظات المشرف داخل الاختبار.",
    open: "فتح الاختبار",
    guide: [
      { title: "افتح الخريطة", body: "كل اختبار يجب أن يرتبط بمفهوم، لذلك يبدأ الإنشاء من الخريطة التعليمية." },
      { title: "أضف الاختبار", body: "من داخل المفهوم اضغط «إضافة اختبار» واختر الفصل." },
      { title: "أضف الأسئلة", body: "ستنتقل مباشرة لصفحة بناء الاختبار لإضافة الأسئلة." },
      { title: "أرسل للمراجعة", body: "يظهر للطلاب بعد اعتماد الإدارة فقط." },
    ],
  },
  sq: {
    eyebrow: "Kuizet",
    title: "Të gjitha kuizet e tua në një vend",
    sub: "Kuizi ka vetëm pyetje. Kuizet e reja krijohen brenda hartës, sepse çdo kuiz lidhet me një koncept.",
    openRoadmap: "Krijo kuiz nga harta",
    statAll: "Kuize gjithsej",
    statDraft: "Draft",
    statPending: "Në shqyrtim",
    statLive: "Të dukshme",
    searchPh: "Kërko sipas emrit ose klasës...",
    filterAll: "Të gjitha",
    filterDraft: "Draft",
    filterPending: "Në shqyrtim",
    filterApproved: "Miratuar",
    filterRejected: "Kërkon ndryshim",
    emptyTitle: "Ende nuk ka kuize",
    emptySub: "Fillo nga harta: hap një koncept dhe kliko «Shto kuiz».",
    noResults: "Nuk ka kuize që përputhen.",
    concept: "Koncepti",
    noConcept: "Pa koncept",
    legacy: "I vjetër",
    questions: "pyetje",
    attempts: "nxënës u përgjigjën",
    noQuestions: "Pa pyetje — shto pyetje para dërgimit",
    needsFix: "Kërkon ndryshim — shiko shënimet brenda kuizit.",
    open: "Hap kuizin",
    guide: [
      { title: "Hap hartën", body: "Çdo kuiz lidhet me një koncept, prandaj nis nga harta." },
      { title: "Shto kuizin", body: "Brenda konceptit kliko «Shto kuiz» dhe zgjidh klasën." },
      { title: "Shto pyetjet", body: "Do të kalosh te faqja e ndërtimit të kuizit." },
      { title: "Dërgo për shqyrtim", body: "Nxënësit e shohin vetëm pas miratimit." },
    ],
  },
} as const;

type Filter = "all" | "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export default function TeacherQuizzesPage() {
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const data = await cachedFetch<QuizRow[]>("/api/teacher/quizzes", 30_000);
      setQuizzes(Array.isArray(data) ? data : []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => ({
    all: quizzes.length,
    draft: quizzes.filter((quiz) => quiz.review_status === "DRAFT").length,
    pending: quizzes.filter((quiz) => quiz.review_status === "PENDING_REVIEW").length,
    live: quizzes.filter((quiz) => quiz.review_status === "APPROVED").length,
  }), [quizzes]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      if (filter !== "all" && quiz.review_status !== filter) return false;
      if (!needle) return true;
      return `${quiz.name} ${quiz.class.name} ${quiz.module?.title ?? ""}`.toLowerCase().includes(needle);
    });
  }, [quizzes, query, filter]);

  if (loading) return <MandalaLoader />;
  if (loadError) return <TeacherLoadError onRetry={() => { setLoading(true); void load(); }} />;

  return (
    <div className="tui tq" dir={dir}>
      <header className="tui-hero">
        <div className="tui-hero-inner">
          <div>
            <span className="tui-eyebrow"><ClipboardList size={12} />{T.eyebrow}</span>
            <h1>{T.title}</h1>
            <p>{T.sub}</p>
          </div>
          <div className="tui-hero-side">
            <Link href="/teacher/roadmap" className="tui-btn tui-btn-gold"><MapPin size={15} />{T.openRoadmap}</Link>
          </div>
        </div>
        <div className="tui-stats">
          <div className="tui-stat"><b>{stats.all}</b><span>{T.statAll}</span></div>
          <div className="tui-stat"><b>{stats.draft}</b><span>{T.statDraft}</span></div>
          <div className="tui-stat"><b>{stats.pending}</b><span>{T.statPending}</span></div>
          <div className="tui-stat"><b>{stats.live}</b><span>{T.statLive}</span></div>
        </div>
      </header>

      <HowItWorks id="quizzes" steps={T.guide as unknown as { title: string; body: string }[]} lang={L} />

      {quizzes.length === 0 ? (
        <div className="tui-card">
          <div className="tui-empty">
            <span className="tui-empty-icon"><ClipboardList size={22} /></span>
            <strong>{T.emptyTitle}</strong>
            <p>{T.emptySub}</p>
            <Link href="/teacher/roadmap" className="tui-btn tui-btn-primary"><MapPin size={15} />{T.openRoadmap}</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="tq-toolbar">
            <label className="tui-search">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={T.searchPh} />
            </label>
            <div className="tq-filters">
              {([
                ["all", T.filterAll], ["DRAFT", T.filterDraft], ["PENDING_REVIEW", T.filterPending],
                ["APPROVED", T.filterApproved], ["REJECTED", T.filterRejected],
              ] as const).map(([key, label]) => (
                <button key={key} type="button" className={`tq-filter${filter === key ? " active" : ""}`} onClick={() => setFilter(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="tui-card"><div className="tui-empty"><strong>{T.noResults}</strong></div></div>
          ) : (
            <div className="tq-grid">
              {visible.map((quiz) => (
                <Link key={quiz.id} href={`/teacher/quizzes/${quiz.id}`} className="tq-card">
                  <div className="tq-card-top">
                    <span className={reviewChipClass[quiz.review_status]}>
                      {quiz.review_status === "APPROVED" && <CheckCircle2 size={11} />}
                      {reviewLabel[L][quiz.review_status]}
                    </span>
                    {quiz.is_legacy && <span className="tui-chip tui-chip-legacy">{T.legacy}</span>}
                    <span className="tq-card-class"><Users size={11} />{quiz.class.name}</span>
                  </div>

                  <h3>{quiz.name}</h3>

                  <span className="tq-card-concept">
                    <MapPin size={11} />
                    {quiz.module ? `${T.concept}: ${quiz.module.title}` : T.noConcept}
                  </span>

                  <div className="tq-card-meta">
                    <span><ClipboardList size={11} />{quiz._count.questions} {T.questions}</span>
                    {quiz._count.attempts > 0 && <span><Users size={11} />{quiz._count.attempts} {T.attempts}</span>}
                  </div>

                  {quiz._count.questions === 0 && !quiz.is_legacy && (
                    <span className="tq-card-warn"><AlertCircle size={12} />{T.noQuestions}</span>
                  )}
                  {quiz.review_status === "REJECTED" && (
                    <span className="tq-card-warn"><AlertCircle size={12} />{T.needsFix}</span>
                  )}
                </Link>
              ))}
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
.tq{padding-bottom:28px}
.tq-toolbar{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.tq-filters{display:flex;align-items:center;gap:4px;border:1px solid #D9C9B0;border-radius:12px;background:#FFFBF5;padding:4px 6px;overflow-x:auto}
.tq-filter{min-height:32px;border:0;border-radius:9px;background:none;color:#655B53;padding:0 11px;
  font:800 11.5px 'Cairo',sans-serif;cursor:pointer;white-space:nowrap}
.tq-filter.active{background:linear-gradient(140deg,#6B1E2D,#32101A);color:#F7F3EB}

.tq-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(272px,1fr));gap:12px}
.tq-card{display:flex;flex-direction:column;gap:8px;padding:16px;border-radius:17px;text-decoration:none;color:inherit;
  border:1px solid #E5E0D5;background:#FFFBF5;box-shadow:0 8px 22px rgba(107,30,45,.05);
  transition:transform .16s,box-shadow .16s,border-color .16s}
.tq-card:hover{transform:translateY(-2px);border-color:rgba(107,30,45,.4);box-shadow:0 14px 30px rgba(107,30,45,.13)}
.tq-card-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.tq-card-class{display:inline-flex;align-items:center;gap:4px;margin-inline-start:auto;font-size:10.5px;font-weight:800;color:#8F765B}
.tq-card h3{margin:0;font-size:14.5px;font-weight:900;line-height:1.4;color:#32101A}
.tq-card-concept{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:800;color:#6B1E2D}
.tq-card-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto;padding-top:6px}
.tq-card-meta span{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:4px 9px;
  background:#EFEAE0;color:#655B53;font-size:10px;font-weight:800}
.tq-card-warn{display:inline-flex;align-items:flex-start;gap:5px;border-radius:9px;padding:7px 9px;
  background:rgba(107,30,45,.07);color:#6B1E2D;font-size:10.5px;font-weight:800;line-height:1.6}

@media(max-width:560px){
  .tq-toolbar{flex-direction:column}
  .tq-toolbar>*{min-width:0;max-width:100%}
  .tq-filters{min-width:0;max-width:100%}
  .tq-grid{grid-template-columns:1fr}
}
`;
