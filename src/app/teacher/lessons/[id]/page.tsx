"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { Icons } from "../components/icons";
import { css } from "../components/css";
import { TextModal, ImageModal, VideoModal } from "../components/content-modals";
import { QuestionModal } from "../components/question-modal";
import { SortableList } from "@/components/SortableList";
import type {
  LessonFull, LessonContent, LessonQuestion, ClassRef, QuizRef,
} from "../components/types";

const T = {
  ar: {
    back: "العودة إلى الدروس",
    eyebrow: "محرر الدرس",
    titleLabel: "عنوان الدرس",
    titlePh: "مثال: مقدمة في علم الفقه",
    descLabel: "وصف مختصر",
    descPh: "اشرح بإيجاز ما يتناوله الدرس...",
    classLabel: "الفصل",
    quizLabel: "ربط باختبار",
    quizNone: "بدون اختبار مربوط",
    save: "حفظ التغييرات",
    saving: "جارٍ الحفظ...",
    saved: "✓ تم الحفظ",
    delete: "حذف الدرس",
    deleteConfirm: "هل أنت متأكد من حذف هذا الدرس؟ هذا الإجراء لا يمكن التراجع عنه.",
    deleteContent: "حذف هذا المحتوى؟",
    deleteQuestion: "حذف هذا السؤال؟",
    publishOn: "منشور للطلاب",
    publishOnSub: "الطلاب يستطيعون رؤيته",
    publishOff: "مسودة",
    publishOffSub: "غير مرئي للطلاب — فعّله عندما يكون جاهزاً",
    gradedOn: "مُقيَّم",
    gradedOnSub: "محاولة واحدة، يُسجَّل الناتج",
    gradedOff: "تدريبي",
    gradedOffSub: "تغذية فورية، يمكن المحاولة عدة مرات",
    contentSection: "محتوى الدرس",
    contentEmpty: "لا يوجد محتوى بعد — أضف نصاً أو صورة أو فيديو",
    addText: "نص+", addImage: "صورة+", addVideo: "فيديو+",
    questionSection: "أسئلة الدرس",
    questionEmpty: "لا توجد أسئلة بعد",
    addQuestion: "إضافة سؤال",
    qType: { MCQ: "اختيار متعدد", TF: "صح/خطأ", WRITTEN: "مكتوب", MATCHING: "مطابقة" },
    answerLabel: "الإجابة",
    statusDraft: "مسودة", statusLive: "منشور",
  },
  sq: {
    back: "Kthehu te mësimet",
    eyebrow: "Redaktuesi i mësimit",
    titleLabel: "Titulli i mësimit",
    titlePh: "P.sh.: Hyrje në fjalor",
    descLabel: "Përshkrim i shkurtër",
    descPh: "Shpjego shkurtimisht përmbajtjen...",
    classLabel: "Klasa",
    quizLabel: "Lidh me test",
    quizNone: "Pa test të lidhur",
    save: "Ruaj ndryshimet",
    saving: "Duke ruajtur...",
    saved: "✓ U ruajt",
    delete: "Fshi mësimin",
    deleteConfirm: "Jeni i sigurt që doni ta fshini këtë mësim? Veprimi nuk mund të zhbëhet.",
    deleteContent: "Fshi këtë përmbajtje?",
    deleteQuestion: "Fshi këtë pyetje?",
    publishOn: "I publikuar",
    publishOnSub: "Nxënësit mund ta shohin",
    publishOff: "Draft",
    publishOffSub: "I padukshëm për nxënësit — publikoje kur është gati",
    gradedOn: "Me notë",
    gradedOnSub: "Një tentim, rezultati regjistrohet",
    gradedOff: "Praktikë",
    gradedOffSub: "Feedback i menjëhershëm, mund të riprovohet",
    contentSection: "Përmbajtja",
    contentEmpty: "Ende nuk ka përmbajtje — shto tekst, imazh ose video",
    addText: "Tekst+", addImage: "Imazh+", addVideo: "Video+",
    questionSection: "Pyetjet e mësimit",
    questionEmpty: "Ende nuk ka pyetje",
    addQuestion: "Shto pyetje",
    qType: { MCQ: "Shumëzgjedhje", TF: "E saktë/E gabuar", WRITTEN: "E shkruar", MATCHING: "Përputhje" },
    answerLabel: "Përgjigja",
    statusDraft: "Draft", statusLive: "Live",
  },
} as const;

