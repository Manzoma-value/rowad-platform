"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { useConfirm } from "@/lib/confirm-dialog";
import { useViewOnly } from "@/lib/view-only-context";
import MandalaLoader from "@/components/MandalaLoader";

type ReviewStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
type Row = {
  id: string;
  title: string;          // lesson title or quiz name (normalized client-side)
  kind: "lesson" | "quiz";
  review_status: ReviewStatus;
  reviewer_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  teacher: { id: string; full_name: string };
  class: { id: string; name: string };
  module: { id: string; title: string; stage: { id: string; title: string } } | null;
  counts: { items: number; questions: number };
  detail_href: string;
};

const UI = {
  ar: {
    title: "قائمة المراجعة",
    sub: "راجع الدروس والاختبارات التي قدمها المعلمون قبل أن تصل للطلاب. يمكنك الموافقة أو الرفض مع كتابة ملاحظات.",
    filterPending: "قيد المراجعة فقط",
    filterAll: "عرض الكل",
    empty: "لا توجد عناصر بانتظار المراجعة.",
    kindLesson: "درس",
    kindQuiz: "اختبار",
    teacher: "المعلم",
    classCol: "الفصل",
    concept: "المفهوم",
    submittedAt: "أُرسل في",
    status: "الحالة",
    approve: "موافقة",
    reject: "رفض",
    open: "عرض",
    statusDRAFT: "مسودة",
    statusPENDING_REVIEW: "قيد المراجعة",
    statusAPPROVED: "معتمد",
    statusREJECTED: "مرفوض",
    confirmApprove: "هل أنت متأكد من الموافقة على هذا العنصر؟",
    confirmReject: "هل أنت متأكد من رفضه؟",
    notesPh: "اكتب ملاحظاتك للمعلم (اختياري)…",
    cancel: "إلغاء",
    submit: "تأكيد",
    saving: "جارٍ الحفظ…",
    saveError: "تعذر حفظ القرار",
  },
  sq: {
    title: "Lista e shqyrtimit",
    sub: "Shqyrto mësimet dhe kuizet që mësuesit kanë dërguar para se t'i shohin nxënësit. Mund të miratosh ose refuzosh me shënime.",
    filterPending: "Vetëm në shqyrtim",
    filterAll: "Shfaq të gjitha",
    empty: "Nuk ka elemente që presin shqyrtim.",
    kindLesson: "Mësim",
    kindQuiz: "Kuiz",
    teacher: "Mësuesi",
    classCol: "Klasa",
    concept: "Koncepti",
    submittedAt: "Dërguar më",
    status: "Statusi",
    approve: "Mirato",
    reject: "Refuzo",
    open: "Hap",
    statusDRAFT: "Draft",
    statusPENDING_REVIEW: "Në shqyrtim",
    statusAPPROVED: "Miratuar",
    statusREJECTED: "Refuzuar",
    confirmApprove: "Je i sigurt që do ta miratosh?",
    confirmReject: "Je i sigurt që do ta refuzosh?",
    notesPh: "Shkruaj shënime për mësuesin (opsionale)…",
    cancel: "Anulo",
    submit: "Konfirmo",
    saving: "Po ruhet…",
    saveError: "Nuk u ruajt vendimi",
  },
} as const;

