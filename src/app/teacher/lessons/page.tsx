"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useLang } from "@/lib/language-context";
import { cachedFetch } from "@/lib/api-cache";
import TeacherLoadError from "@/components/TeacherLoadError";
import MandalaLoader from "@/components/MandalaLoader";
import { HowItWorks } from "../components/HowItWorks";
import { teacherUI, reviewChipClass, reviewLabel, type ReviewStatus } from "../components/teacher-ui";

type ClassRef = { id: string; name: string };
type RoadmapTree = { stages: Array<{ id: string; title: string; modules: Array<{ id: string; title: string }> }> };
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
    createLesson: "إنشاء درس جديد",
    createTitle: "ابدأ درساً منظماً في دقيقة",
    createSub: "اختر المفهوم والمجموعة أولاً، ثم انتقل مباشرة إلى محرر المحتوى والأسئلة.",
    stepConcept: "1 · المفهوم التعليمي",
    stepClass: "2 · المجموعة المستهدفة",
    stepDetails: "3 · أساسيات الدرس",
    chooseConcept: "اختر المفهوم",
    chooseClass: "اختر المجموعة",
    lessonTitle: "عنوان الدرس",
    lessonTitlePh: "عنوان واضح يراه المستفيد",
    lessonDescription: "وصف مختصر (اختياري)",
    lessonDescriptionPh: "ما الذي سيتعلمه المستفيد؟",
    continueBuilder: "إنشاء والانتقال إلى المحرر",
    creating: "جارٍ إنشاء الدرس...",
    createError: "تعذر إنشاء الدرس. راجع الحقول وحاول مجدداً.",
    roadmapMissing: "لم تُنشأ خريطة تعليمية بعد.",
    close: "إغلاق",
    statAll: "إجمالي الدروس",
    statDraft: "مسودات",
    statPending: "قيد المراجعة",
    statLive: "ظاهر للمستفيدين",
    searchPh: "ابحث باسم الدرس أو المجموعة...",
    filterAll: "الكل",
    filterDraft: "مسودة",
    filterPending: "قيد المراجعة",
    filterApproved: "معتمد",
    filterRejected: "يحتاج تعديل",
    emptyTitle: "لا توجد دروس بعد",
    emptySub: "ابدأ من الخريطة التعليمية: افتح أي مفهوم ثم اضغط «إضافة درس».",
    needClass: "تحتاج إلى مجموعة أولاً",
    needClassSub: "لا توجد مجموعات مخصصة لك بعد. اطلب من إدارة المنصة تخصيص مجموعة قبل إنشاء الدروس.",
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
      { title: "أضف الدرس", body: "من داخل المفهوم اضغط «إضافة درس» واختر المجموعة." },
      { title: "ابنِ المحتوى", body: "أضف نصوصاً وصوراً وفيديو، ثم أسئلة يجيب عنها المستفيد." },
      { title: "أرسل للمراجعة", body: "يظهر الدرس للمستفيدين بعد اعتماد الإدارة فقط." },
    ],
  },
  sq: {
    eyebrow: "Mësimet",
    title: "Të gjitha mësimet e tua në një vend",
    sub: "Kjo është lista e gjithçkaje që ke krijuar. Mësimet e reja krijohen brenda hartës, sepse çdo mësim lidhet me një koncept.",
    openRoadmap: "Krijo mësim nga harta",
    createLesson: "Krijo mësim të ri",
    createTitle: "Nis një mësim të strukturuar brenda një minute",
    createSub: "Zgjidh konceptin dhe grupin, pastaj vazhdo direkt te përmbajtja dhe pyetjet.",
    stepConcept: "1 · Koncepti",
    stepClass: "2 · Grupi i synuar",
    stepDetails: "3 · Bazat e mësimit",
    chooseConcept: "Zgjidh konceptin",
    chooseClass: "Zgjidh grupin",
    lessonTitle: "Titulli i mësimit",
    lessonTitlePh: "Titull i qartë për pjesëmarrësin",
    lessonDescription: "Përshkrim i shkurtër (opsional)",
    lessonDescriptionPh: "Çfarë do të mësojë pjesëmarrësi?",
    continueBuilder: "Krijo dhe hap redaktuesin",
    creating: "Duke krijuar mësimin...",
    createError: "Mësimi nuk u krijua. Kontrollo fushat dhe provo përsëri.",
    roadmapMissing: "Ende nuk ka hartë mësimore.",
    close: "Mbyll",
    statAll: "Mësime gjithsej",
    statDraft: "Draft",
    statPending: "Në shqyrtim",
    statLive: "Të dukshme",
    searchPh: "Kërko sipas titullit ose grupit...",
    filterAll: "Të gjitha",
    filterDraft: "Draft",
    filterPending: "Në shqyrtim",
    filterApproved: "Miratuar",
    filterRejected: "Kërkon ndryshim",
    emptyTitle: "Ende nuk ka mësime",
    emptySub: "Fillo nga harta: hap një koncept dhe kliko «Shto mësim».",
    needClass: "Të nevojitet një grup",
    needClassSub: "Nuk ke asnjë grup të caktuar. Kërko nga administrata para se të krijosh mësime.",
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
      { title: "Shto mësimin", body: "Brenda konceptit kliko «Shto mësim» dhe zgjidh grupin." },
      { title: "Ndërto përmbajtjen", body: "Shto tekst, foto, video dhe pyetje." },
      { title: "Dërgo për shqyrtim", body: "Pjesëmarrësit e shohin vetëm pas miratimit." },
    ],
  },
} as const;

