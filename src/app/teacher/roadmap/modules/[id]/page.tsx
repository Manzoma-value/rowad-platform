"use client";
export const dynamic = "force-dynamic";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileText,
  Info,
  Plus,
  Send,
  X,
} from "lucide-react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import TeacherLoadError from "@/components/TeacherLoadError";
import { HowItWorks } from "../../../components/HowItWorks";
import { teacherUI, reviewChipClass, reviewLabel, type ReviewStatus } from "../../../components/teacher-ui";

type LessonRow = {
  id: string; title: string; description: string | null;
  review_status: ReviewStatus; reviewer_notes: string | null;
  is_legacy: boolean; submitted_at: string | null; reviewed_at: string | null;
  class: { id: string; name: string };
  _count: { contents: number; questions: number; attempts: number };
};
type QuizRow = {
  id: string; name: string;
  review_status: ReviewStatus; reviewer_notes: string | null;
  is_legacy: boolean; submitted_at: string | null; reviewed_at: string | null;
  class: { id: string; name: string };
  _count: { questions: number; attempts: number };
};
type ModuleDetail = {
  id: string; title: string; description: string | null; order: number;
  stage: { id: string; title: string; order: number; roadmap: { title: string } };
  main_trait: { id: string; name: string; definition: string; maqsad: string } | null;
  contents: { id: string; type: "TEXT"|"IMAGE"|"VIDEO"; order: number; body: string | null; image_url: string | null; alt_text: string | null; video_url: string | null; video_title: string | null }[];
  questions: { id: string; type: string; text: string; order: number; options: { id: string; text: string }[]; matching_pairs: { id: string; left: string; right: string }[] }[];
  lessons: LessonRow[];
  quizzes: QuizRow[];
};

