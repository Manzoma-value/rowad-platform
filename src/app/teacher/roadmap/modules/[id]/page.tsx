"use client";
export const dynamic = "force-dynamic";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";

type ReviewStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

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
    back: "← العودة للخريطة",
    stage: "مرحلة",
    module: "مفهوم",
    sectionContent: "محتوى المفهوم (من إعداد الإدارة)",
    sectionQuestions: "أسئلة المفهوم",
    sectionLessons: "دروسي على هذا المفهوم",
    sectionQuizzes: "اختباراتي على هذا المفهوم",
    noContent: "لم يضف الأدمن محتوى لهذا المفهوم بعد.",
    noQuestions: "لا توجد أسئلة لهذا المفهوم.",
    addLesson: "إضافة درس",
    addQuiz: "إضافة اختبار",
    emptyLessons: "لم تضف أي درس لهذا المفهوم بعد.",
    emptyQuizzes: "لم تضف أي اختبار لهذا المفهوم بعد.",
    open: "افتح",
    submit: "إرسال للمراجعة",
    submitting: "جارٍ الإرسال…",
    submitted: "أُرسل ✓",
    statusDRAFT: "مسودة",
    statusPENDING_REVIEW: "قيد المراجعة",
    statusAPPROVED: "معتمد",
    statusREJECTED: "مرفوض",
    reviewerNotesLabel: "ملاحظات المراجع:",
    classCol: "الفصل",
    countsLesson: (c: number, q: number, a: number) => `${c} محتوى · ${q} سؤال · ${a} طالب أجاب`,
    countsQuiz: (q: number, a: number) => `${q} سؤال · ${a} طالب أجاب`,
    // Create dialog
    newLessonTitle: "درس جديد لهذا المفهوم",
    newQuizTitle: "اختبار جديد لهذا المفهوم",
    fieldTitle: "العنوان",
    fieldClass: "الفصل",
    fieldDesc: "وصف (اختياري)",
    cancel: "إلغاء",
    create: "إنشاء",
    creating: "جارٍ الإنشاء…",
    needClass: "ليس لديك فصل لإضافة الدرس فيه. تواصل مع الإدارة.",
    error: "حدث خطأ، حاول مرة أخرى.",
  },
  sq: {
    back: "← Kthehu te harta",
    stage: "Faza",
    module: "Koncepti",
    sectionContent: "Përmbajtja e konceptit (përgatitur nga administrata)",
    sectionQuestions: "Pyetjet e konceptit",
    sectionLessons: "Mësimet e mia për këtë koncept",
    sectionQuizzes: "Kuizet e mia për këtë koncept",
    noContent: "Administrata ende nuk ka shtuar përmbajtje për këtë koncept.",
    noQuestions: "Nuk ka pyetje për këtë koncept.",
    addLesson: "Shto mësim",
    addQuiz: "Shto kuiz",
    emptyLessons: "Nuk ke shtuar ende asnjë mësim për këtë koncept.",
    emptyQuizzes: "Nuk ke shtuar ende asnjë kuiz për këtë koncept.",
    open: "Hap",
    submit: "Dërgo për shqyrtim",
    submitting: "Po dërgohet…",
    submitted: "U dërgua ✓",
    statusDRAFT: "Draft",
    statusPENDING_REVIEW: "Në shqyrtim",
    statusAPPROVED: "Miratuar",
    statusREJECTED: "Refuzuar",
    reviewerNotesLabel: "Shënimet e shqyrtuesit:",
    classCol: "Klasa",
    countsLesson: (c: number, q: number, a: number) => `${c} përmbajtje · ${q} pyetje · ${a} nxënës iu përgjigjën`,
    countsQuiz: (q: number, a: number) => `${q} pyetje · ${a} nxënës iu përgjigjën`,
    newLessonTitle: "Mësim i ri për këtë koncept",
    newQuizTitle: "Kuiz i ri për këtë koncept",
    fieldTitle: "Titulli",
    fieldClass: "Klasa",
    fieldDesc: "Përshkrimi (opsional)",
    cancel: "Anulo",
    create: "Krijo",
    creating: "Po krijohet…",
    needClass: "Nuk ke asnjë klasë për të shtuar mësim. Kontakto administratën.",
    error: "Ndodhi një gabim, provo përsëri.",
  },
} as const;

