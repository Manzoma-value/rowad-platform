"use client";
export const dynamic = "force-dynamic";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Lock,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import TeacherLoadError from "@/components/TeacherLoadError";
import { useConfirm } from "@/lib/confirm-dialog";
import { invalidateCache } from "@/lib/api-cache";
import { HowItWorks } from "../../components/HowItWorks";
import { teacherUI, reviewChipClass, reviewLabel, type ReviewStatus } from "../../components/teacher-ui";

type Option = { id: string; text: string; order: number };
type Question = { id: string; type: "MCQ" | "TF"; text: string; correct_answer: string | null; order: number; options: Option[] };
type Attempt = { id: string; score: number | null; total: number | null; submitted_at: string; student: { profile: { full_name: string } } };
type QuizDetail = {
  id: string;
  name: string;
  is_legacy: boolean;
  review_status: ReviewStatus;
  reviewer_notes: string | null;
  class: { id: string; name: string };
  module: { id: string; title: string; order: number; stage: { id: string; title: string; order: number } } | null;
  questions: Question[];
  attempts: Attempt[];
};

const UI = {
  ar: {
    back: "العودة للمفهوم",
    backList: "العودة للاختبارات",
    eyebrow: "بناء الاختبار",
    classLabel: "المجموعة",
    questions: "الأسئلة",
    questionsSub: "أضف أسئلة اختيار من متعدد أو صح/خطأ. يحتاج الاختبار سؤالاً واحداً على الأقل قبل إرساله.",
    addQuestion: "إضافة سؤال",
    noQuestions: "لا توجد أسئلة بعد",
    noQuestionsSub: "اضغط «إضافة سؤال» لبناء أول سؤال في هذا الاختبار.",
    results: "نتائج المستفيدين",
    resultsSub: "تظهر النتائج بعد أن يجيب المستفيدون على الاختبار.",
    noAttempts: "لم يجب أي مستفيد بعد.",
    submit: "إرسال للمراجعة",
    submitting: "جارٍ الإرسال…",
    submitHint: "بعد الإرسال لن تتمكن من التعديل حتى ترد الإدارة.",
    needQuestion: "أضف سؤالاً واحداً على الأقل قبل الإرسال.",
    locked: "هذا الاختبار قيد المراجعة أو معتمد — لا يمكن تعديله الآن.",
    lockedLegacy: "هذا اختبار قديم للعرض فقط.",
    rename: "تعديل الاسم",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف الاختبار",
    deleteConfirm: "سيتم حذف هذا الاختبار وكل أسئلته ونتائجه. هل أنت متأكد؟",
    deleteQuestion: "حذف السؤال",
    deleteQuestionConfirm: "حذف هذا السؤال؟",
    editQuestion: "تعديل",
    reviewerNotes: "ملاحظات المراجع",
    mcq: "اختيار من متعدد",
    tf: "صح / خطأ",
    qText: "نص السؤال",
    qTextPh: "اكتب نص السؤال هنا...",
    options: "الخيارات",
    optionsHint: "اكتب الخيارات ثم اضغط ✓ بجانب الإجابة الصحيحة",
    optionN: (i: number) => `الخيار ${i + 1}`,
    addOption: "إضافة خيار",
    removeOption: "حذف الخيار",
    markCorrect: "تحديد كإجابة صحيحة",
    correct: "الإجابة الصحيحة",
    trueLbl: "صح",
    falseLbl: "خطأ",
    newQuestion: "سؤال جديد",
    editQuestionTitle: "تعديل السؤال",
    add: "إضافة السؤال",
    saving: "جارٍ الحفظ...",
    errText: "نص السؤال مطلوب",
    errMcqMin: "أدخل خيارين على الأقل",
    errAnswer: "حدد الإجابة الصحيحة",
    error: "حدث خطأ، حاول مرة أخرى.",
    guide: [
      { title: "أضف الأسئلة", body: "اضغط «إضافة سؤال» واختر النوع: اختيار من متعدد أو صح/خطأ." },
      { title: "حدد الإجابة الصحيحة", body: "اكتب الخيارات ثم اضغط علامة ✓ بجانب الإجابة الصحيحة." },
      { title: "أرسل للمراجعة", body: "عند الانتهاء اضغط «إرسال للمراجعة» ليعتمده المشرف." },
      { title: "تابع النتائج", body: "بعد الاعتماد سيجيب المستفيدين، وتظهر نتائجهم في الأسفل." },
    ],
  },
  sq: {
    back: "Kthehu te koncepti",
    backList: "Kthehu te kuizet",
    eyebrow: "Ndërtimi i kuizit",
    classLabel: "Grupi",
    questions: "Pyetjet",
    questionsSub: "Shto pyetje me opsione ose të saktë/gabuar. Duhet të paktën një pyetje para dërgimit.",
    addQuestion: "Shto pyetje",
    noQuestions: "Ende pa pyetje",
    noQuestionsSub: "Kliko «Shto pyetje» për të ndërtuar pyetjen e parë.",
    results: "Rezultatet e pjesëmarrësve",
    resultsSub: "Rezultatet shfaqen pasi pjesëmarrësit të përgjigjen.",
    noAttempts: "Asnjë pjesëmarrës nuk është përgjigjur ende.",
    submit: "Dërgo për shqyrtim",
    submitting: "Po dërgohet…",
    submitHint: "Pas dërgimit nuk mund ta modifikosh derisa të përgjigjet administrata.",
    needQuestion: "Shto të paktën një pyetje para dërgimit.",
    locked: "Ky kuiz është në shqyrtim ose i miratuar — nuk modifikohet tani.",
    lockedLegacy: "Kuiz i vjetër, vetëm për lexim.",
    rename: "Ndrysho emrin",
    save: "Ruaj",
    cancel: "Anulo",
    delete: "Fshi kuizin",
    deleteConfirm: "Do të fshihet kuizi me të gjitha pyetjet dhe rezultatet. Je i sigurt?",
    deleteQuestion: "Fshi pyetjen",
    deleteQuestionConfirm: "Ta fshijmë këtë pyetje?",
    editQuestion: "Modifiko",
    reviewerNotes: "Shënimet e shqyrtuesit",
    mcq: "Shumë opsione",
    tf: "E saktë / E gabuar",
    qText: "Teksti i pyetjes",
    qTextPh: "Shkruani tekstin e pyetjes...",
    options: "Opsionet",
    optionsHint: "Shkruaj opsionet, pastaj kliko ✓ te e sakta",
    optionN: (i: number) => `Opsioni ${i + 1}`,
    addOption: "Shto opsion",
    removeOption: "Fshi opsionin",
    markCorrect: "Shëno si të saktë",
    correct: "Përgjigja e saktë",
    trueLbl: "E saktë",
    falseLbl: "E gabuar",
    newQuestion: "Pyetje e re",
    editQuestionTitle: "Modifiko pyetjen",
    add: "Shto pyetjen",
    saving: "Duke ruajtur...",
    errText: "Teksti i pyetjes kërkohet",
    errMcqMin: "Duhen të paktën 2 opsione",
    errAnswer: "Zgjidh përgjigjen e saktë",
    error: "Ndodhi një gabim, provo përsëri.",
    guide: [
      { title: "Shto pyetjet", body: "Kliko «Shto pyetje» dhe zgjidh llojin." },
      { title: "Zgjidh të saktën", body: "Shkruaj opsionet dhe kliko ✓ te përgjigja e saktë." },
      { title: "Dërgo për shqyrtim", body: "Në fund kliko «Dërgo për shqyrtim»." },
      { title: "Ndiq rezultatet", body: "Pas miratimit, rezultatet shfaqen më poshtë." },
    ],
  },
} as const;

