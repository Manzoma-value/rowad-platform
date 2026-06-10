"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import { useConfirm } from "@/lib/confirm-dialog";
import { COLUMN_ORDER, COLUMN_LABELS } from "@/lib/rowad";
import type { Maqsad } from "@prisma/client";

type Level = { order: number; name_ar: string; name_sq: string | null };
type Concept = { id: string; name_ar: string; name_sq: string | null; maqsad: Maqsad; level: number };
type Placement = { concept_id: string; placed_maqsad: Maqsad; placed_level: number; is_correct: boolean };
type Submission = {
  id: string;
  stage: "STAGE1" | "STAGE2";
  attempt_number: number;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  score: number | null;
  total: number;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  teacher: {
    id: string;
    onboarding_status: string;
    profile: { full_name: string; email: string | null; avatar_url: string | null };
    classes: { id: string; name: string }[];
  };
  reviewer: { full_name: string } | null;
  placements: Placement[];
  model: { levels: Level[]; concepts: Concept[] };
};

const L = {
  ar: {
    back: "رجوع",
    stage1: "المرحلة الأولى", stage2: "المرحلة الثانية",
    score: "الدرجة", correct: "صحيحة", wrong: "خاطئة",
    teacherAnswer: "إجابة المعلم", correctAnswer: "الإجابة الصحيحة",
    approveStage1: "الموافقة وفتح المرحلة الثانية",
    approveStage2: "الموافقة وإحالته لتعيين الفصل",
    reject: "رفض / إعادة المحاولة",
    notes: "ملاحظات (اختياري)", notesPh: "ملاحظة للمعلم أو لسجل المراجعة...",
    approved: "تمت الموافقة", rejected: "مرفوضة", submitted: "بانتظار المراجعة",
    reviewedBy: "روجعت بواسطة", legend: "المفتاح",
    maqsadHdr: "المقصد", levelHdr: "المستوى", transform: "التحول الاستراتيجي في المنظومة",
    empty: "—", email: "البريد",
    stage1Note: "بعد الموافقة على هذه المحاولة سيتمكّن المعلم من الانتقال إلى المرحلة الثانية.",
    stage2Note: "بعد الموافقة على المرحلة الثانية، عيّن المعلم إلى فصل من صفحة الفصول.",
    confirmReject: "رفض هذه المحاولة وإعادتها للمعلم؟",
    saving: "جارٍ الحفظ...", goClasses: "صفحة الفصول",
    attempt: (n: number) => `المحاولة #${n}`,
  },
  en: {
    back: "Back",
    stage1: "Stage 1", stage2: "Stage 2",
    score: "Score", correct: "Correct", wrong: "Wrong",
    teacherAnswer: "Teacher's answer", correctAnswer: "Correct answer",
    approveStage1: "Approve & unlock Stage 2",
    approveStage2: "Approve & send for class assignment",
    reject: "Reject / retry",
    notes: "Notes (optional)", notesPh: "A note for the teacher or the review log...",
    approved: "Approved", rejected: "Rejected", submitted: "Awaiting review",
    reviewedBy: "Reviewed by", legend: "Legend",
    maqsadHdr: "Maqsad", levelHdr: "Level", transform: "Strategic transformation in the system",
    empty: "—", email: "Email",
    stage1Note: "Approving this attempt unlocks Stage 2 for the teacher.",
    stage2Note: "After approving Stage 2, assign the teacher to a class from the Classes page.",
    confirmReject: "Reject this attempt and send it back to the teacher?",
    saving: "Saving...", goClasses: "Classes page",
    attempt: (n: number) => `Attempt #${n}`,
  },
} as const;

const cellKey = (level: number, maqsad: Maqsad) => `${level}:${maqsad}`;