type AddingContent = "TEXT" | "IMAGE" | "VIDEO" | null;

export default function LessonEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { lang } = useLang();
  const t = T[lang === "sq" ? "sq" : "ar"];
  const dir = lang === "sq" ? "ltr" : "rtl";

  const [lesson, setLesson] = useState<LessonFull | null>(null);
  const [classes, setClasses] = useState<ClassRef[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // editable meta fields (local copy so we can debounce-save)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("");
  const [linkedQuizId, setLinkedQuizId] = useState<string>("");
  const [isPublished, setIsPublished] = useState(false);
  const [isGraded, setIsGraded] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // content / question add-edit state
  const [addingContent, setAddingContent] = useState<AddingContent>(null);
  const [editingContent, setEditingContent] = useState<LessonContent | null>(null);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<LessonQuestion | null>(null);

  const fetchLesson = useCallback(async () => {
    setError("");
    try {
      const r = await fetch(`/api/teacher/lessons/${id}`);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error ?? "Failed to load");
        setLoading(false);
        return;
      }
      const d = await r.json();
      setLesson(d.lesson);
      setClasses(d.classes ?? []);
      setQuizzes(d.quizzes ?? []);
      setTitle(d.lesson.title);
      setDescription(d.lesson.description ?? "");
      setClassId(d.lesson.class_id);
      setLinkedQuizId(d.lesson.linked_quiz_id ?? "");
      setIsPublished(d.lesson.is_published);
      setIsGraded(d.lesson.is_graded);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchLesson(); }, [fetchLesson]);

  // PATCH meta (called on blur / toggle / dropdown change)
  const saveMeta = async (patch: Partial<{
    title: string; description: string; classId: string;
    linked_quiz_id: string | null;
    is_published: boolean; is_graded: boolean;
  }>) => {
    setSavingMeta(true);
    try {
      const r = await fetch(`/api/teacher/lessons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (r.ok) {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1500);
        // refetch to make sure server-side state is in sync
        const d = await r.json();
        if (d.lesson && lesson) {
          setLesson({ ...lesson, ...d.lesson, class: classes.find((c) => c.id === d.lesson.class_id) ?? lesson.class });
        }
      }
    } finally {
      setSavingMeta(false);
    }
  };

  const deleteLesson = async () => {
    if (!confirm(t.deleteConfirm)) return;
    const r = await fetch(`/api/teacher/lessons/${id}`, { method: "DELETE" });
    if (r.ok) router.push("/teacher/lessons");
  };

  const deleteContent = async (cid: string) => {
    if (!confirm(t.deleteContent)) return;
    await fetch(`/api/teacher/lessons/contents/${cid}`, { method: "DELETE" });
    fetchLesson();
  };

  // Optimistic reorder — update local state immediately so the UI feels
  // instant, then persist. On failure we refetch to snap back to truth.
  const reorderQuestions = async (next: LessonQuestion[]) => {
    if (!lesson) return;
    setLesson({ ...lesson, questions: next });
    try {
      const r = await fetch(`/api/teacher/lessons/${id}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "questions", ids: next.map((q) => q.id) }),
      });
      if (!r.ok) fetchLesson();
    } catch {
      fetchLesson();
    }
  };

  const reorderContents = async (next: LessonContent[]) => {
    if (!lesson) return;
    setLesson({ ...lesson, contents: next });
    try {
      const r = await fetch(`/api/teacher/lessons/${id}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "contents", ids: next.map((c) => c.id) }),
      });
      if (!r.ok) fetchLesson();
    } catch {
      fetchLesson();
    }
  };

  const deleteQuestion = async (qid: string) => {
    if (!confirm(t.deleteQuestion)) return;
    await fetch(`/api/teacher/lessons/questions/${qid}`, { method: "DELETE" });
    fetchLesson();
  };

  if (loading) {
    return (
      <div className="lb-page" dir={dir}>
        <div className="lb-loading-inner">
          <div className="lb-spinner" />
          <div>...</div>
        </div>
        <style>{css}</style>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="lb-page" dir={dir}>
        <div className="lb-empty">
          <div className="lb-empty-icon">{Icons.book}</div>
          <h2 className="lb-empty-title">{error || "Lesson not found"}</h2>
          <Link href="/teacher/lessons" className="lb-btn-primary">{t.back}</Link>
        </div>
        <style>{css}</style>
      </div>
    );
  }

  const contents = lesson.contents;
  const questions = lesson.questions;

  const renderContentPreview = (block: LessonContent) => {
    if (block.type === "TEXT") {
      const preview = (block.body ?? "").slice(0, 90);
      return (
        <span className="lb-content-preview-text">
          {preview}{(block.body ?? "").length > 90 ? "..." : ""}
        </span>
      );
    }
    if (block.type === "IMAGE") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {block.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.image_url} alt={block.alt_text ?? ""} className="lb-content-thumb" />
          )}
          <span className="lb-content-preview-text" style={{ flex: 1 }}>
            {block.alt_text ?? (lang === "sq" ? "Imazh" : "صورة")}
          </span>
        </div>
      );
    }
    if (block.type === "VIDEO") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="lb-content-preview-text" style={{ display: "flex", alignItems: "center", gap: 6, direction: "ltr" }}>
            {Icons.play}
            {(block.video_url ?? "").slice(0, 60)}
            {(block.video_url ?? "").length > 60 ? "..." : ""}
          </span>
          {block.video_title && <span className="lb-content-preview-sub">{block.video_title}</span>}
        </div>
      );
    }
    return null;
  };

  const formatCorrectAnswer = (q: LessonQuestion) => {
    if (q.type === "TF") return q.correct_answer === "true" ? t.qType.TF.split("/")[0] : t.qType.TF.split("/")[1];
    return q.correct_answer ?? "";
  };

  // Quizzes filtered to the lesson's selected class
  const availableQuizzes = quizzes.filter((q) => !q.class_id || q.class_id === classId);

  return (
    <div className="lb-page" dir={dir}>
      <style>{css}</style>

      {/* ─── HEADER ─── */}
      <div className="lb-header">
        <div className="lb-header-inner">
          <div className="lb-header-icon">{Icons.book}</div>
          <div className="lb-header-titleblock">
            <Link href="/teacher/lessons" className="lb-back-link">
              {dir === "rtl" ? Icons.chevronRight : Icons.chevronLeft} {t.back}
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="lb-page-title" style={{ maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis" }}>
                {title || lesson.title}
              </span>
              <span className={`lb-status-pill ${isPublished ? "live" : "draft"}`}>
                {isPublished ? Icons.check : Icons.eyeOff}
                {isPublished ? t.statusLive : t.statusDraft}
              </span>
              {savingMeta && <span className="lb-page-sub" style={{ marginTop: 0 }}>{t.saving}</span>}
              {savedFlash && <span style={{ fontSize: 11, color: "#6BD489", fontWeight: 700 }}>{t.saved}</span>}
            </div>
            <p className="lb-page-sub">{t.eyebrow}</p>
          </div>
          <button className="lb-btn-danger" onClick={deleteLesson} type="button">
            {Icons.trash} {t.delete}
          </button>
        </div>
      </div>

      {/* ─── META PANEL ─── */}
      <div className="lb-meta">
        <div className="lb-meta-row">
          <div className="lb-meta-field">
            <label className="lb-meta-label">{Icons.book}{t.titleLabel}</label>
            <input
              className="lb-meta-input" type="text" value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== lesson.title && saveMeta({ title: title.trim() })}
              placeholder={t.titlePh} dir="auto"
            />
          </div>
          <div className="lb-meta-field">
            <label className="lb-meta-label">{Icons.modules}{t.classLabel}</label>
            <select
              className="lb-meta-select" value={classId}
              onChange={(e) => { setClassId(e.target.value); saveMeta({ classId: e.target.value }); }}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="lb-meta-field">
          <label className="lb-meta-label">{Icons.text}{t.descLabel}</label>
          <textarea
            className="lb-meta-textarea" rows={2} value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== (lesson.description ?? "") && saveMeta({ description })}
            placeholder={t.descPh} dir="auto"
          />
        </div>

        <div className="lb-meta-field">
          <label className="lb-meta-label">{Icons.link}{t.quizLabel}</label>
          <select
            className="lb-meta-select" value={linkedQuizId}
            onChange={(e) => {
              setLinkedQuizId(e.target.value);
              saveMeta({ linked_quiz_id: e.target.value || null });
            }}
          >
            <option value="">{t.quizNone}</option>
            {availableQuizzes.map((q) => (
              <option key={q.id} value={q.id}>{q.name}</option>
            ))}
          </select>
        </div>

        <div className="lb-toggles">
          <div
            className={`lb-toggle-card${isPublished ? " on green" : ""}`}
            onClick={() => { setIsPublished(!isPublished); saveMeta({ is_published: !isPublished }); }}
            role="button" tabIndex={0}
          >
            <div className="lb-toggle-switch" />
            <div className="lb-toggle-info">
              <div className="lb-toggle-title">{isPublished ? t.publishOn : t.publishOff}</div>
              <div className="lb-toggle-sub">{isPublished ? t.publishOnSub : t.publishOffSub}</div>
            </div>
          </div>
          <div
            className={`lb-toggle-card${isGraded ? " on" : ""}`}
            onClick={() => { setIsGraded(!isGraded); saveMeta({ is_graded: !isGraded }); }}
            role="button" tabIndex={0}
          >
            <div className="lb-toggle-switch" />
            <div className="lb-toggle-info">
              <div className="lb-toggle-title">
                {isGraded ? <>{Icons.award} {t.gradedOn}</> : <>{Icons.zap} {t.gradedOff}</>}
              </div>
              <div className="lb-toggle-sub">{isGraded ? t.gradedOnSub : t.gradedOffSub}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CONTENT SECTION ─── */}
      <div className="lb-section">
        <div className="lb-section-hd">
          <div className="lb-section-hd-icon">{Icons.text}</div>
          <span className="lb-section-title">{t.contentSection}</span>
          <span className="lb-section-count">{contents.length}</span>
        </div>
        <div className="lb-section-body">
          {contents.length > 0 ? (
            <SortableList
              items={contents}
              onReorder={reorderContents}
              className="lb-content-list"
              gap={8}
              renderItem={(block, { dragHandleProps }) => (
                <div className="lb-content-block">
                  <span
                    className="lb-drag-handle"
                    {...dragHandleProps}
                    title={lang === "sq" ? "Tërhiq për të riorganizuar" : "اسحب لإعادة الترتيب"}
                    aria-label="Drag to reorder"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="9" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/>
                      <circle cx="15" cy="6" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="15" cy="18" r="1.4"/>
                    </svg>
                  </span>
                  <span className={`lb-content-type-badge ${block.type}`}>
                    {block.type === "TEXT" ? (lang === "sq" ? "Tekst" : "نص")
                      : block.type === "IMAGE" ? (lang === "sq" ? "Imazh" : "صورة")
                      : (lang === "sq" ? "Video" : "فيديو")}
                  </span>
                  <div className="lb-content-preview">{renderContentPreview(block)}</div>
                  <div className="lb-content-actions">
                    <button className="lb-icon-btn" onClick={() => setEditingContent(block)}>{Icons.edit}</button>
                    <button className="lb-icon-btn danger" onClick={() => deleteContent(block.id)}>{Icons.trash}</button>
                  </div>
                </div>
              )}
            />
          ) : (
            <div className="lb-empty-inline">{t.contentEmpty}</div>
          )}
          <div className="lb-add-row">
            <button className="lb-add-pill" onClick={() => setAddingContent("TEXT")}>{Icons.text} {t.addText}</button>
            <button className="lb-add-pill" onClick={() => setAddingContent("IMAGE")}>{Icons.image} {t.addImage}</button>
            <button className="lb-add-pill" onClick={() => setAddingContent("VIDEO")}>{Icons.video} {t.addVideo}</button>
          </div>
        </div>
      </div>

      {/* ─── QUESTIONS SECTION ─── */}
      <div className="lb-section">
        <div className="lb-section-hd">
          <div className="lb-section-hd-icon">{Icons.questions}</div>
          <span className="lb-section-title">{t.questionSection}</span>
          <span className="lb-section-count">{questions.length}</span>
        </div>
        <div className="lb-section-body">
          {questions.length > 0 ? (
            <SortableList
              items={questions}
              onReorder={reorderQuestions}
              className="lb-q-list"
              gap={8}
              renderItem={(q, { index, dragHandleProps }) => (
                <div className="lb-q-item">
                  <span
                    className="lb-drag-handle"
                    {...dragHandleProps}
                    title={lang === "sq" ? "Tërhiq për të riorganizuar" : "اسحب لإعادة الترتيب"}
                    aria-label="Drag to reorder"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="9" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/>
                      <circle cx="15" cy="6" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="15" cy="18" r="1.4"/>
                    </svg>
                  </span>
                  <span className="lb-q-num">{index + 1}</span>
                  <div className="lb-q-body">
                    <span className="lb-q-text" dir="auto">{q.text}</span>
                    <div className="lb-q-tags">
                      <span className={`lb-tag ${q.type}`}>{t.qType[q.type]}</span>
                      {q.type !== "MATCHING" && q.correct_answer && (
                        <span className="lb-tag answer">{Icons.check} {formatCorrectAnswer(q)}</span>
                      )}
                    </div>
                  </div>
                  <div className="lb-content-actions">
                    <button className="lb-icon-btn" onClick={() => setEditingQuestion(q)}>{Icons.edit}</button>
                    <button className="lb-icon-btn danger" onClick={() => deleteQuestion(q.id)}>{Icons.trash}</button>
                  </div>
                </div>
              )}
            />
          ) : (
            <div className="lb-empty-inline">{t.questionEmpty}</div>
          )}
          <button className="lb-add-q-btn" onClick={() => setAddingQuestion(true)}>
            {Icons.plus} {t.addQuestion}
          </button>
        </div>
      </div>

      {/* ─── MODALS ─── */}
      {addingContent === "TEXT" && (
        <TextModal lessonId={id}
          onClose={() => setAddingContent(null)}
          onSaved={() => { setAddingContent(null); fetchLesson(); }} />
      )}
      {addingContent === "IMAGE" && (
        <ImageModal lessonId={id}
          onClose={() => setAddingContent(null)}
          onSaved={() => { setAddingContent(null); fetchLesson(); }} />
      )}
      {addingContent === "VIDEO" && (
        <VideoModal lessonId={id}
          onClose={() => setAddingContent(null)}
          onSaved={() => { setAddingContent(null); fetchLesson(); }} />
      )}
      {editingContent?.type === "TEXT" && (
        <TextModal lessonId={id} content={editingContent}
          onClose={() => setEditingContent(null)}
          onSaved={() => { setEditingContent(null); fetchLesson(); }} />
      )}
      {editingContent?.type === "IMAGE" && (
        <ImageModal lessonId={id} content={editingContent}
          onClose={() => setEditingContent(null)}
          onSaved={() => { setEditingContent(null); fetchLesson(); }} />
      )}
      {editingContent?.type === "VIDEO" && (
        <VideoModal lessonId={id} content={editingContent}
          onClose={() => setEditingContent(null)}
          onSaved={() => { setEditingContent(null); fetchLesson(); }} />
      )}
      {addingQuestion && (
        <QuestionModal lessonId={id}
          onClose={() => setAddingQuestion(false)}
          onSaved={() => { setAddingQuestion(false); fetchLesson(); }} />
      )}
      {editingQuestion && (
        <QuestionModal lessonId={id} question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSaved={() => { setEditingQuestion(null); fetchLesson(); }} />
      )}
    </div>
  );
}