type Filter = "all" | "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export default function TeacherLessonsPage() {
  const router = useRouter();
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
  const [createOpen, setCreateOpen] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapTree | null>(null);
  const [roadmapLoaded, setRoadmapLoaded] = useState(false);
  const [createForm, setCreateForm] = useState({ moduleId: "", classId: "", title: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

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

  async function openCreate() {
    setCreateOpen(true);
    setCreateError("");
    setCreateForm((current) => ({ ...current, classId: current.classId || classes[0]?.id || "" }));
    if (roadmap) return;
    try {
      const response = await fetch("/api/teacher/roadmap", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      setRoadmap(payload.roadmap);
      setRoadmapLoaded(true);
    } catch {
      setRoadmapLoaded(true);
      setCreateError(T.createError);
    }
  }

  async function createLesson() {
    if (!createForm.moduleId || !createForm.classId || !createForm.title.trim() || creating) {
      setCreateError(T.createError);
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const response = await fetch("/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: createForm.moduleId,
          classId: createForm.classId,
          title: createForm.title.trim(),
          description: createForm.description.trim() || undefined,
        }),
      });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      router.push(`/teacher/lessons/${payload.lesson.id}`);
    } catch {
      setCreateError(T.createError);
      setCreating(false);
    }
  }

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
            <button type="button" className="tui-btn tui-btn-gold" onClick={() => void openCreate()} disabled={classes.length === 0}><Plus size={15} />{T.createLesson}</button>
            <Link href="/teacher/roadmap" className="tui-btn tui-btn-ghost"><MapPin size={15} />{T.openRoadmap}</Link>
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

      {createOpen && (
        <div className="tl-create-overlay" role="presentation" onMouseDown={() => !creating && setCreateOpen(false)}>
          <section className="tl-create" role="dialog" aria-modal="true" aria-label={T.createLesson} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <span><Sparkles size={20} /></span>
              <div><h2>{T.createTitle}</h2><p>{T.createSub}</p></div>
              <button type="button" onClick={() => setCreateOpen(false)} disabled={creating} aria-label={T.close}><X size={18} /></button>
            </header>
            <div className="tl-create-body">
              <label><b>{T.stepConcept}</b><select value={createForm.moduleId} onChange={(event) => setCreateForm((current) => ({ ...current, moduleId: event.target.value }))}><option value="">{T.chooseConcept}</option>{roadmap?.stages.map((stage) => <optgroup key={stage.id} label={stage.title}>{stage.modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</optgroup>)}</select>{roadmapLoaded && roadmap === null && !createError && <small>{T.roadmapMissing}</small>}</label>
              <label><b>{T.stepClass}</b><select value={createForm.classId} onChange={(event) => setCreateForm((current) => ({ ...current, classId: event.target.value }))}><option value="">{T.chooseClass}</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <fieldset><legend>{T.stepDetails}</legend><label><span>{T.lessonTitle}</span><input value={createForm.title} onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))} placeholder={T.lessonTitlePh} maxLength={160} autoFocus /></label><label><span>{T.lessonDescription}</span><textarea value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} placeholder={T.lessonDescriptionPh} rows={3} maxLength={500} /></label></fieldset>
              {createError && <p className="tl-create-error" role="alert">{createError}</p>}
            </div>
            <footer><button type="button" className="cancel" onClick={() => setCreateOpen(false)} disabled={creating}>{T.close}</button><button type="button" className="submit" onClick={() => void createLesson()} disabled={creating || !createForm.moduleId || !createForm.classId || !createForm.title.trim()}>{creating ? T.creating : T.continueBuilder}</button></footer>
          </section>
        </div>
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