export default function SchoolAdminRowadDetailPage() {
  const { lang } = useLang();
  const tr = L[lang === "en" ? "en" : "ar"];
  const dir = lang === "en" ? "ltr" : "rtl";
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const confirm = useConfirm();

  const [sub, setSub] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/school-admin/rowad/${id}`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setSub(d.submission);
      setNotes(d.submission?.reviewer_notes ?? "");
    } catch {
      setError("load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(action: "approve" | "reject") {
    if (action === "reject" && !(await confirm({ message: tr.confirmReject, variant: "warning", irreversible: false }))) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/school-admin/rowad/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? "error");
        setBusy(false);
        return;
      }
      router.push("/school-admin/rowad");
    } catch {
      setError("error");
      setBusy(false);
    }
  }

  if (loading) return <MandalaLoader />;
  if (!sub) return <div style={{ padding: 40, textAlign: "center", color: "#8b1a1a" }}>Not found</div>;

  const loc = (ar?: string | null, sq?: string | null) =>
    (lang === "en" ? sq || ar : ar) ?? "";
  const conceptById: Record<string, Concept> = {};
  for (const c of sub.model.concepts) conceptById[c.id] = c;
  const correctByCell: Record<string, Concept> = {};
  for (const c of sub.model.concepts) correctByCell[cellKey(c.level, c.maqsad)] = c;
  const placementByCell: Record<string, Placement> = {};
  for (const p of sub.placements) placementByCell[cellKey(p.placed_level, p.placed_maqsad)] = p;

  const levels = [...sub.model.levels].sort((a, b) => a.order - b.order);
  const correctCount = sub.placements.filter((p) => p.is_correct).length;
  const wrongCount = sub.placements.length - correctCount;
  const canReview = sub.status === "SUBMITTED";
  const approveLabel = sub.stage === "STAGE1" ? tr.approveStage1 : tr.approveStage2;
  const noteHint = sub.stage === "STAGE1" ? tr.stage1Note : tr.stage2Note;

  function renderRow(lvl: Level) {
    return (
      <div className="sd-row" key={lvl.order}>
        <div className="sd-rowlabel">
          <span className="sd-rowlabel-num">{lvl.order}</span>
          <span className="sd-rowlabel-text">{loc(lvl.name_ar, lvl.name_sq)}</span>
        </div>
        {COLUMN_ORDER.map((mq) => {
          const placement = placementByCell[cellKey(lvl.order, mq)];
          const placedConcept = placement ? conceptById[placement.concept_id] : null;
          const correct = correctByCell[cellKey(lvl.order, mq)];
          const isCorrect = placement?.is_correct;
          return (
            <div
              key={mq}
              className={`sd-cell ${placement ? (isCorrect ? "ok" : "bad") : "blank"}`}
            >
              {placedConcept ? (
                <span className="sd-placed">{loc(placedConcept.name_ar, placedConcept.name_sq)}</span>
              ) : (
                <span className="sd-placed sd-muted">{tr.empty}</span>
              )}
              {!isCorrect && correct && (
                <span className="sd-correct">✓ {loc(correct.name_ar, correct.name_sq)}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="sd-page" dir={dir}>
      <Link href="/school-admin/rowad" className="sd-back">‹ {tr.back}</Link>

      {/* Header */}
      <div className="sd-header">
        <div className="sd-teacher">
          <div className="sd-av">{sub.teacher.profile.full_name.charAt(0)}</div>
          <div>
            <h1 className="sd-name">{sub.teacher.profile.full_name}</h1>
            {sub.teacher.profile.email && (
              <p className="sd-email">{tr.email}: {sub.teacher.profile.email}</p>
            )}
            <div className="sd-tag-row">
              <span className="sd-stage-tag">{sub.stage === "STAGE1" ? tr.stage1 : tr.stage2}</span>
              <span className="sd-attempt-tag">{tr.attempt(sub.attempt_number)}</span>
            </div>
          </div>
        </div>
        <div className="sd-scorebox">
          <span className="sd-score-val">{sub.score ?? 0}<span className="sd-score-total">/{sub.total}</span></span>
          <span className="sd-score-label">{tr.score}</span>
          <div className="sd-score-split">
            <span className="sd-ok-dot" /> {correctCount} {tr.correct}
            <span className="sd-bad-dot" /> {wrongCount} {tr.wrong}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="sd-legend">
        <span><span className="sd-sw sd-sw-ok" /> {tr.correct}</span>
        <span><span className="sd-sw sd-sw-bad" /> {tr.wrong}</span>
        <span className="sd-legend-note">✓ = {tr.correctAnswer}</span>
      </div>

      {/* Grid */}
      <div className="sd-grid">
        <div className="sd-colhead-row">
          <div className="sd-corner"><span>{tr.levelHdr}</span><span style={{ opacity: .4 }}>/</span><span>{tr.maqsadHdr}</span></div>
          {COLUMN_ORDER.map((mq) => (
            <div key={mq} className="sd-colhead">{COLUMN_LABELS[mq].ar}</div>
          ))}
        </div>
        <div>{levels.filter((l) => l.order <= 2).map(renderRow)}</div>
        <div className="sd-band">{tr.transform}</div>
        <div>{levels.filter((l) => l.order >= 3).map(renderRow)}</div>
      </div>

      {/* Review actions */}
      {error && <div className="sd-error">{error === "load" ? "Error" : error}</div>}

      {canReview ? (
        <div className="sd-review">
          <label className="sd-notes-label">{tr.notes}</label>
          <textarea
            className="sd-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={tr.notesPh}
          />
          <div className="sd-actions">
            <button className="sd-btn sd-approve" disabled={busy} onClick={() => review("approve")}>
              {busy ? tr.saving : approveLabel}
            </button>
            <button className="sd-btn sd-reject" disabled={busy} onClick={() => review("reject")}>
              {tr.reject}
            </button>
          </div>
          <p className="sd-hint">{noteHint}</p>
        </div>
      ) : (
        <div className="sd-status-card">
          <span className={`sd-status-badge ${sub.status.toLowerCase()}`}>
            {sub.status === "APPROVED" ? tr.approved : sub.status === "REJECTED" ? tr.rejected : tr.submitted}
          </span>
          {sub.reviewer && <span className="sd-reviewed-by">{tr.reviewedBy}: {sub.reviewer.full_name}</span>}
          {sub.reviewer_notes && <p className="sd-saved-notes">{sub.reviewer_notes}</p>}
          {sub.status === "APPROVED" && sub.stage === "STAGE2" && (
            <p className="sd-hint">
              {tr.stage2Note}{" "}
              <Link href="/school-admin/classes" className="sd-classes-link">{tr.goClasses}</Link>
            </p>
          )}
        </div>
      )}

      <style>{`
        .sd-page{font-family:'Cairo',sans-serif;color:#2b2417;max-width:1000px}
        .sd-back{display:inline-block;color:#8A7B60;font-size:13px;font-weight:700;text-decoration:none;margin-bottom:16px}
        .sd-back:hover{color:#0B0B0C}
        .sd-header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;background:#fff;border:1px solid #E4DDD0;border-radius:16px;padding:18px 22px;margin-bottom:14px}
        .sd-teacher{display:flex;align-items:center;gap:14px}
        .sd-av{width:50px;height:50px;border-radius:14px;background:linear-gradient(135deg,#D8C28A,#B89B5E);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#11151A}
        .sd-name{font-size:19px;font-weight:900;color:#0B0B0C;margin:0}
        .sd-email{font-size:12px;color:#8A7B60;margin:2px 0 6px}
        .sd-tag-row{display:flex;gap:6px;flex-wrap:wrap}
        .sd-stage-tag{display:inline-block;font-size:11px;font-weight:800;color:#9a6d12;background:rgba(229,185,60,.14);padding:3px 11px;border-radius:99px}
        .sd-attempt-tag{display:inline-block;font-size:11px;font-weight:800;color:#0B0B0C;background:rgba(11,11,12,0.06);border:1px solid rgba(11,11,12,0.10);padding:3px 11px;border-radius:99px;font-variant-numeric:tabular-nums}
        .sd-scorebox{text-align:center;background:#FBF8F1;border:1px solid #EFE7D8;border-radius:14px;padding:12px 22px}
        .sd-score-val{font-size:30px;font-weight:900;color:#0B0B0C;font-variant-numeric:tabular-nums}
        .sd-score-total{font-size:16px;color:#B89B5E}
        .sd-score-label{display:block;font-size:11px;font-weight:800;color:#8A7B60;text-transform:uppercase;letter-spacing:.5px}
        .sd-score-split{display:flex;align-items:center;gap:6px;justify-content:center;font-size:11.5px;color:#8A7B60;margin-top:6px;font-weight:700}
        .sd-ok-dot,.sd-bad-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-inline-start:6px}
        .sd-ok-dot{background:#3f8a4f}.sd-bad-dot{background:#b3402f}
        .sd-legend{display:flex;gap:18px;align-items:center;font-size:12px;font-weight:700;color:#7a6c4d;margin-bottom:10px;flex-wrap:wrap}
        .sd-sw{width:13px;height:13px;border-radius:4px;display:inline-block;margin-inline-end:5px;vertical-align:-2px}
        .sd-sw-ok{background:rgba(63,138,79,.2);border:1.5px solid #3f8a4f}
        .sd-sw-bad{background:rgba(179,64,47,.16);border:1.5px solid #b3402f}
        .sd-legend-note{color:#3f8a4f}

        .sd-grid{border:1.5px solid #D8C9A6;border-radius:14px;overflow:hidden;background:#FBF8F1;margin-bottom:18px}
        .sd-colhead-row,.sd-row{display:grid;grid-template-columns:140px repeat(5,1fr)}
        .sd-colhead-row{background:linear-gradient(180deg,#2b2417,#1c1810)}
        .sd-corner{display:flex;align-items:center;justify-content:center;gap:3px;padding:10px;font-size:9.5px;font-weight:700;color:rgba(200,169,106,.7)}
        .sd-colhead{padding:11px 6px;text-align:center;font-size:13px;font-weight:800;color:#E5B93C;border-inline-start:1px solid rgba(200,169,106,.15)}
        .sd-row{border-top:1px solid #E2D7BF}
        .sd-rowlabel{display:flex;align-items:center;gap:7px;padding:8px 10px;background:#F3ECDD;border-inline-end:1px solid #D8C9A6;min-height:70px}
        .sd-rowlabel-num{flex-shrink:0;width:22px;height:22px;border-radius:50%;background:#2b2417;color:#C8A96A;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800}
        .sd-rowlabel-text{font-size:11.5px;font-weight:800;color:#2b2417;line-height:1.3}
        .sd-cell{padding:7px;border-inline-start:1px solid #E2D7BF;display:flex;flex-direction:column;gap:4px;justify-content:center;min-height:70px}
        .sd-cell.ok{background:rgba(63,138,79,.1)}
        .sd-cell.bad{background:rgba(179,64,47,.08)}
        .sd-placed{font-size:12px;font-weight:800;line-height:1.3}
        .sd-cell.ok .sd-placed{color:#2f7a40}
        .sd-cell.bad .sd-placed{color:#b3402f}
        .sd-muted{color:#b0a48a !important;font-weight:600}
        .sd-correct{font-size:10.5px;font-weight:700;color:#3f8a4f;line-height:1.25}
        .sd-band{background:linear-gradient(90deg,transparent,rgba(200,169,106,.18),transparent);text-align:center;padding:7px;font-size:12px;font-weight:800;color:#8a6d2e;border-top:1px solid #D8C9A6;border-bottom:1px solid #D8C9A6}

        .sd-review{background:#fff;border:1px solid #E4DDD0;border-radius:16px;padding:18px 20px}
        .sd-notes-label{font-size:12px;font-weight:800;color:#8A7B60;display:block;margin-bottom:7px}
        .sd-notes{width:100%;border:1.5px solid #E4DDD0;border-radius:10px;padding:10px 13px;font-size:13.5px;font-family:inherit;resize:vertical;outline:none;background:#FBF8F1}
        .sd-notes:focus{border-color:#C8A96A;background:#fff}
        .sd-actions{display:flex;gap:12px;margin-top:14px;flex-wrap:wrap}
        .sd-btn{padding:12px 26px;border-radius:11px;font-size:14px;font-weight:800;font-family:inherit;cursor:pointer;border:1px solid transparent;transition:all .15s}
        .sd-btn:disabled{opacity:.5;cursor:not-allowed}
        .sd-approve{background:#2f7a40;color:#fff}
        .sd-approve:hover:not(:disabled){background:#276636}
        .sd-reject{background:#fff;color:#b3402f;border-color:rgba(179,64,47,.3)}
        .sd-reject:hover:not(:disabled){background:rgba(179,64,47,.06)}
        .sd-hint{font-size:12px;color:#8A7B60;margin-top:12px;line-height:1.6}
        .sd-classes-link{color:#0B0B0C;font-weight:800;border-bottom:1.5px solid #C8A96A;text-decoration:none}
        .sd-status-card{background:#fff;border:1px solid #E4DDD0;border-radius:16px;padding:18px 20px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
        .sd-status-badge{font-size:13px;font-weight:800;padding:6px 16px;border-radius:99px}
        .sd-status-badge.approved{background:rgba(63,138,79,.14);color:#2f7a40}
        .sd-status-badge.rejected{background:rgba(139,26,26,.1);color:#8b1a1a}
        .sd-status-badge.submitted{background:rgba(229,185,60,.14);color:#9a6d12}
        .sd-reviewed-by{font-size:12px;color:#8A7B60;font-weight:700}
        .sd-saved-notes{font-size:13px;color:#2b2417;background:#FBF8F1;border:1px solid #EFE7D8;border-radius:8px;padding:8px 12px;margin:0}
        .sd-error{background:rgba(139,26,26,.06);border:1px solid rgba(139,26,26,.2);color:#8b1a1a;padding:10px 14px;border-radius:9px;font-size:13px;font-weight:600;margin-bottom:12px}
        @media(max-width:680px){.sd-colhead-row,.sd-row{grid-template-columns:74px repeat(5,1fr)}.sd-colhead{font-size:10px;padding:8px 2px}.sd-rowlabel-text{font-size:9px}.sd-placed{font-size:10px}.sd-correct{font-size:9px}}
      `}</style>
    </div>
  );
}
