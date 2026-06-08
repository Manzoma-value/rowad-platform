"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";
import { Icons } from "./components/icons";
import { css } from "./components/css";
import type { LessonListItem, ClassRef } from "./components/types";

const T = {
  ar: {
    title: "الدروس",
    sub: (n: number) => `${n} درس${n === 1 ? "" : "اً"}`,
    create: "إنشاء درس",
    newLesson: "درس جديد",
    titleLabel: "عنوان الدرس",
    titlePh: "مثال: مقدمة في علم الفقه",
    classLabel: "اختر الفصل",
    descLabel: "وصف (اختياري)",
    descPh: "اشرح بإيجاز ما يتناوله الدرس...",
    cancel: "إلغاء",
    creating: "جارٍ الإنشاء...",
    createBtn: "إنشاء",
    emptyTitle: "لا توجد دروس بعد",
    emptySub: "أنشئ أول درس لمشاركة المحتوى مع طلاب فصلك",
    needClass: "تحتاج إلى فصل أولاً",
    needClassSub: "لا توجد فصول مخصصة لك. اطلب من المشرف تخصيص فصل لك أولاً.",
    statusDraft: "مسودة", statusLive: "منشور",
    gradedShort: "مُقيَّم", practiceShort: "تدريبي",
    contentBlocks: "محتويات", qShort: "أسئلة", attemptsShort: "محاولة",
    linkedTo: "مرتبط بـ",
  },
  sq: {
    title: "Mësimet",
    sub: (n: number) => `${n} mësim${n === 1 ? "" : "e"}`,
    create: "Krijo mësim",
    newLesson: "Mësim i ri",
    titleLabel: "Titulli i mësimit",
    titlePh: "P.sh.: Hyrje në fjalor",
    classLabel: "Zgjidh klasën",
    descLabel: "Përshkrim (opsional)",
    descPh: "Shpjego shkurtimisht përmbajtjen...",
    cancel: "Anulo",
    creating: "Duke krijuar...",
    createBtn: "Krijo",
    emptyTitle: "Ende nuk ka mësime",
    emptySub: "Krijo mësimin tënd të parë për ta ndarë me nxënësit",
    needClass: "Të nevojitet një klasë",
    needClassSub: "Nuk ke asnjë klasë të caktuar. Kërko nga administratori të të caktojë një klasë.",
    statusDraft: "Draft", statusLive: "Live",
    gradedShort: "Me notë", practiceShort: "Praktikë",
    contentBlocks: "blloqe", qShort: "pyetje", attemptsShort: "tentime",
    linkedTo: "Lidhur me",
  },
} as const;