const UI = {
  ar: {
    back: "العودة للخريطة",
    stage: "المرحلة",
    concept: "مفهوم",
    reference: "مرجع المفهوم من الإدارة",
    referenceSub: "اقرأ هذا أولاً — هو الأساس الذي تبني عليه درسك واختبارك.",
    refQuestions: "أسئلة مرجعية",
    noContent: "لم تضف الإدارة محتوى لهذا المفهوم بعد.",
    noQuestions: "لا توجد أسئلة مرجعية لهذا المفهوم.",
    myLessons: "دروسي على هذا المفهوم",
    myLessonsSub: "الدرس يحتوي شرحاً (نص/صور/فيديو) وأسئلة يجيب عنها الطالب.",
    myQuizzes: "اختباراتي على هذا المفهوم",
    myQuizzesSub: "الاختبار أسئلة فقط، بدون شرح — لقياس فهم الطالب.",
    addLesson: "إضافة درس",
    addQuiz: "إضافة اختبار",
    emptyLessons: "لم تضف أي درس لهذا المفهوم بعد.",
    emptyLessonsSub: "اضغط «إضافة درس» لإنشاء أول درس، ثم ستنتقل مباشرة إلى صفحة بناء المحتوى.",
    emptyQuizzes: "لم تضف أي اختبار لهذا المفهوم بعد.",
    emptyQuizzesSub: "اضغط «إضافة اختبار» لإنشاء اختبار، ثم أضف الأسئلة داخله.",
    open: "فتح وتعديل",
    submit: "إرسال للمراجعة",
    submitting: "جارٍ الإرسال…",
    classLabel: "الفصل",
    legacy: "قديم",
    reviewerNotes: "ملاحظات المراجع",
    contents: "محتوى",
    questions: "سؤال",
    attempts: "طالب أجاب",
    newLesson: "درس جديد لهذا المفهوم",
    newQuiz: "اختبار جديد لهذا المفهوم",
    fieldTitle: "العنوان",
    titlePhLesson: "مثال: مقدمة في هذا المفهوم",
    titlePhQuiz: "مثال: اختبار قصير على المفهوم",
    fieldClass: "الفصل الذي سيرى المحتوى",
    fieldDesc: "وصف مختصر (اختياري)",
    cancel: "إلغاء",
    create: "إنشاء ومتابعة",
    creating: "جارٍ الإنشاء…",
    needClass: "ليس لديك فصل بعد. تواصل مع الإدارة لتخصيص فصل لك قبل إنشاء المحتوى.",
    error: "حدث خطأ، حاول مرة أخرى.",
    titleRequired: "العنوان مطلوب.",
    lockedHint: "المحتوى المُرسل للمراجعة أو المعتمد لا يمكن تعديله.",
    guide: [
      { title: "اقرأ المرجع", body: "راجع محتوى الإدارة والأسئلة المرجعية بالأعلى قبل أن تبدأ." },
      { title: "أنشئ درساً أو اختباراً", body: "اضغط «إضافة درس» أو «إضافة اختبار» واختر الفصل المستهدف." },
      { title: "أضف المحتوى والأسئلة", body: "ستنتقل تلقائياً لصفحة البناء لإضافة الشرح والأسئلة." },
      { title: "أرسل للمراجعة", body: "اضغط «إرسال للمراجعة» — يظهر للطلاب بعد اعتماد الإدارة فقط." },
    ],
  },
  sq: {
    back: "Kthehu te harta",
    stage: "Faza",
    concept: "Koncepti",
    reference: "Materiali i konceptit nga administrata",
    referenceSub: "Lexoje këtë të parin — mbi të ndërton mësimin dhe kuizin tënd.",
    refQuestions: "Pyetje referuese",
    noContent: "Administrata ende nuk ka shtuar përmbajtje.",
    noQuestions: "Nuk ka pyetje referuese.",
    myLessons: "Mësimet e mia për këtë koncept",
    myLessonsSub: "Mësimi përmban shpjegim (tekst/foto/video) dhe pyetje për nxënësin.",
    myQuizzes: "Kuizet e mia për këtë koncept",
    myQuizzesSub: "Kuizi ka vetëm pyetje, pa shpjegim — për të matur kuptimin.",
    addLesson: "Shto mësim",
    addQuiz: "Shto kuiz",
    emptyLessons: "Nuk ke shtuar ende asnjë mësim.",
    emptyLessonsSub: "Kliko «Shto mësim» dhe do të kalosh te faqja e ndërtimit.",
    emptyQuizzes: "Nuk ke shtuar ende asnjë kuiz.",
    emptyQuizzesSub: "Kliko «Shto kuiz» dhe pastaj shto pyetjet brenda tij.",
    open: "Hap dhe modifiko",
    submit: "Dërgo për shqyrtim",
    submitting: "Po dërgohet…",
    classLabel: "Klasa",
    legacy: "I vjetër",
    reviewerNotes: "Shënimet e shqyrtuesit",
    contents: "përmbajtje",
    questions: "pyetje",
    attempts: "nxënës u përgjigjën",
    newLesson: "Mësim i ri për këtë koncept",
    newQuiz: "Kuiz i ri për këtë koncept",
    fieldTitle: "Titulli",
    titlePhLesson: "P.sh.: Hyrje në këtë koncept",
    titlePhQuiz: "P.sh.: Kuiz i shkurtër",
    fieldClass: "Klasa që do ta shohë",
    fieldDesc: "Përshkrim i shkurtër (opsional)",
    cancel: "Anulo",
    create: "Krijo dhe vazhdo",
    creating: "Po krijohet…",
    needClass: "Nuk ke asnjë klasë. Kontakto administratën përpara se të krijosh përmbajtje.",
    error: "Ndodhi një gabim, provo përsëri.",
    titleRequired: "Titulli kërkohet.",
    lockedHint: "Përmbajtja e dërguar ose e miratuar nuk mund të modifikohet.",
    guide: [
      { title: "Lexo materialin", body: "Shiko përmbajtjen dhe pyetjet referuese më lart." },
      { title: "Krijo mësim ose kuiz", body: "Kliko «Shto mësim» ose «Shto kuiz» dhe zgjidh klasën." },
      { title: "Shto përmbajtje", body: "Do të kalosh te faqja e ndërtimit për shpjegimin dhe pyetjet." },
      { title: "Dërgo për shqyrtim", body: "Nxënësit e shohin vetëm pas miratimit." },
    ],
  },
} as const;

