"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import { useLang } from "@/lib/language-context";
import { cachedFetch } from "@/lib/api-cache";
import TeacherLoadError from "@/components/TeacherLoadError";
import MandalaLoader from "@/components/MandalaLoader";
import { HowItWorks } from "../components/HowItWorks";
import { teacherUI, reviewChipClass, reviewLabel, type ReviewStatus } from "../components/teacher-ui";

type ClassRef = { id: string; name: string };
type LessonRow = {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  is_graded: boolean;
  is_legacy: boolean;
  review_status: ReviewStatus;
  reviewer_notes: string | null;
  module: { id: string; title: string; order: number; stage: { id: string; title: string; order: number } } | null;
  class: ClassRef;
  linked_quiz: { id: string; name: string } | null;
  _count: { contents: number; questions: number; attempts: number };
};

const UI = {
  ar: {
    eyebrow: "الدروس",
    title: "كل دروسك في مكان واحد",
    sub: "هذه قائمة بكل ما أنشأته. الدروس الجديدة تُنشأ من داخل الخريطة التعليمية لأن كل درس يجب أن يرتبط بمفهوم.",
    openRoadmap: "إنشاء درس من الخريطة",
    statAll: "إجمالي الدروس",
    statDraft: "مسودات",
    statPending: "قيد المراجعة",
    statLive: "ظاهر للطلاب",
    searchPh: "ابحث باسم الدرس أو الفصل...",
    filterAll: "الكل",
    filterDraft: "مسودة",
    filterPending: "قيد المراجعة",
    filterApproved: "معتمد",
    filterRejected: "يحتاج تعديل",
    emptyTitle: "لا توجد دروس بعد",
    emptySub: "ابدأ من الخريطة التعليمية: افتح أي مفهوم ثم اضغط «إضافة درس».",
    needClass: "تحتاج إلى فصل أولاً",
    needClassSub: "لا توجد فصول مخصصة لك بعد. اطلب من إدارة المدرسة تخصيص فصل قبل إنشاء الدروس.",
    noResults: "لا توجد دروس مطابقة لبحثك.",
    concept: "مفهوم",
    noConcept: "غير مرتبط بمفهوم",
    legacy: "قديم",
    contents: "محتوى",
    questions: "سؤال",
    attempts: "إجابة",
    graded: "مُقيَّم",
    practice: "تدريبي",
    linkedTo: "مرتبط باختبار",
    needsFix: "يحتاج تعديل — راجع ملاحظات المشرف داخل الدرس.",
    guide: [
      { title: "افتح الخريطة", body: "كل درس يجب أن يرتبط بمفهوم، لذلك يبدأ الإنشاء دائماً من الخريطة التعليمية." },
      { title: "أضف الدرس", body: "من داخل المفهوم اضغط «إضافة درس» واختر الفصل." },
      { title: "ابنِ المحتوى", body: "أضف نصوصاً وصوراً وفيديو، ثم أسئلة يجيب عنها الطالب." },
      { title: "أرسل للمراجعة", body: "يظهر الدرس للطلاب بعد اعتماد الإدارة فقط." },
    ],
  },
  sq: {
    eyebrow: "Mësimet",
    title: "Të gjitha mësimet e tua në një vend",
    sub: "Kjo është lista e gjithçkaje që ke krijuar. Mësimet e reja krijohen brenda hartës, sepse çdo mësim lidhet me një koncept.",
    openRoadmap: "Krijo mësim nga harta",
    statAll: "Mësime gjithsej",
    statDraft: "Draft",
    statPending: "Në shqyrtim",
    statLive: "Të dukshme",
    searchPh: "Kërko sipas titullit ose klasës...",
    filterAll: "Të gjitha",
    filterDraft: "Draft",
    filterPending: "Në shqyrtim",
    filterApproved: "Miratuar",
    filterRejected: "Kërkon ndryshim",
    emptyTitle: "Ende nuk ka mësime",
    emptySub: "Fillo nga harta: hap një koncept dhe kliko «Shto mësim».",
    needClass: "Të nevojitet një klasë",
    needClassSub: "Nuk ke asnjë klasë të caktuar. Kërko nga administrata para se të krijosh mësime.",
    noResults: "Nuk ka mësime që përputhen.",
    concept: "Koncepti",
    noConcept: "Pa koncept",
    legacy: "I vjetër",
    contents: "përmbajtje",
    questions: "pyetje",
    attempts: "përgjigje",
    graded: "Me notë",
    practice: "Praktikë",
    linkedTo: "Lidhur me kuiz",
    needsFix: "Kërkon ndryshim — shiko shënimet brenda mësimit.",
    guide: [
      { title: "Hap hartën", body: "Çdo mësim lidhet me një koncept, prandaj nis nga harta." },
      { title: "Shto mësimin", body: "Brenda konceptit kliko «Shto mësim» dhe zgjidh klasën." },
      { title: "Ndërto përmbajtjen", body: "Shto tekst, foto, video dhe pyetje." },
      { title: "Dërgo për shqyrtim", body: "Nxënësit e shohin vetëm pas miratimit." },
    ],
  },
} as const;