.tl-create-overlay{position:fixed;z-index:5000;inset:0;display:grid;place-items:center;background:rgba(26,26,26,.64);padding:18px;backdrop-filter:blur(10px)}
.tl-create{width:min(650px,100%);max-height:92dvh;overflow:hidden;border:1px solid rgba(217,201,176,.32);border-radius:24px;background:#F7F3EB;box-shadow:0 28px 80px rgba(26,26,26,.36)}
.tl-create>header{display:flex;align-items:center;gap:12px;background:linear-gradient(130deg,#32101A,#6B1E2D);padding:18px 20px;color:#fff}.tl-create>header>span{display:grid;width:44px;height:44px;flex:none;place-items:center;border:1px solid rgba(217,201,176,.25);border-radius:13px;background:rgba(217,201,176,.1);color:#D9C9B0}.tl-create>header>div{min-width:0;flex:1}.tl-create>header h2{margin:0;font-size:17px;font-weight:900}.tl-create>header p{margin:3px 0 0;color:#D9C9B0;font-size:10.5px;line-height:1.65}.tl-create>header>button{display:grid;width:36px;height:36px;place-items:center;border:1px solid rgba(217,201,176,.22);border-radius:10px;background:rgba(217,201,176,.08);color:#fff;cursor:pointer}
.tl-create-body{display:flex;max-height:calc(92dvh - 155px);flex-direction:column;gap:13px;overflow-y:auto;padding:18px}.tl-create-body>label,.tl-create fieldset label{display:flex;flex-direction:column;gap:6px}.tl-create-body label b,.tl-create fieldset legend{color:#6B1E2D;font-size:10px;font-weight:900;letter-spacing:.06em}.tl-create-body label span{color:#655B53;font-size:10px;font-weight:800}.tl-create select,.tl-create input,.tl-create textarea{width:100%;border:1px solid #D9C9B0;border-radius:11px;background:#fff;padding:11px 13px;color:#32101A;font:700 13px 'Cairo',sans-serif;outline:none}.tl-create select:focus,.tl-create input:focus,.tl-create textarea:focus{border-color:#B8A082;box-shadow:0 0 0 3px rgba(184,160,130,.14)}.tl-create textarea{resize:vertical;line-height:1.7}.tl-create-body label small{color:#6B1E2D;font-size:9.5px;font-weight:800}.tl-create fieldset{display:flex;flex-direction:column;gap:11px;border:1px solid #E5E0D5;border-radius:15px;background:#FFFBF5;padding:14px}.tl-create fieldset legend{padding:0 7px}.tl-create-error{border:1px solid rgba(107,30,45,.18);border-radius:10px;background:rgba(107,30,45,.06);padding:9px 11px;color:#6B1E2D;font-size:10.5px;font-weight:800}
.tl-create>footer{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #E5E0D5;background:#FFFBF5;padding:13px 18px}.tl-create>footer button{border-radius:10px;padding:10px 15px;font:800 11px 'Cairo',sans-serif;cursor:pointer}.tl-create>footer .cancel{border:1px solid #D9C9B0;background:#fff;color:#655B53}.tl-create>footer .submit{border:0;background:#6B1E2D;color:#fff}.tl-create>footer button:disabled{opacity:.45;cursor:not-allowed}

@media(max-width:560px){
  .tl-toolbar{flex-direction:column}
  .tl-toolbar>*{min-width:0;max-width:100%}
  .tl-filters{min-width:0;max-width:100%}
  .tl-grid{grid-template-columns:1fr}
  .tl-create-overlay{padding:0}.tl-create{max-height:100dvh;border-radius:0}.tl-create-body{max-height:calc(100dvh - 155px);padding:14px}.tl-create>footer{display:grid;grid-template-columns:1fr 1fr}.tl-create>footer button{padding:11px 8px}
}
`;