export default function TeacherLessonsPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = T[lang === "sq" ? "sq" : "ar"];
  const dir = lang === "sq" ? "ltr" : "rtl";

  const [lessons, setLessons] = useState<LessonListItem[]>([]);
  const [classes, setClasses] = useState<ClassRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newClassId, setNewClassId] = useState("");
  const [createError, setCreateError] = useState("");

  const fetchLessons = useCallback(async () => {
    try {
      const d = await cachedFetch<{ lessons: LessonListItem[]; classes: ClassRef[] }>(
        "/api/teacher/lessons",
        30_000,
      );
      setLessons(d?.lessons ?? []);
      setClasses(d?.classes ?? []);
      if (!newClassId && d?.classes?.[0]?.id) setNewClassId(d.classes[0].id);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchLessons(); }, [fetchLessons]);

  const createLesson = async () => {
    if (!newTitle.trim() || !newClassId || creating) return;
    setCreating(true);
    setCreateError("");
    try {
      const r = await fetch("/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          classId: newClassId,
          description: newDesc.trim() || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setCreateError(d.error ?? "Error"); setCreating(false); return; }
      invalidateCache("/api/teacher/lessons");
      router.push(`/teacher/lessons/${d.lesson.id}`);
    } catch {
      setCreateError("Network error");
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="lb-page" dir={dir}>
        <div className="lb-loading-inner"><div className="lb-spinner" /></div>
        <style>{css}</style>
      </div>
    );
  }

  return (
    <div className="lb-page" dir={dir}>
      <style>{css}</style>

      {/* Header */}
      <div className="lb-list-hd">
        <div className="lb-list-title-wrap">
          <div className="lb-list-title-icon">{Icons.book}</div>
          <div>
            <h1 className="lb-list-title">{t.title}</h1>
            <p className="lb-list-sub">{t.sub(lessons.length)}</p>
          </div>
        </div>
        {classes.length > 0 && (
          <button className="lb-btn-primary" onClick={() => setShowCreate(true)}>
            {Icons.plus} {t.create}
          </button>
        )}
      </div>

      {/* Body */}
      {classes.length === 0 ? (
        <div className="lb-empty">
          <div className="lb-empty-icon">{Icons.modules}</div>
          <h2 className="lb-empty-title">{t.needClass}</h2>
          <p className="lb-empty-sub">{t.needClassSub}</p>
        </div>
      ) : lessons.length === 0 ? (
        <div className="lb-empty">
          <div className="lb-empty-icon">{Icons.book}</div>
          <h2 className="lb-empty-title">{t.emptyTitle}</h2>
          <p className="lb-empty-sub">{t.emptySub}</p>
          <button className="lb-btn-primary" onClick={() => setShowCreate(true)}>
            {Icons.plus} {t.create}
          </button>
        </div>
      ) : (
        <div className="lb-list-grid">
          {lessons.map((lesson) => (
            <Link key={lesson.id} href={`/teacher/lessons/${lesson.id}`} className="lb-card">
              <div className="lb-card-row" style={{ justifyContent: "space-between" }}>
                <span className={`lb-status-pill ${lesson.is_published ? "live" : "draft"}`}>
                  {lesson.is_published ? Icons.check : Icons.eyeOff}
                  {lesson.is_published ? t.statusLive : t.statusDraft}
                </span>
                <span className="lb-card-class">{lesson.class.name}</span>
              </div>
              <h3 className="lb-card-title">{lesson.title}</h3>
              {lesson.description && <p className="lb-card-desc">{lesson.description}</p>}
              <div className="lb-card-meta">
                <span className="lb-card-chip">{Icons.text} {lesson._count.contents} {t.contentBlocks}</span>
                <span className="lb-card-chip">{Icons.questions} {lesson._count.questions} {t.qShort}</span>
                {lesson.is_published && lesson._count.attempts > 0 && (
                  <span className="lb-card-chip">{Icons.award} {lesson._count.attempts} {t.attemptsShort}</span>
                )}
                <span className="lb-card-chip" style={{ background: lesson.is_graded ? "var(--gold-l)" : "var(--purple-l)", color: lesson.is_graded ? "#7A6020" : "var(--purple)" }}>
                  {lesson.is_graded ? Icons.award : Icons.zap}
                  {lesson.is_graded ? t.gradedShort : t.practiceShort}
                </span>
                {lesson.linked_quiz && (
                  <span className="lb-card-chip" title={`${t.linkedTo} ${lesson.linked_quiz.name}`}>
                    {Icons.link} {lesson.linked_quiz.name}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="lb-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="lb-modal">
            <div className="lb-modal-hd">
              <div className="lb-modal-icon">{Icons.book}</div>
              <div className="lb-modal-hd-text">
                <h3 className="lb-modal-title">{t.newLesson}</h3>
              </div>
              <button className="lb-close-btn" onClick={() => setShowCreate(false)}>{Icons.close}</button>
            </div>
            <div className="lb-modal-body">
              <div className="lb-field">
                <label className="lb-label">{t.titleLabel}</label>
                <input
                  className="lb-input" type="text" value={newTitle}
                  onChange={(e) => { setNewTitle(e.target.value); setCreateError(""); }}
                  placeholder={t.titlePh} dir="auto" autoFocus
                  onKeyDown={(e) => e.key === "Enter" && createLesson()}
                />
              </div>
              <div className="lb-field">
                <label className="lb-label">{t.classLabel}</label>
                <select className="lb-meta-select" value={newClassId} onChange={(e) => setNewClassId(e.target.value)}>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="lb-field">
                <label className="lb-label">{t.descLabel}</label>
                <textarea
                  className="lb-textarea" rows={3} value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder={t.descPh} dir="auto"
                />
              </div>
              {createError && <div className="lb-error">{Icons.x}{createError}</div>}
            </div>
            <div className="lb-modal-ft">
              <button className="lb-btn-primary" onClick={createLesson} disabled={creating || !newTitle.trim() || !newClassId}>
                {creating ? <><span className="lb-btn-spinner" />{t.creating}</> : <>{Icons.plus}{t.createBtn}</>}
              </button>
              <button className="lb-btn-ghost" onClick={() => setShowCreate(false)}>{t.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