export default function TeacherModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const router = useRouter();
  const Back = L === "ar" ? ChevronRight : ChevronLeft;

  const [data, setData] = useState<{ module: ModuleDetail; classes: { id: string; name: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | { kind: "lesson" | "quiz" }>(null);
  const [form, setForm] = useState({ title: "", classId: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const reload = () => {
    setLoading(true);
    setLoadError(false);
    fetch(`/api/teacher/modules/${id}`, { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((payload) => setData(payload?.module ? payload : null))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(reload, [id]);

  async function submitForReview(kind: "lesson" | "quiz", itemId: string) {
    setSubmittingId(itemId);
    const path = kind === "lesson"
      ? `/api/teacher/lessons/${itemId}/submit`
      : `/api/teacher/quizzes/${itemId}/submit`;
    await fetch(path, { method: "POST" }).catch(() => {});
    setSubmittingId(null);
    reload();
  }

  function openCreate(kind: "lesson" | "quiz") {
    setForm({ title: "", classId: data?.classes[0]?.id ?? "", description: "" });
    setError("");
    setDialog({ kind });
  }

  async function create() {
    if (!dialog || !data) return;
    if (!form.title.trim()) { setError(T.titleRequired); return; }
    if (!form.classId) { setError(T.needClass); return; }
    setCreating(true);
    setError("");
    try {
      if (dialog.kind === "lesson") {
        const response = await fetch("/api/teacher/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            classId: form.classId,
            moduleId: data.module.id,
          }),
        });
        if (!response.ok) throw new Error();
        const { lesson } = await response.json();
        router.push(`/teacher/lessons/${lesson.id}`);
      } else {
        // Create the quiz immediately (empty), then go straight to its builder.
        // The old flow pushed to /teacher/quizzes?new=1 which was never read,
        // so quiz creation silently did nothing.
        const response = await fetch("/api/teacher/quizzes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.title.trim(),
            classId: form.classId,
            moduleId: data.module.id,
          }),
        });
        if (!response.ok) throw new Error();
        const quiz = await response.json();
        router.push(`/teacher/quizzes/${quiz.id}`);
      }
    } catch {
      setError(T.error);
      setCreating(false);
    }
  }

  if (loading) return <MandalaLoader />;
  if (loadError || !data) return <TeacherLoadError onRetry={reload} />;

  const concept = data.module;
  const noClasses = data.classes.length === 0;

  return (
    <div className="tui tm" dir={dir}>
      <Link href="/teacher/roadmap" className="tm-back"><Back size={15} />{T.back}</Link>

      <header className="tui-hero">
        <div className="tui-hero-inner">
          <div>
            <span className="tui-eyebrow">{T.stage} {concept.stage.order} · {concept.stage.title}</span>
            <h1>{concept.title}</h1>
            {concept.description && <p>{concept.description}</p>}
          </div>
          <div className="tui-hero-side">
            <button className="tui-btn tui-btn-gold" onClick={() => openCreate("lesson")} disabled={noClasses}>
              <Plus size={15} />{T.addLesson}
            </button>
            <button className="tui-btn tui-btn-ghost" onClick={() => openCreate("quiz")} disabled={noClasses}>
              <Plus size={15} />{T.addQuiz}
            </button>
          </div>
        </div>
      </header>

      {noClasses && (
        <div className="tui-note tui-note-warn tm-standalone-note"><AlertCircle size={15} />{T.needClass}</div>
      )}

      <HowItWorks id="concept" steps={T.guide as unknown as { title: string; body: string }[]} lang={L} />

      {/* Admin reference material */}
      <section className="tui-card tm-block">
        <div className="tui-section-head">
          <div>
            <h2><Info size={16} />{T.reference}</h2>
            <p>{T.referenceSub}</p>
          </div>
        </div>
        {concept.contents.length === 0 ? (
          <div className="tui-empty"><strong>{T.noContent}</strong></div>
        ) : (
          <div className="tm-contents">
            {concept.contents.map((content) => (
              <div key={content.id} className="tm-content">
                {content.type === "TEXT" && <p className="tm-content-text">{content.body}</p>}
                {content.type === "IMAGE" && content.image_url && (
                  <Image src={content.image_url} alt={content.alt_text || ""} className="tm-content-img" width={960} height={540} unoptimized />
                )}
                {content.type === "VIDEO" && content.video_url && (
                  <a className="tm-content-video" href={content.video_url} target="_blank" rel="noreferrer">
                    <FileText size={15} />{content.video_title || "Video"}<ExternalLink size={13} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {concept.questions.length > 0 && (
          <div className="tm-ref-questions">
            <h3>{T.refQuestions} <span>({concept.questions.length})</span></h3>
            <ol>
              {concept.questions.map((question) => (
                <li key={question.id}>
                  <span className="tm-ref-q">{question.text}</span>
                  {question.options.length > 0 && (
                    <ul>{question.options.map((option) => <li key={option.id}>{option.text}</li>)}</ul>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* Lessons */}
      <section className="tui-card tm-block">
        <div className="tui-section-head">
          <div>
            <h2><BookOpen size={16} />{T.myLessons} <span className="tm-count">{concept.lessons.length}</span></h2>
            <p>{T.myLessonsSub}</p>
          </div>
          <div>
            <button className="tui-btn tui-btn-primary tui-btn-sm" onClick={() => openCreate("lesson")} disabled={noClasses}>
              <Plus size={14} />{T.addLesson}
            </button>
          </div>
        </div>
        {concept.lessons.length === 0 ? (
          <div className="tui-empty">
            <span className="tui-empty-icon"><BookOpen size={20} /></span>
            <strong>{T.emptyLessons}</strong>
            <p>{T.emptyLessonsSub}</p>
          </div>
        ) : (
          <div className="tm-items">
            {concept.lessons.map((lesson) => (
              <ContentCard
                key={lesson.id}
                href={`/teacher/lessons/${lesson.id}`}
                title={lesson.title}
                classLabel={`${T.classLabel}: ${lesson.class.name}`}
                meta={`${lesson._count.contents} ${T.contents} · ${lesson._count.questions} ${T.questions} · ${lesson._count.attempts} ${T.attempts}`}
                reviewStatus={lesson.review_status}
                reviewerNotes={lesson.reviewer_notes}
                isLegacy={lesson.is_legacy}
                T={T} L={L}
                onSubmit={() => submitForReview("lesson", lesson.id)}
                submitting={submittingId === lesson.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Quizzes */}
      <section className="tui-card tm-block">
        <div className="tui-section-head">
          <div>
            <h2><ClipboardList size={16} />{T.myQuizzes} <span className="tm-count">{concept.quizzes.length}</span></h2>
            <p>{T.myQuizzesSub}</p>
          </div>
          <div>
            <button className="tui-btn tui-btn-primary tui-btn-sm" onClick={() => openCreate("quiz")} disabled={noClasses}>
              <Plus size={14} />{T.addQuiz}
            </button>
          </div>
        </div>
        {concept.quizzes.length === 0 ? (
          <div className="tui-empty">
            <span className="tui-empty-icon"><ClipboardList size={20} /></span>
            <strong>{T.emptyQuizzes}</strong>
            <p>{T.emptyQuizzesSub}</p>
          </div>
        ) : (
          <div className="tm-items">
            {concept.quizzes.map((quiz) => (
              <ContentCard
                key={quiz.id}
                href={`/teacher/quizzes/${quiz.id}`}
                title={quiz.name}
                classLabel={`${T.classLabel}: ${quiz.class.name}`}
                meta={`${quiz._count.questions} ${T.questions} · ${quiz._count.attempts} ${T.attempts}`}
                reviewStatus={quiz.review_status}
                reviewerNotes={quiz.reviewer_notes}
                isLegacy={quiz.is_legacy}
                T={T} L={L}
                onSubmit={() => submitForReview("quiz", quiz.id)}
                submitting={submittingId === quiz.id}
              />
            ))}
          </div>
        )}
      </section>

      {dialog && (
        <div className="tm-overlay" onMouseDown={(event) => event.target === event.currentTarget && !creating && setDialog(null)}>
          <div className="tm-dialog" role="dialog" aria-modal="true" dir={dir}>
            <header>
              <h3>{dialog.kind === "lesson" ? T.newLesson : T.newQuiz}</h3>
              <button onClick={() => setDialog(null)} disabled={creating} aria-label={T.cancel}><X size={18} /></button>
            </header>
            <div className="tm-dialog-body">
              <label className="tm-field">
                <span>{T.fieldTitle}</span>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder={dialog.kind === "lesson" ? T.titlePhLesson : T.titlePhQuiz}
                  dir="auto"
                />
              </label>
              <label className="tm-field">
                <span>{T.fieldClass}</span>
                <select value={form.classId} onChange={(event) => setForm({ ...form, classId: event.target.value })}>
                  {data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              {dialog.kind === "lesson" && (
                <label className="tm-field">
                  <span>{T.fieldDesc}</span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    dir="auto"
                  />
                </label>
              )}
              {error && <div className="tui-note tui-note-warn"><AlertCircle size={15} />{error}</div>}
            </div>
            <footer>
              <button className="tui-btn tui-btn-ghost" onClick={() => setDialog(null)} disabled={creating}>{T.cancel}</button>
              <button className="tui-btn tui-btn-primary" onClick={create} disabled={creating || !form.title.trim()}>
                {creating ? T.creating : T.create}
              </button>
            </footer>
          </div>
        </div>
      )}

      <style>{teacherUI}</style>
      <style>{styles}</style>
    </div>
  );
}

function ContentCard({
  href, title, classLabel, meta, reviewStatus, reviewerNotes, isLegacy, T, L, onSubmit, submitting,
}: {
  href: string;
  title: string;
  classLabel: string;
  meta: string;
  reviewStatus: ReviewStatus;
  reviewerNotes: string | null;
  isLegacy: boolean;
  T: typeof UI.ar | typeof UI.sq;
  L: "ar" | "sq";
  onSubmit: () => void;
  submitting: boolean;
}) {
  const canSubmit = !isLegacy && (reviewStatus === "DRAFT" || reviewStatus === "REJECTED");
  return (
    <article className={`tm-item${isLegacy ? " is-legacy" : ""}`}>
      <div className="tm-item-top">
        <h4>{title}</h4>
        <div className="tm-item-chips">
          {isLegacy && <span className="tui-chip tui-chip-legacy">{T.legacy}</span>}
          <span className={reviewChipClass[reviewStatus]}>
            {reviewStatus === "APPROVED" && <CheckCircle2 size={11} />}
            {reviewLabel[L][reviewStatus]}
          </span>
        </div>
      </div>
      <p className="tm-item-class">{classLabel}</p>
      <p className="tm-item-meta">{meta}</p>
      {reviewerNotes && (
        <div className="tui-note tui-note-warn tm-item-notes">
          <AlertCircle size={14} />
          <span><strong>{T.reviewerNotes}:</strong> {reviewerNotes}</span>
        </div>
      )}
      <div className="tm-item-actions">
        <Link href={href} className="tui-btn tui-btn-ghost tui-btn-sm">{T.open}</Link>
        {canSubmit && (
          <button className="tui-btn tui-btn-primary tui-btn-sm" onClick={onSubmit} disabled={submitting}>
            <Send size={13} />{submitting ? T.submitting : T.submit}
          </button>
        )}
      </div>
    </article>
  );
}

const styles = `
.tm{padding-bottom:28px}
.tm-back{display:inline-flex;align-items:center;gap:4px;margin-bottom:12px;color:#6B1E2D;font-size:12.5px;font-weight:900;text-decoration:none}
.tm-back:hover{text-decoration:underline}
.tm-standalone-note{margin-bottom:14px}
.tm-block{margin-bottom:14px}
.tm-count{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;
  background:#EFEAE0;color:#655B53;font-size:11px;font-weight:900}

.tm-contents{display:flex;flex-direction:column;gap:9px}
.tm-content{border:1px solid #E5E0D5;border-radius:12px;background:#F7F3EB;padding:13px 15px}
.tm-content-text{margin:0;font-size:13px;line-height:1.95;color:#4A0E1C;white-space:pre-wrap}
.tm-content-img{max-width:100%;height:auto;border-radius:10px;display:block}
.tm-content-video{display:inline-flex;align-items:center;gap:8px;color:#6B1E2D;font-size:12.5px;font-weight:800;text-decoration:none}

.tm-ref-questions{margin-top:14px;padding-top:13px;border-top:1px solid rgba(107,30,45,.16)}
.tm-ref-questions h3{margin:0 0 9px;font-size:13px;font-weight:900;color:#32101A}
.tm-ref-questions h3 span{color:#8C8274;font-weight:800}
.tm-ref-questions ol{margin:0;padding-inline-start:20px;display:flex;flex-direction:column;gap:9px}
.tm-ref-q{font-size:12.5px;font-weight:800;line-height:1.75;color:#4A0E1C}
.tm-ref-questions ul{margin:5px 0 0;padding-inline-start:18px;font-size:11.5px;color:#655B53;line-height:1.8}

.tm-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:11px}
.tm-item{display:flex;flex-direction:column;gap:6px;border:1px solid #E5E0D5;border-radius:15px;background:#FFFFFF;padding:14px 15px}
.tm-item.is-legacy{background:#F7F3EB;opacity:.8}
.tm-item-top{display:flex;justify-content:space-between;align-items:flex-start;gap:9px;flex-wrap:wrap}
.tm-item-top h4{margin:0;flex:1;min-width:0;font-size:13.5px;font-weight:900;line-height:1.4;color:#32101A}
.tm-item-chips{display:flex;gap:5px;flex-wrap:wrap}
.tm-item-class{margin:0;font-size:11.5px;font-weight:800;color:#6B1E2D}
.tm-item-meta{margin:0;font-size:11px;color:#8C8274}
.tm-item-notes{margin-top:4px;font-size:11.5px}
.tm-item-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:auto;padding-top:8px}

.tm-overlay{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:16px;
  background:rgba(26,26,26,.6);backdrop-filter:blur(6px)}
.tm-dialog{width:min(520px,100%);max-height:92vh;display:flex;flex-direction:column;overflow:hidden;
  border-radius:20px;background:#FFFBF5;border:1px solid rgba(217,201,176,.45);box-shadow:0 26px 74px rgba(26,26,26,.34);
  font-family:'Cairo',sans-serif}
.tm-dialog>header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex:none;padding:16px 20px;
  background:linear-gradient(135deg,#6B1E2D,#6B1E2D);color:#F7F3EB}
.tm-dialog>header h3{margin:0;font-size:15.5px}
.tm-dialog>header button{width:32px;height:32px;flex:none;display:grid;place-items:center;border:1px solid rgba(255,255,255,.2);
  border-radius:9px;background:rgba(255,255,255,.08);color:#FFFFFF;cursor:pointer}
.tm-dialog-body{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:13px}
.tm-field{display:flex;flex-direction:column;gap:6px}
.tm-field>span{font-size:12px;font-weight:900;color:#4A0E1C}
.tm-field input,.tm-field select,.tm-field textarea{width:100%;box-sizing:border-box;min-height:44px;border:1px solid #D9C9B0;
  border-radius:11px;background:#FFFFFF;padding:10px 12px;font:inherit;font-size:13.5px;color:#32101A}
.tm-field textarea{min-height:78px;resize:vertical;line-height:1.7}
.tm-field input:focus,.tm-field select:focus,.tm-field textarea:focus{outline:none;border-color:#6B1E2D;box-shadow:0 0 0 3px rgba(107,30,45,.1)}
.tm-dialog>footer{display:flex;justify-content:flex-end;gap:8px;flex:none;padding:14px 20px;border-top:1px solid rgba(107,30,45,.2)}

@media(max-width:560px){
  .tm-items{grid-template-columns:1fr}
  .tm-overlay{padding:0;align-items:stretch}
  .tm-dialog{width:100%;max-height:100vh;border-radius:0;border:0}
  .tm-dialog>footer>*{flex:1}
}
`;