export default function TeacherModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const router = useRouter();

  const [data, setData] = useState<{ module: ModuleDetail; classes: { id: string; name: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [dlg, setDlg] = useState<null | { kind: "lesson" | "quiz" }>(null);
  const [form, setForm] = useState({ title: "", classId: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const reload = () => {
    setLoading(true);
    fetch(`/api/teacher/modules/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d?.module ? d : null))
      .catch(() => setData(null))
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
    setDlg({ kind });
  }

  async function create() {
    if (!dlg || !data) return;
    if (!form.title.trim() || !form.classId) {
      setError(T.error);
      return;
    }
    setCreating(true);
    try {
      if (dlg.kind === "lesson") {
        const r = await fetch("/api/teacher/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            classId: form.classId,
            moduleId: data.module.id,
          }),
        });
        if (!r.ok) throw new Error();
        const { lesson } = await r.json();
        router.push(`/teacher/lessons/${lesson.id}`);
      } else {
        // For quiz, push to dedicated builder with pre-filled module+class
        const u = new URLSearchParams({ moduleId: data.module.id, classId: form.classId, name: form.title.trim() });
        router.push(`/teacher/quizzes?new=1&${u.toString()}`);
      }
    } catch {
      setError(T.error);
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <MandalaLoader />;
  if (!data) return null;

  const m = data.module;

  return (
    <div className="tm-page" dir={dir}>
      <Link href="/teacher/roadmap" className="tm-back">{T.back}</Link>

      <header className="tm-hero">
        <div className="tm-trail">
          <span className="tm-trail-stage">{T.stage} {m.stage.order} · {m.stage.title}</span>
        </div>
        <h1 className="tm-title">
          <span className="tm-mod-num">{T.module} {m.order}</span>
          {m.title}
        </h1>
        {m.description && <p className="tm-desc">{m.description}</p>}
      </header>

      {/* Admin content */}
      <section className="tm-section">
        <h2 className="tm-sec-title">{T.sectionContent}</h2>
        {m.contents.length === 0 ? (
          <div className="tm-empty">{T.noContent}</div>
        ) : (
          <div className="tm-content-list">
            {m.contents.map((c) => (
              <div key={c.id} className="tm-content-item">
                {c.type === "TEXT" && <p className="tm-content-text">{c.body}</p>}
                {c.type === "IMAGE" && c.image_url && (
                  <div className="tm-content-img-wrap">
                    <img src={c.image_url} alt={c.alt_text || ""} className="tm-content-img" />
                  </div>
                )}
                {c.type === "VIDEO" && c.video_url && (
                  <div className="tm-content-video">
                    <strong>{c.video_title || "Video"}</strong>
                    <a href={c.video_url} target="_blank" rel="noreferrer" className="tm-vid-link">↗</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Admin questions */}
      <section className="tm-section">
        <h2 className="tm-sec-title">{T.sectionQuestions} <span className="tm-sec-count">({m.questions.length})</span></h2>
        {m.questions.length === 0 ? (
          <div className="tm-empty">{T.noQuestions}</div>
        ) : (
          <ol className="tm-q-list">
            {m.questions.map((q) => (
              <li key={q.id} className="tm-q-item">
                <div className="tm-q-text">{q.text}</div>
                {q.options.length > 0 && (
                  <ul className="tm-q-options">
                    {q.options.map((o) => <li key={o.id}>{o.text}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* My lessons */}
      <section className="tm-section">
        <header className="tm-sec-head">
          <h2 className="tm-sec-title">{T.sectionLessons} <span className="tm-sec-count">({m.lessons.length})</span></h2>
          <button
            className="tm-add-btn"
            onClick={() => openCreate("lesson")}
            disabled={data.classes.length === 0}
            title={data.classes.length === 0 ? T.needClass : undefined}
          >+ {T.addLesson}</button>
        </header>
        {m.lessons.length === 0 ? (
          <div className="tm-empty">{T.emptyLessons}</div>
        ) : (
          <div className="tm-cards">
            {m.lessons.map((l) => (
              <ContentCard
                key={l.id}
                kind="lesson"
                href={`/teacher/lessons/${l.id}`}
                title={l.title}
                subtitle={`${T.classCol}: ${l.class.name}`}
                meta={T.countsLesson(l._count.contents, l._count.questions, l._count.attempts)}
                review_status={l.review_status}
                reviewer_notes={l.reviewer_notes}
                is_legacy={l.is_legacy}
                T={T}
                onSubmit={() => submitForReview("lesson", l.id)}
                submitting={submittingId === l.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* My quizzes */}
      <section className="tm-section">
        <header className="tm-sec-head">
          <h2 className="tm-sec-title">{T.sectionQuizzes} <span className="tm-sec-count">({m.quizzes.length})</span></h2>
          <button
            className="tm-add-btn"
            onClick={() => openCreate("quiz")}
            disabled={data.classes.length === 0}
            title={data.classes.length === 0 ? T.needClass : undefined}
          >+ {T.addQuiz}</button>
        </header>
        {m.quizzes.length === 0 ? (
          <div className="tm-empty">{T.emptyQuizzes}</div>
        ) : (
          <div className="tm-cards">
            {m.quizzes.map((q) => (
              <ContentCard
                key={q.id}
                kind="quiz"
                href={`/teacher/quizzes/${q.id}`}
                title={q.name}
                subtitle={`${T.classCol}: ${q.class.name}`}
                meta={T.countsQuiz(q._count.questions, q._count.attempts)}
                review_status={q.review_status}
                reviewer_notes={q.reviewer_notes}
                is_legacy={q.is_legacy}
                T={T}
                onSubmit={() => submitForReview("quiz", q.id)}
                submitting={submittingId === q.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Create dialog */}
      {dlg && (
        <div className="tm-dlg-overlay" onClick={() => !creating && setDlg(null)}>
          <div className="tm-dlg" onClick={(e) => e.stopPropagation()} dir={dir}>
            <h3 className="tm-dlg-title">{dlg.kind === "lesson" ? T.newLessonTitle : T.newQuizTitle}</h3>
            <label className="tm-dlg-lbl">{T.fieldTitle}</label>
            <input
              className="tm-dlg-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
            />
            <label className="tm-dlg-lbl">{T.fieldClass}</label>
            <select
              className="tm-dlg-input"
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
            >
              {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {dlg.kind === "lesson" && (
              <>
                <label className="tm-dlg-lbl">{T.fieldDesc}</label>
                <textarea
                  className="tm-dlg-input"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </>
            )}
            {error && <div className="tm-dlg-err">{error}</div>}
            <div className="tm-dlg-actions">
              <button className="tm-dlg-cancel" onClick={() => setDlg(null)} disabled={creating}>{T.cancel}</button>
              <button className="tm-dlg-create" onClick={create} disabled={creating || !form.title.trim() || !form.classId}>
                {creating ? T.creating : T.create}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        .tm-page { font-family: 'Cairo', sans-serif; padding-bottom: 40px; }
        .tm-back { display: inline-block; color: #6B1E2D; font-size: 13px; font-weight: 700; text-decoration: none; margin-bottom: 14px; }
        .tm-back:hover { text-decoration: underline; }
        .tm-hero { margin-bottom: 22px; }
        .tm-trail { font-size: 11.5px; color: #8F765B; font-weight: 800; letter-spacing: 0.04em; margin-bottom: 8px; text-transform: uppercase; }
        .tm-title { font-size: 26px; font-weight: 900; color: #32101A; margin: 0 0 8px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .tm-mod-num { background: linear-gradient(180deg,#D8B96A,#B8A082); color: #4A0E1C; padding: 3px 11px; border-radius: 99px; font-size: 12px; font-weight: 900; }
        .tm-desc { font-size: 14px; color: #6B1E2D; line-height: 1.85; margin: 0; max-width: 780px; }
        .tm-section { margin-top: 28px; background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 16px; padding: 20px; }
        .tm-sec-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
        .tm-sec-title { font-size: 17px; font-weight: 900; color: #32101A; margin: 0; }
        .tm-sec-count { color: #8C8274; font-weight: 700; font-size: 13.5px; }
        .tm-add-btn { background: linear-gradient(180deg,#5B1526,#32101A); color: #B8A082; border: none; padding: 9px 16px; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer; transition: all .16s; }
        .tm-add-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(26,26,26,0.25); }
        .tm-add-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .tm-empty { padding: 28px 18px; text-align: center; color: #8C8274; font-weight: 700; font-size: 13.5px; background: rgba(194,160,89,0.05); border-radius: 12px; }
        .tm-content-list { display: flex; flex-direction: column; gap: 12px; }
        .tm-content-item { padding: 14px 16px; background: rgba(194,160,89,0.05); border-radius: 11px; border: 1px solid rgba(194,160,89,0.16); }
        .tm-content-text { margin: 0; font-size: 14px; line-height: 1.95; color: #4A0E1C; white-space: pre-wrap; }
        .tm-content-img-wrap { max-width: 100%; }
        .tm-content-img { max-width: 100%; border-radius: 10px; }
        .tm-content-video { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: #4A0E1C; }
        .tm-vid-link { color: #6B1E2D; text-decoration: none; font-size: 15px; }
        .tm-q-list { padding-inline-start: 22px; margin: 0; display: flex; flex-direction: column; gap: 12px; }
        .tm-q-item { color: #4A0E1C; }
        .tm-q-text { font-weight: 700; font-size: 13.5px; line-height: 1.7; }
        .tm-q-options { padding-inline-start: 18px; margin: 6px 0 0; font-size: 12.5px; color: #6B1E2D; }
        .tm-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap: 12px; }
        .tm-dlg-overlay { position: fixed; inset: 0; background: rgba(26,26,26,0.55); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; backdrop-filter: blur(4px); }
        .tm-dlg { background: #FFFBF5; border-radius: 16px; padding: 24px; max-width: 460px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .tm-dlg-title { font-size: 17px; font-weight: 900; color: #32101A; margin: 0 0 14px; }
        .tm-dlg-lbl { display: block; font-size: 12px; font-weight: 800; color: #6B1E2D; margin: 10px 0 4px; }
        .tm-dlg-input { width: 100%; padding: 10px 13px; border: 1.5px solid rgba(194,160,89,0.32); border-radius: 9px; font-family: inherit; font-size: 13.5px; background: #FFF; outline: none; }
        .tm-dlg-input:focus { border-color: #B8A082; }
        .tm-dlg-err { color: #6B1E2D; font-size: 12.5px; font-weight: 700; margin-top: 10px; }
        .tm-dlg-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
        .tm-dlg-cancel { background: none; border: 1px solid rgba(26,26,26,0.18); color: #655B53; padding: 9px 16px; border-radius: 9px; font-family: inherit; font-weight: 700; cursor: pointer; font-size: 13px; }
        .tm-dlg-create { background: linear-gradient(180deg,#5B1526,#32101A); color: #B8A082; border: none; padding: 9px 18px; border-radius: 9px; font-family: inherit; font-weight: 800; cursor: pointer; font-size: 13px; }
        .tm-dlg-create:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

/* ─── Reusable content card ─── */
function ContentCard({
  kind, href, title, subtitle, meta, review_status, reviewer_notes, is_legacy, T, onSubmit, submitting,
}: {
  kind: "lesson" | "quiz";
  href: string;
  title: string;
  subtitle: string;
  meta: string;
  review_status: ReviewStatus;
  reviewer_notes: string | null;
  is_legacy: boolean;
  T: typeof UI.ar | typeof UI.sq;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const statusLabel =
    review_status === "DRAFT" ? T.statusDRAFT :
    review_status === "PENDING_REVIEW" ? T.statusPENDING_REVIEW :
    review_status === "APPROVED" ? T.statusAPPROVED :
    T.statusREJECTED;

  const canSubmit = !is_legacy && (review_status === "DRAFT" || review_status === "REJECTED");

  return (
    <div className={`tm-card tm-card--${kind}${is_legacy ? " is-legacy" : ""}`}>
      <div className="tm-card-head">
        <h4 className="tm-card-title">{title}</h4>
        {is_legacy && <span className="tm-tag tm-tag--legacy">قديم</span>}
        <span className={`tm-tag tm-st-${review_status}`}>{statusLabel}</span>
      </div>
      <div className="tm-card-sub">{subtitle}</div>
      <div className="tm-card-meta">{meta}</div>
      {reviewer_notes && (
        <div className="tm-card-notes">
          <strong>{T.reviewerNotesLabel}</strong> {reviewer_notes}
        </div>
      )}
      <div className="tm-card-actions">
        <Link href={href} className="tm-card-link">{T.open} →</Link>
        {canSubmit && (
          <button className="tm-card-submit" onClick={onSubmit} disabled={submitting}>
            {submitting ? T.submitting : T.submit}
          </button>
        )}
      </div>
      <style>{`
        .tm-card { background: linear-gradient(165deg,#FFF7E5,#FBEDD2); border: 1.5px solid rgba(194,160,89,0.30); border-radius: 13px; padding: 14px 15px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 4px 12px rgba(150,115,50,0.06); }
        .tm-card.is-legacy { background: #F4F1EA; border-color: rgba(26,26,26,0.10); opacity: 0.78; }
        .tm-card-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .tm-card-title { font-size: 14px; font-weight: 900; color: #32101A; margin: 0; flex: 1; min-width: 0; line-height: 1.35; }
        .tm-tag { font-size: 10.5px; font-weight: 800; padding: 2px 8px; border-radius: 99px; letter-spacing: 0.04em; }
        .tm-tag--legacy { background: rgba(26,26,26,0.10); color: #655B53; }
        .tm-st-DRAFT { background: rgba(26,26,26,0.06); color: #655B53; }
        .tm-st-PENDING_REVIEW { background: rgba(194,160,89,0.18); color: #6B1E2D; }
        .tm-st-APPROVED { background: rgba(45,138,74,0.14); color: #1B5E20; }
        .tm-st-REJECTED { background: rgba(139,26,26,0.10); color: #6B1E2D; }
        .tm-card-sub { font-size: 11.5px; color: #6B1E2D; font-weight: 700; }
        .tm-card-meta { font-size: 11.5px; color: #8F765B; }
        .tm-card-notes { background: rgba(139,26,26,0.06); border: 1px solid rgba(139,26,26,0.18); padding: 8px 10px; border-radius: 8px; font-size: 12px; color: #5A1818; line-height: 1.7; margin-top: 4px; }
        .tm-card-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; gap: 8px; }
        .tm-card-link { color: #6B1E2D; font-size: 12.5px; font-weight: 800; text-decoration: none; }
        .tm-card-submit { background: linear-gradient(180deg,#D8B96A,#B8A082); color: #4A0E1C; border: none; padding: 6px 12px; border-radius: 8px; font-family: inherit; font-size: 11.5px; font-weight: 800; cursor: pointer; }
        .tm-card-submit:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