type Filter = "all" | "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export default function TeacherLessonsPage() {
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [classes, setClasses] = useState<ClassRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const data = await cachedFetch<{ lessons: LessonRow[]; classes: ClassRef[] }>("/api/teacher/lessons", 30_000);
      setLessons(data?.lessons ?? []);
      setClasses(data?.classes ?? []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => ({
    all: lessons.length,
    draft: lessons.filter((lesson) => lesson.review_status === "DRAFT").length,
    pending: lessons.filter((lesson) => lesson.review_status === "PENDING_REVIEW").length,
    live: lessons.filter((lesson) => lesson.review_status === "APPROVED").length,
  }), [lessons]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return lessons.filter((lesson) => {
      if (filter !== "all" && lesson.review_status !== filter) return false;
      if (!needle) return true;
      return `${lesson.title} ${lesson.description ?? ""} ${lesson.class.name} ${lesson.module?.title ?? ""}`
        .toLowerCase().includes(needle);
    });
  }, [lessons, query, filter]);

  if (loading) return <MandalaLoader />;
  if (loadError) return <TeacherLoadError onRetry={() => { setLoading(true); void load(); }} />;

  return (
    <div className="tui tl" dir={dir}>
      <header className="tui-hero">
        <div className="tui-hero-inner">
          <div>
            <span className="tui-eyebrow"><BookOpen size={12} />{T.eyebrow}</span>
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

      <HowItWorks id="lessons" steps={T.guide as unknown as { title: string; body: string }[]} lang={L} />

      {classes.length === 0 ? (
        <div className="tui-card">
          <div className="tui-empty">
            <span className="tui-empty-icon"><Users size={22} /></span>
            <strong>{T.needClass}</strong>
            <p>{T.needClassSub}</p>
          </div>
        </div>
      ) : lessons.length === 0 ? (
        <div className="tui-card">
          <div className="tui-empty">
            <span className="tui-empty-icon"><BookOpen size={22} /></span>
            <strong>{T.emptyTitle}</strong>
            <p>{T.emptySub}</p>
            <Link href="/teacher/roadmap" className="tui-btn tui-btn-primary"><MapPin size={15} />{T.openRoadmap}</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="tl-toolbar">
            <label className="tui-search">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={T.searchPh} />
            </label>
            <div className="tl-filters">
              {([
                ["all", T.filterAll], ["DRAFT", T.filterDraft], ["PENDING_REVIEW", T.filterPending],
                ["APPROVED", T.filterApproved], ["REJECTED", T.filterRejected],
              ] as const).map(([key, label]) => (
                <button key={key} type="button" className={`tl-filter${filter === key ? " active" : ""}`} onClick={() => setFilter(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="tui-card"><div className="tui-empty"><strong>{T.noResults}</strong></div></div>
          ) : (
            <div className="tl-grid">
              {visible.map((lesson) => (
                <Link key={lesson.id} href={`/teacher/lessons/${lesson.id}`} className="tl-card">
                  <div className="tl-card-top">
                    <span className={reviewChipClass[lesson.review_status]}>
                      {lesson.review_status === "APPROVED" && <CheckCircle2 size={11} />}
                      {reviewLabel[L][lesson.review_status]}
                    </span>
                    {lesson.is_legacy && <span className="tui-chip tui-chip-legacy">{T.legacy}</span>}
                    <span className="tl-card-class"><Users size={11} />{lesson.class.name}</span>
                  </div>

                  <h3>{lesson.title}</h3>
                  {lesson.description && <p className="tl-card-desc">{lesson.description}</p>}

                  <span className="tl-card-concept">
                    <MapPin size={11} />
                    {lesson.module ? `${T.concept}: ${lesson.module.title}` : T.noConcept}
                  </span>

                  <div className="tl-card-meta">
                    <span><FileText size={11} />{lesson._count.contents} {T.contents}</span>
                    <span><ClipboardList size={11} />{lesson._count.questions} {T.questions}</span>
                    {lesson._count.attempts > 0 && <span><Users size={11} />{lesson._count.attempts} {T.attempts}</span>}
                    <span className={lesson.is_graded ? "is-graded" : "is-practice"}>
                      {lesson.is_graded ? T.graded : T.practice}
                    </span>
                  </div>

                  {lesson.review_status === "REJECTED" && (
                    <span className="tl-card-fix"><AlertCircle size={12} />{T.needsFix}</span>
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
.tl{padding-bottom:28px}
.tl-toolbar{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.tl-filters{display:flex;align-items:center;gap:4px;border:1px solid #D9C9B0;border-radius:12px;background:#FFFBF5;padding:4px 6px;overflow-x:auto}
.tl-filter{min-height:32px;border:0;border-radius:9px;background:none;color:#655B53;padding:0 11px;
  font:800 11.5px 'Cairo',sans-serif;cursor:pointer;white-space:nowrap}
.tl-filter.active{background:linear-gradient(140deg,#6B1E2D,#32101A);color:#F7F3EB}

.tl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(272px,1fr));gap:12px}
.tl-card{display:flex;flex-direction:column;gap:8px;padding:16px;border-radius:17px;text-decoration:none;color:inherit;
  border:1px solid #E5E0D5;background:#FFFBF5;box-shadow:0 8px 22px rgba(107,30,45,.05);
  transition:transform .16s,box-shadow .16s,border-color .16s}
.tl-card:hover{transform:translateY(-2px);border-color:rgba(107,30,45,.4);box-shadow:0 14px 30px rgba(107,30,45,.13)}
.tl-card-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.tl-card-class{display:inline-flex;align-items:center;gap:4px;margin-inline-start:auto;font-size:10.5px;font-weight:800;color:#8F765B}
.tl-card h3{margin:0;font-size:14.5px;font-weight:900;line-height:1.4;color:#32101A}
.tl-card-desc{margin:0;font-size:11.5px;line-height:1.75;color:#655B53;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tl-card-concept{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:800;color:#6B1E2D}
.tl-card-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto;padding-top:6px}
.tl-card-meta span{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:4px 9px;
  background:#EFEAE0;color:#655B53;font-size:10px;font-weight:800}
.tl-card-meta span.is-graded{background:rgba(184,160,130,.22);color:#8F765B}
.tl-card-meta span.is-practice{background:rgba(27,94,32,.11);color:#1B5E20}
.tl-card-fix{display:inline-flex;align-items:flex-start;gap:5px;border-radius:9px;padding:7px 9px;
  background:rgba(107,30,45,.07);color:#6B1E2D;font-size:10.5px;font-weight:800;line-height:1.6}

@media(max-width:560px){
  .tl-toolbar{flex-direction:column}
  .tl-toolbar>*{min-width:0;max-width:100%}
  .tl-filters{min-width:0;max-width:100%}
  .tl-grid{grid-template-columns:1fr}
}
`;