export default function ReviewQueuePage() {
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const confirm = useConfirm();
  const viewOnly = useViewOnly();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [decisionFor, setDecisionFor] = useState<null | { row: Row; action: "approve" | "reject" }>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    const url = "/api/school-admin/review-queue" + (showAll ? "?include=all" : "");
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const lessons: Row[] = (d?.lessons ?? []).map((l: {
          id: string; title: string; review_status: ReviewStatus; reviewer_notes: string | null;
          submitted_at: string | null; reviewed_at: string | null;
          teacher: { id: string; profile: { full_name: string } };
          class: { id: string; name: string };
          module: { id: string; title: string; stage: { id: string; title: string } } | null;
          _count: { contents: number; questions: number };
        }) => ({
          id: l.id,
          title: l.title,
          kind: "lesson" as const,
          review_status: l.review_status,
          reviewer_notes: l.reviewer_notes,
          submitted_at: l.submitted_at,
          reviewed_at: l.reviewed_at,
          teacher: { id: l.teacher.id, full_name: l.teacher.profile.full_name },
          class: l.class,
          module: l.module,
          counts: { items: l._count.contents, questions: l._count.questions },
          detail_href: `/school-admin/lessons/${l.id}`,
        }));
        const quizzes: Row[] = (d?.quizzes ?? []).map((q: {
          id: string; name: string; review_status: ReviewStatus; reviewer_notes: string | null;
          submitted_at: string | null; reviewed_at: string | null;
          teacher: { id: string; profile: { full_name: string } };
          class: { id: string; name: string };
          module: { id: string; title: string; stage: { id: string; title: string } } | null;
          _count: { questions: number };
        }) => ({
          id: q.id,
          title: q.name,
          kind: "quiz" as const,
          review_status: q.review_status,
          reviewer_notes: q.reviewer_notes,
          submitted_at: q.submitted_at,
          reviewed_at: q.reviewed_at,
          teacher: { id: q.teacher.id, full_name: q.teacher.profile.full_name },
          class: q.class,
          module: q.module,
          counts: { items: 0, questions: q._count.questions },
          detail_href: `/school-admin/quizzes/${q.id}`,
        }));
        // Pending first, then by submitted_at asc
        const merged = [...lessons, ...quizzes].sort((a, b) => {
          const ap = a.review_status === "PENDING_REVIEW" ? 0 : 1;
          const bp = b.review_status === "PENDING_REVIEW" ? 0 : 1;
          if (ap !== bp) return ap - bp;
          const at = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
          const bt = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
          return at - bt;
        });
        setRows(merged);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, [showAll]);

  async function openDecision(row: Row, action: "approve" | "reject") {
    const ok = await confirm({
      title: action === "approve" ? T.approve : T.reject,
      message: action === "approve" ? T.confirmApprove : T.confirmReject,
      confirmText: action === "approve" ? T.approve : T.reject,
      cancelText: T.cancel,
      variant: action === "approve" ? "normal" : "danger",
    });
    if (!ok) return;
    setNotes("");
    setError("");
    setDecisionFor({ row, action });
  }

  async function submitDecision() {
    if (!decisionFor) return;
    const { row, action } = decisionFor;
    setSaving(true);
    setError("");
    try {
      const path =
        row.kind === "lesson"
          ? `/api/school-admin/lessons/${row.id}/review`
          : `/api/school-admin/quizzes/${row.id}/review`;
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: notes.trim() || undefined }),
      });
      if (!r.ok) throw new Error();
      setDecisionFor(null);
      load();
    } catch {
      setError(T.saveError);
    } finally {
      setSaving(false);
    }
  }

  function fmtDate(s: string | null | undefined) {
    if (!s) return "—";
    try { return new Date(s).toLocaleString(L === "ar" ? "ar-u-nu-latn" : "sq"); } catch { return s; }
  }

  return (
    <div className="rq-page" dir={dir}>
      <header className="rq-hero">
        <h1 className="rq-title">{T.title}</h1>
        <p className="rq-sub">{T.sub}</p>
      </header>

      <div className="rq-toolbar">
        <button
          className={`rq-toggle${!showAll ? " active" : ""}`}
          onClick={() => setShowAll(false)}
        >{T.filterPending}</button>
        <button
          className={`rq-toggle${showAll ? " active" : ""}`}
          onClick={() => setShowAll(true)}
        >{T.filterAll}</button>
      </div>

      {loading ? (
        <MandalaLoader />
      ) : rows.length === 0 ? (
        <div className="rq-empty">{T.empty}</div>
      ) : (
        <div className="rq-grid">
          {rows.map((r) => (
            <article key={`${r.kind}-${r.id}`} className={`rq-card rq-st-${r.review_status}`}>
              <div className="rq-card-top">
                <span className={`rq-kind rq-kind--${r.kind}`}>
                  {r.kind === "lesson" ? T.kindLesson : T.kindQuiz}
                </span>
                <span className={`rq-tag rq-st-tag-${r.review_status}`}>
                  {r.review_status === "PENDING_REVIEW" ? T.statusPENDING_REVIEW
                   : r.review_status === "APPROVED" ? T.statusAPPROVED
                   : r.review_status === "REJECTED" ? T.statusREJECTED
                   : T.statusDRAFT}
                </span>
              </div>
              <h2 className="rq-card-title">{r.title}</h2>
              <dl className="rq-card-meta">
                <div><dt>{T.teacher}</dt><dd>{r.teacher.full_name}</dd></div>
                <div><dt>{T.classCol}</dt><dd>{r.class.name}</dd></div>
                <div><dt>{T.concept}</dt><dd>{r.module ? `${r.module.stage.title} · ${r.module.title}` : "—"}</dd></div>
                <div><dt>{T.submittedAt}</dt><dd>{fmtDate(r.submitted_at)}</dd></div>
              </dl>
              {r.reviewer_notes && (
                <div className="rq-prev-notes">{r.reviewer_notes}</div>
              )}
              <div className="rq-card-actions">
                <Link href={r.detail_href} className="rq-open">{T.open}</Link>
                {r.review_status === "PENDING_REVIEW" && !viewOnly && (
                  <div className="rq-decide">
                    <button className="rq-reject" onClick={() => openDecision(r, "reject")}>{T.reject}</button>
                    <button className="rq-approve" onClick={() => openDecision(r, "approve")}>{T.approve}</button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Notes dialog */}
      {decisionFor && (
        <div className="rq-dlg-overlay" onClick={() => !saving && setDecisionFor(null)}>
          <div className="rq-dlg" onClick={(e) => e.stopPropagation()} dir={dir}>
            <h3 className="rq-dlg-title">
              {decisionFor.action === "approve" ? T.approve : T.reject} — {decisionFor.row.title}
            </h3>
            <textarea
              className="rq-dlg-notes"
              rows={4}
              placeholder={T.notesPh}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoFocus
            />
            {error && <div className="rq-dlg-err">{error}</div>}
            <div className="rq-dlg-actions">
              <button className="rq-dlg-cancel" onClick={() => setDecisionFor(null)} disabled={saving}>{T.cancel}</button>
              <button
                className={`rq-dlg-submit ${decisionFor.action === "reject" ? "danger" : ""}`}
                onClick={submitDecision}
                disabled={saving}
              >
                {saving ? T.saving : T.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        .rq-page { font-family: 'Cairo', sans-serif; }
        .rq-hero { margin-bottom: 18px; }
        .rq-title { font-size: 24px; font-weight: 900; color: #1B1810; margin: 0 0 6px; }
        .rq-sub { font-size: 13.5px; color: #5E5A52; max-width: 740px; line-height: 1.85; margin: 0; }
        .rq-toolbar { display: flex; gap: 8px; margin-bottom: 18px; }
        .rq-toggle { background: #FFFDF8; border: 1.5px solid rgba(194,160,89,0.32); color: #5E4A20; padding: 8px 16px; border-radius: 99px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
        .rq-toggle.active { background: linear-gradient(180deg,#1E2329,#11151A); color: #E5B93C; border-color: transparent; }
        .rq-empty { padding: 60px 20px; text-align: center; color: #8A8478; font-weight: 700; background: #FFFDF8; border: 1px solid rgba(8,11,12,0.07); border-radius: 14px; }
        .rq-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px,1fr)); gap: 14px; }
        .rq-card { background: #FFFDF8; border: 1.5px solid rgba(194,160,89,0.30); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .rq-card.rq-st-PENDING_REVIEW { border-color: rgba(194,160,89,0.6); box-shadow: 0 4px 14px rgba(194,160,89,0.16); }
        .rq-card.rq-st-APPROVED { background: linear-gradient(165deg,#F0F8F2,#E6F2EA); }
        .rq-card.rq-st-REJECTED { background: linear-gradient(165deg,#FBEBEB,#F5DCDC); }
        .rq-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .rq-kind { font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 9px; border-radius: 99px; }
        .rq-kind--lesson { background: rgba(20,80,140,0.10); color: #14528C; }
        .rq-kind--quiz { background: rgba(122,30,30,0.10); color: #7A1E1E; }
        .rq-tag { font-size: 10.5px; font-weight: 800; padding: 3px 10px; border-radius: 99px; }
        .rq-st-tag-PENDING_REVIEW { background: rgba(194,160,89,0.20); color: #6B4F1E; }
        .rq-st-tag-APPROVED { background: rgba(45,138,74,0.16); color: #1E5C2E; }
        .rq-st-tag-REJECTED { background: rgba(139,26,26,0.12); color: #7A1E1E; }
        .rq-st-tag-DRAFT { background: rgba(8,11,12,0.06); color: #5E5A52; }
        .rq-card-title { font-size: 16px; font-weight: 900; color: #1B1810; margin: 0; line-height: 1.35; }
        .rq-card-meta { margin: 0; display: flex; flex-direction: column; gap: 6px; }
        .rq-card-meta > div { display: flex; gap: 10px; font-size: 12.5px; }
        .rq-card-meta dt { font-weight: 800; color: #8B6915; min-width: 70px; margin: 0; }
        .rq-card-meta dd { margin: 0; color: #2E2210; }
        .rq-prev-notes { background: rgba(139,26,26,0.06); border: 1px solid rgba(139,26,26,0.18); padding: 9px 11px; border-radius: 8px; font-size: 12px; color: #5A1818; line-height: 1.7; }
        .rq-card-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
        .rq-open { color: #6B4F1E; font-size: 12.5px; font-weight: 800; text-decoration: none; }
        .rq-decide { display: flex; gap: 8px; }
        .rq-approve { background: linear-gradient(180deg,#2D8A4A,#1E5C2E); color: #FFF; border: none; padding: 7px 16px; border-radius: 8px; font-family: inherit; font-weight: 800; font-size: 12px; cursor: pointer; }
        .rq-reject { background: linear-gradient(180deg,#A33333,#7A1E1E); color: #FFF; border: none; padding: 7px 16px; border-radius: 8px; font-family: inherit; font-weight: 800; font-size: 12px; cursor: pointer; }
        .rq-dlg-overlay { position: fixed; inset: 0; background: rgba(8,11,12,0.55); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; backdrop-filter: blur(4px); }
        .rq-dlg { background: #FFFDF8; border-radius: 16px; padding: 24px; max-width: 480px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .rq-dlg-title { font-size: 15.5px; font-weight: 900; color: #1B1810; margin: 0 0 14px; }
        .rq-dlg-notes { width: 100%; padding: 11px 13px; border: 1.5px solid rgba(194,160,89,0.32); border-radius: 9px; font-family: inherit; font-size: 13.5px; background: #FFF; outline: none; resize: vertical; }
        .rq-dlg-notes:focus { border-color: #B89B5E; }
        .rq-dlg-err { color: #7A1E1E; font-size: 12.5px; font-weight: 700; margin-top: 10px; }
        .rq-dlg-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
        .rq-dlg-cancel { background: none; border: 1px solid rgba(8,11,12,0.18); color: #5E5A52; padding: 9px 16px; border-radius: 9px; font-family: inherit; font-weight: 700; cursor: pointer; font-size: 13px; }
        .rq-dlg-submit { background: linear-gradient(180deg,#2D8A4A,#1E5C2E); color: #FFF; border: none; padding: 9px 18px; border-radius: 9px; font-family: inherit; font-weight: 800; cursor: pointer; font-size: 13px; }
        .rq-dlg-submit.danger { background: linear-gradient(180deg,#A33333,#7A1E1E); }
      `}</style>
    </div>
  );
}