export default function TeacherQuizBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const router = useRouter();
  const confirm = useConfirm();
  const Back = L === "ar" ? ChevronRight : ChevronLeft;

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [modal, setModal] = useState<null | { question?: Question }>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyQuestion, setBusyQuestion] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const response = await fetch(`/api/teacher/quizzes/${id}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      setQuiz(payload);
      setNameDraft(payload.name);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const locked = !!quiz && (quiz.is_legacy || quiz.review_status === "PENDING_REVIEW" || quiz.review_status === "APPROVED");

  async function saveName() {
    if (!quiz || !nameDraft.trim()) return;
    try {
      const response = await fetch(`/api/teacher/quizzes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft.trim() }),
      });
      if (!response.ok) throw new Error();
      setQuiz({ ...quiz, name: nameDraft.trim() });
      setRenaming(false);
      invalidateCache("/api/teacher/quizzes");
    } catch {
      setError(T.error);
    }
  }

  async function deleteQuestion(questionId: string) {
    if (!(await confirm({ message: T.deleteQuestionConfirm }))) return;
    setBusyQuestion(questionId);
    try {
      const response = await fetch(`/api/teacher/quizzes/questions/${questionId}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setQuiz((current) => current ? { ...current, questions: current.questions.filter((q) => q.id !== questionId) } : current);
    } catch {
      setError(T.error);
    } finally {
      setBusyQuestion(null);
    }
  }

  async function deleteQuiz() {
    if (!(await confirm({ message: T.deleteConfirm }))) return;
    await fetch(`/api/teacher/quizzes/${id}`, { method: "DELETE" }).catch(() => null);
    invalidateCache("/api/teacher/quizzes");
    router.push(quiz?.module ? `/teacher/roadmap/modules/${quiz.module.id}` : "/teacher/quizzes");
  }

  async function submitForReview() {
    if (!quiz || quiz.questions.length === 0) { setError(T.needQuestion); return; }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/teacher/quizzes/${id}/submit`, { method: "POST" });
      if (!response.ok) throw new Error();
      await load();
      invalidateCache("/api/teacher/quizzes");
    } catch {
      setError(T.error);
    } finally {
      setSubmitting(false);
    }
  }

  function onQuestionSaved(question: Question) {
    setQuiz((current) => {
      if (!current) return current;
      const exists = current.questions.some((item) => item.id === question.id);
      return {
        ...current,
        questions: exists
          ? current.questions.map((item) => (item.id === question.id ? question : item))
          : [...current.questions, question],
      };
    });
  }

  if (loading) return <MandalaLoader />;
  if (loadError || !quiz) return <TeacherLoadError onRetry={() => { setLoading(true); void load(); }} />;

  return (
    <div className="tui qb" dir={dir}>
      <Link href={quiz.module ? `/teacher/roadmap/modules/${quiz.module.id}` : "/teacher/quizzes"} className="qb-back">
        <Back size={15} />{quiz.module ? T.back : T.backList}
      </Link>

      <header className="tui-hero">
        <div className="tui-hero-inner">
          <div className="qb-hero-main">
            <span className="tui-eyebrow"><ClipboardList size={12} />{T.eyebrow}</span>
            {renaming ? (
              <div className="qb-rename">
                <input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} dir="auto" autoFocus />
                <button className="tui-btn tui-btn-gold tui-btn-sm" onClick={() => void saveName()}>{T.save}</button>
                <button className="tui-btn tui-btn-ghost tui-btn-sm" onClick={() => { setRenaming(false); setNameDraft(quiz.name); }}>{T.cancel}</button>
              </div>
            ) : (
              <h1>
                {quiz.name}
                {!locked && (
                  <button className="qb-rename-btn" onClick={() => setRenaming(true)} aria-label={T.rename} title={T.rename}>
                    <Pencil size={14} />
                  </button>
                )}
              </h1>
            )}
            <div className="qb-hero-tags">
              <span className={reviewChipClass[quiz.review_status]}>
                {quiz.review_status === "APPROVED" && <CheckCircle2 size={11} />}
                {reviewLabel[L][quiz.review_status]}
              </span>
              <span className="tui-chip tui-chip-neutral">{T.classLabel}: {quiz.class.name}</span>
              {quiz.module && <span className="tui-chip tui-chip-neutral">{quiz.module.stage.title} · {quiz.module.title}</span>}
            </div>
          </div>
          <div className="tui-hero-side">
            {!locked && (
              <button className="tui-btn tui-btn-gold" onClick={() => void submitForReview()} disabled={submitting || quiz.questions.length === 0}>
                <Send size={15} />{submitting ? T.submitting : T.submit}
              </button>
            )}
            {!quiz.is_legacy && (
              <button className="tui-btn tui-btn-ghost" onClick={() => void deleteQuiz()}>
                <Trash2 size={15} />{T.delete}
              </button>
            )}
          </div>
        </div>
      </header>

      {quiz.is_legacy && <div className="tui-note tui-note-info qb-note"><Lock size={15} />{T.lockedLegacy}</div>}
      {!quiz.is_legacy && locked && <div className="tui-note tui-note-info qb-note"><Lock size={15} />{T.locked}</div>}
      {quiz.reviewer_notes && (
        <div className="tui-note tui-note-warn qb-note">
          <AlertCircle size={15} /><span><strong>{T.reviewerNotes}:</strong> {quiz.reviewer_notes}</span>
        </div>
      )}
      {error && <div className="tui-note tui-note-warn qb-note"><AlertCircle size={15} />{error}</div>}

      {!locked && <HowItWorks id="quiz-builder" steps={T.guide as unknown as { title: string; body: string }[]} lang={L} />}

      <section className="tui-card qb-block">
        <div className="tui-section-head">
          <div>
            <h2><ClipboardList size={16} />{T.questions} <span className="qb-count">{quiz.questions.length}</span></h2>
            <p>{T.questionsSub}</p>
          </div>
          {!locked && (
            <div>
              <button className="tui-btn tui-btn-primary tui-btn-sm" onClick={() => setModal({})}>
                <Plus size={14} />{T.addQuestion}
              </button>
            </div>
          )}
        </div>

        {quiz.questions.length === 0 ? (
          <div className="tui-empty">
            <span className="tui-empty-icon"><ClipboardList size={20} /></span>
            <strong>{T.noQuestions}</strong>
            <p>{T.noQuestionsSub}</p>
          </div>
        ) : (
          <ol className="qb-questions">
            {quiz.questions.map((question, index) => (
              <li key={question.id} className="qb-question">
                <div className="qb-q-head">
                  <span className="qb-q-num">{index + 1}</span>
                  <span className="tui-chip tui-chip-neutral">{question.type === "MCQ" ? T.mcq : T.tf}</span>
                  {!locked && (
                    <span className="qb-q-actions">
                      <button onClick={() => setModal({ question })} aria-label={T.editQuestion} title={T.editQuestion}><Pencil size={13} /></button>
                      <button onClick={() => void deleteQuestion(question.id)} disabled={busyQuestion === question.id} aria-label={T.deleteQuestion} title={T.deleteQuestion}><Trash2 size={13} /></button>
                    </span>
                  )}
                </div>
                <p className="qb-q-text">{question.text}</p>
                <div className="qb-q-options">
                  {question.type === "TF" ? (
                    [["true", T.trueLbl], ["false", T.falseLbl]].map(([value, label]) => (
                      <span key={value} className={`qb-opt${question.correct_answer === value ? " correct" : ""}`}>
                        {question.correct_answer === value && <Check size={12} />}{label}
                      </span>
                    ))
                  ) : (
                    question.options.map((option) => (
                      <span key={option.id} className={`qb-opt${question.correct_answer === option.text ? " correct" : ""}`}>
                        {question.correct_answer === option.text && <Check size={12} />}{option.text}
                      </span>
                    ))
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
        {!locked && quiz.questions.length > 0 && <p className="qb-submit-hint">{T.submitHint}</p>}
      </section>

      <section className="tui-card qb-block">
        <div className="tui-section-head">
          <div>
            <h2><BarChart3 size={16} />{T.results} <span className="qb-count">{quiz.attempts.length}</span></h2>
            <p>{T.resultsSub}</p>
          </div>
        </div>
        {quiz.attempts.length === 0 ? (
          <div className="tui-empty"><strong>{T.noAttempts}</strong></div>
        ) : (
          <div className="qb-results">
            {quiz.attempts.map((attempt) => {
              const total = attempt.total ?? 0;
              const score = attempt.score ?? 0;
              const percent = total > 0 ? Math.round((score / total) * 100) : 0;
              const tone = percent >= 70 ? "good" : percent >= 50 ? "mid" : "low";
              return (
                <div key={attempt.id} className="qb-result">
                  <span className="qb-result-av">{attempt.student.profile.full_name.trim().charAt(0)}</span>
                  <span className="qb-result-name">{attempt.student.profile.full_name}</span>
                  <span className="tui-bar qb-result-bar"><i className={`is-${tone}`} style={{ width: `${percent}%` }} /></span>
                  <b className={`qb-result-score is-${tone}`}>{score}/{total}</b>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {modal && (
        <QuestionModal
          quizId={id}
          question={modal.question}
          T={T}
          dir={dir}
          onClose={() => setModal(null)}
          onSaved={onQuestionSaved}
        />
      )}

      <style>{teacherUI}</style>
      <style>{styles}</style>
    </div>
  );
}

/* ─────────── Question add/edit modal ─────────── */
function QuestionModal({
  quizId, question, T, dir, onClose, onSaved,
}: {
  quizId: string;
  question?: Question;
  T: typeof UI.ar | typeof UI.sq;
  dir: "rtl" | "ltr";
  onClose: () => void;
  onSaved: (question: Question) => void;
}) {
  const isEdit = !!question;
  const [type, setType] = useState<"MCQ" | "TF">(question?.type ?? "MCQ");
  const [text, setText] = useState(question?.text ?? "");
  const [options, setOptions] = useState<string[]>(() => {
    const existing = question?.options?.map((option) => option.text) ?? [];
    const seeded = existing.length ? [...existing] : ["", ""];
    while (seeded.length < 2) seeded.push("");
    return seeded;
  });
  // Correct answer held as an INDEX so marking it before typing works, and
  // renaming an option can't silently detach the answer.
  const [correctIndex, setCorrectIndex] = useState(() =>
    question && question.type === "MCQ"
      ? question.options.findIndex((option) => option.text === question.correct_answer)
      : -1);
  const [tfAnswer, setTfAnswer] = useState(question?.type === "TF" ? question.correct_answer ?? "" : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function validate() {
    if (!text.trim()) return T.errText;
    if (type === "MCQ") {
      if (options.filter((option) => option.trim()).length < 2) return T.errMcqMin;
      if (correctIndex < 0 || !options[correctIndex]?.trim()) return T.errAnswer;
    }
    if (type === "TF" && !tfAnswer) return T.errAnswer;
    return "";
  }

  async function save() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = { type, text: text.trim() };
      if (type === "MCQ") {
        body.options = options.map((option) => option.trim()).filter(Boolean);
        body.correct_answer = options[correctIndex]?.trim() ?? "";
      } else {
        body.correct_answer = tfAnswer;
      }
      const url = isEdit
        ? `/api/teacher/quizzes/questions/${question!.id}`
        : `/api/teacher/quizzes/${quizId}/questions`;
      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "failed");
      onSaved(payload.question);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : T.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="qb-overlay" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <div className="qb-modal" role="dialog" aria-modal="true" dir={dir}>
        <header>
          <h3>{isEdit ? T.editQuestionTitle : T.newQuestion}</h3>
          <button onClick={onClose} disabled={saving} aria-label={T.cancel}><X size={18} /></button>
        </header>
        <div className="qb-modal-body">
          {!isEdit && (
            <div className="qb-type-row">
              <button type="button" className={`qb-type-btn${type === "MCQ" ? " active" : ""}`} onClick={() => setType("MCQ")}>{T.mcq}</button>
              <button type="button" className={`qb-type-btn${type === "TF" ? " active" : ""}`} onClick={() => setType("TF")}>{T.tf}</button>
            </div>
          )}

          <label className="qb-field">
            <span>{T.qText}</span>
            <textarea rows={3} dir="auto" value={text} onChange={(event) => setText(event.target.value)} placeholder={T.qTextPh} />
          </label>

          {type === "MCQ" ? (
            <div className="qb-field">
              <span>{T.options} <em>{T.optionsHint}</em></span>
              <div className="qb-opts">
                {options.map((option, index) => (
                  <div key={index} className={`qb-opt-row${correctIndex === index ? " sel" : ""}`}>
                    <button type="button" className="qb-opt-mark" onClick={() => setCorrectIndex(index)} aria-label={T.markCorrect} title={T.markCorrect}>
                      <Check size={15} />
                    </button>
                    <input
                      dir="auto"
                      value={option}
                      placeholder={T.optionN(index)}
                      onChange={(event) => setOptions((current) => current.map((item, i) => (i === index ? event.target.value : item)))}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        className="qb-opt-remove"
                        aria-label={T.removeOption}
                        title={T.removeOption}
                        onClick={() => {
                          setOptions((current) => current.filter((_, i) => i !== index));
                          setCorrectIndex((current) => (current === index ? -1 : current > index ? current - 1 : current));
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {options.length < 8 && (
                <button type="button" className="qb-add-opt" onClick={() => setOptions((current) => [...current, ""])}>
                  <Plus size={14} />{T.addOption}
                </button>
              )}
            </div>
          ) : (
            <div className="qb-field">
              <span>{T.correct}</span>
              <div className="qb-tf-row">
                <button type="button" className={`qb-tf-btn${tfAnswer === "true" ? " true" : ""}`} onClick={() => setTfAnswer("true")}>{T.trueLbl}</button>
                <button type="button" className={`qb-tf-btn${tfAnswer === "false" ? " false" : ""}`} onClick={() => setTfAnswer("false")}>{T.falseLbl}</button>
              </div>
            </div>
          )}

          {error && <div className="tui-note tui-note-warn"><AlertCircle size={15} />{error}</div>}
        </div>
        <footer>
          <button className="tui-btn tui-btn-ghost" onClick={onClose} disabled={saving}>{T.cancel}</button>
          <button className="tui-btn tui-btn-primary" onClick={() => void save()} disabled={saving}>
            {saving ? T.saving : isEdit ? T.save : T.add}
          </button>
        </footer>
      </div>
    </div>
  );
}

const styles = `
.qb{padding-bottom:28px}
.qb-back{display:inline-flex;align-items:center;gap:4px;margin-bottom:12px;color:#6B1E2D;font-size:12.5px;font-weight:900;text-decoration:none}
.qb-back:hover{text-decoration:underline}
.qb-hero-main{min-width:0;flex:1}
.qb-hero-main h1{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.qb-rename-btn{width:30px;height:30px;display:grid;place-items:center;border:1px solid rgba(217,201,176,.36);border-radius:9px;
  background:rgba(255,255,255,.1);color:#F7F3EB;cursor:pointer}
.qb-rename{display:flex;gap:7px;flex-wrap:wrap;margin:9px 0 8px}
.qb-rename input{flex:1;min-width:min(220px,100%);min-height:40px;border:1px solid rgba(217,201,176,.4);border-radius:11px;
  background:rgba(255,255,255,.1);color:#F7F3EB;padding:0 12px;font:900 15px 'Cairo',sans-serif}
.qb-rename input:focus{outline:none;border-color:#D9C9B0}
.qb-hero-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;position:relative;z-index:1}
.qb-note{margin-bottom:12px}
.qb-block{margin-bottom:14px}
.qb-count{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;
  background:#EFEAE0;color:#655B53;font-size:11px;font-weight:900}

.qb-questions{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}
.qb-question{border:1px solid #E5E0D5;border-radius:14px;background:#FFFFFF;padding:13px 15px}
.qb-q-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.qb-q-num{display:grid;place-items:center;width:24px;height:24px;flex:none;border-radius:8px;
  background:linear-gradient(140deg,#6B1E2D,#32101A);color:#D9C9B0;font-size:11px;font-weight:900}
.qb-q-actions{display:flex;gap:5px;margin-inline-start:auto}
.qb-q-actions button{width:30px;height:30px;display:grid;place-items:center;border:1px solid #E5E0D5;border-radius:8px;
  background:#FFFBF5;color:#6B1E2D;cursor:pointer}
.qb-q-actions button:disabled{opacity:.5;cursor:progress}
.qb-q-text{margin:0 0 9px;font-size:13.5px;font-weight:800;line-height:1.75;color:#32101A}
.qb-q-options{display:flex;gap:6px;flex-wrap:wrap}
.qb-opt{display:inline-flex;align-items:center;gap:5px;border-radius:9px;padding:6px 11px;background:#F7F3EB;
  border:1px solid #E5E0D5;color:#655B53;font-size:11.5px;font-weight:700}
.qb-opt.correct{background:rgba(27,94,32,.11);border-color:rgba(27,94,32,.3);color:#1B5E20;font-weight:900}
.qb-submit-hint{margin:12px 0 0;font-size:11.5px;color:#8C8274;font-weight:700}

.qb-results{display:flex;flex-direction:column;gap:9px}
.qb-result{display:grid;grid-template-columns:30px minmax(0,150px) 1fr auto;gap:10px;align-items:center}
.qb-result-av{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;
  background:linear-gradient(140deg,#6B1E2D,#32101A);color:#D9C9B0;font-size:12px;font-weight:900}
.qb-result-name{font-size:12.5px;font-weight:700;color:#4A0E1C;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qb-result-bar{display:block}
.qb-result-bar>i.is-good{background:#1B5E20}
.qb-result-bar>i.is-mid{background:#8F765B}
.qb-result-bar>i.is-low{background:#6B1E2D}
.qb-result-score{font-size:12px;font-weight:900}
.qb-result-score.is-good{color:#1B5E20}
.qb-result-score.is-mid{color:#8F765B}
.qb-result-score.is-low{color:#6B1E2D}

.qb-overlay{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:16px;
  background:rgba(26,26,26,.6);backdrop-filter:blur(6px)}
.qb-modal{width:min(560px,100%);max-height:92vh;display:flex;flex-direction:column;overflow:hidden;border-radius:20px;
  background:#FFFBF5;border:1px solid rgba(217,201,176,.45);box-shadow:0 26px 74px rgba(26,26,26,.34);font-family:'Cairo',sans-serif}
.qb-modal>header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex:none;padding:16px 20px;
  background:linear-gradient(135deg,#6B1E2D,#6B1E2D);color:#F7F3EB}
.qb-modal>header h3{margin:0;font-size:15.5px}
.qb-modal>header button{width:32px;height:32px;flex:none;display:grid;place-items:center;border:1px solid rgba(255,255,255,.2);
  border-radius:9px;background:rgba(255,255,255,.08);color:#FFFFFF;cursor:pointer}
.qb-modal-body{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:14px}
.qb-modal>footer{display:flex;justify-content:flex-end;gap:8px;flex:none;padding:14px 20px;border-top:1px solid rgba(107,30,45,.2)}
.qb-type-row{display:flex;gap:8px}
.qb-type-btn{flex:1;min-height:44px;border:1px solid #D9C9B0;border-radius:11px;background:#FFFFFF;color:#6B1E2D;
  font:800 12.5px 'Cairo',sans-serif;cursor:pointer}
.qb-type-btn.active{background:#6B1E2D;color:#F7F3EB;border-color:#6B1E2D}
.qb-field{display:flex;flex-direction:column;gap:7px;font-size:12px;font-weight:900;color:#4A0E1C}
.qb-field em{font-style:normal;font-weight:700;font-size:10px;color:#8C8274;margin-inline-start:6px}
.qb-field textarea{width:100%;box-sizing:border-box;min-height:80px;resize:vertical;border:1px solid #D9C9B0;border-radius:11px;
  background:#FFFFFF;padding:10px 12px;font:inherit;font-size:13.5px;line-height:1.7;color:#32101A}
.qb-field textarea:focus,.qb-opt-row input:focus{outline:none;border-color:#6B1E2D;box-shadow:0 0 0 3px rgba(107,30,45,.1)}
.qb-opts{display:flex;flex-direction:column;gap:8px}
.qb-opt-row{display:flex;align-items:center;gap:8px}
.qb-opt-row input{flex:1;min-width:0;min-height:46px;border:1.5px solid #D9C9B0;border-radius:11px;background:#FFFFFF;
  padding:0 12px;font:inherit;font-size:13.5px;color:#32101A}
.qb-opt-mark{width:40px;height:46px;flex:none;display:grid;place-items:center;border:1.5px solid #D9C9B0;border-radius:11px;
  background:#FFFFFF;color:#D9C9B0;cursor:pointer;transition:all .12s}
.qb-opt-mark:hover{border-color:#1B5E20;color:#1B5E20}
.qb-opt-row.sel .qb-opt-mark{background:#1B5E20;border-color:#1B5E20;color:#FFFFFF}
.qb-opt-row.sel input{border-color:#1B5E20;background:rgba(27,94,32,.05)}
.qb-opt-remove{width:36px;height:46px;flex:none;display:grid;place-items:center;border:1px solid #E5E0D5;border-radius:10px;
  background:#FFFFFF;color:#6B1E2D;cursor:pointer}
.qb-add-opt{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;min-height:38px;border:1px dashed rgba(107,30,45,.35);
  border-radius:10px;background:none;color:#6B1E2D;padding:0 13px;font:800 11.5px 'Cairo',sans-serif;cursor:pointer}
.qb-tf-row{display:flex;gap:8px}
.qb-tf-btn{flex:1;min-height:50px;border:1.5px solid #D9C9B0;border-radius:11px;background:#FFFFFF;color:#4A0E1C;
  font:800 13px 'Cairo',sans-serif;cursor:pointer}
.qb-tf-btn.true{background:rgba(27,94,32,.13);border-color:#1B5E20;color:#1B5E20}
.qb-tf-btn.false{background:rgba(107,30,45,.1);border-color:#6B1E2D;color:#6B1E2D}

@media(max-width:560px){
  .qb-result{grid-template-columns:30px minmax(0,1fr) auto;row-gap:6px}
  .qb-result-bar{grid-column:1/-1}
  .qb-overlay{padding:0;align-items:stretch}
  .qb-modal{width:100%;max-height:100vh;border-radius:0;border:0}
  .qb-modal>footer>*{flex:1}
}
`;
