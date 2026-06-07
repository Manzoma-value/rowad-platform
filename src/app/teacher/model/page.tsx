"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";
import { invalidateCache } from "@/lib/api-cache";
import MandalaLoader from "@/components/MandalaLoader";
import RowadBoard, { type Card, type Placement } from "./RowadBoard";

type LevelRow = { order: number; name_ar: string; name_sq: string | null };
type ModelData = {
  onboarding_status:
    | "STAGE1_PENDING"
    | "STAGE1_REVIEW"
    | "STAGE2_PENDING"
    | "AWAITING_CLASS"
    | "ACTIVE";
  stage: "STAGE1" | "STAGE2" | null;
  title_ar: string;
  title_sq: string | null;
  levels: LevelRow[];
  cards: Card[];
  placements: Placement[];
};

const WAIT = {
  ar: {
    stage1Review:
      "تم إرسال المرحلة الأولى بنجاح، وهي الآن في انتظار مراجعة الإدارة والموافقة للانتقال إلى المرحلة الثانية.",
    awaitingClass:
      "تم إرسال المرحلة الثانية بنجاح. أنت الآن في انتظار قيام إدارة المدرسة بتعيينك إلى فصل لبدء مهامك كمعلم.",
    underReview: "قيد المراجعة",
    almostThere: "أوشكت على الانتهاء",
    stage1Badge: "المرحلة الأولى",
    stage2Badge: "المرحلة الثانية",
    loadError: "تعذر تحميل النموذج التعليمي.",
    submitError: "تعذر إرسال النموذج، حاول مرة أخرى.",
  },
  sq: {
    stage1Review:
      "Faza e parë u dërgua me sukses dhe po pret shqyrtimin e administratës për të kaluar në fazën e dytë.",
    awaitingClass:
      "Faza e dytë u dërgua me sukses. Tani po pritet që administrata t'ju caktojë në një klasë.",
    underReview: "Në shqyrtim",
    almostThere: "Gati përfunduat",
    stage1Badge: "Faza e parë",
    stage2Badge: "Faza e dytë",
    loadError: "Modeli nuk u ngarkua.",
    submitError: "Dërgimi dështoi, provo përsëri.",
  },
} as const;

function WaitingScreen({
  lang,
  badge,
  title,
  message,
}: {
  lang: "ar" | "sq" | "en";
  badge: string;
  title: string;
  message: string;
}) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <div className="rw-wait" dir={dir}>
      <div className="rw-wait-card">
        <div className="rw-wait-icon">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <span className="rw-wait-badge">{badge}</span>
        <h1 className="rw-wait-title">{title}</h1>
        <p className="rw-wait-msg">{message}</p>
        <div className="rw-wait-dots"><span /><span /><span /></div>
      </div>
      <style>{`
        .rw-wait{min-height:70vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:'Cairo','Tajawal',sans-serif}
        .rw-wait-card{max-width:520px;text-align:center;background:linear-gradient(180deg,#FFFDF8,#F3ECDD);
          border:1.5px solid #D8C9A6;border-radius:20px;padding:44px 36px;box-shadow:0 10px 40px rgba(0,0,0,.06)}
        .rw-wait-icon{width:84px;height:84px;border-radius:50%;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;
          background:rgba(200,169,106,.12);color:#C8A96A;border:1.5px solid rgba(200,169,106,.3)}
        .rw-wait-badge{display:inline-block;font-size:12px;font-weight:800;color:#C8A96A;background:rgba(200,169,106,.14);
          padding:4px 14px;border-radius:99px;margin-bottom:12px}
        .rw-wait-title{font-size:21px;font-weight:900;color:#2b2417;margin:0 0 12px}
        .rw-wait-msg{font-size:14.5px;color:#7a6c4d;line-height:1.8;margin:0 0 18px}
        .rw-wait-dots{display:flex;gap:6px;justify-content:center}
        .rw-wait-dots span{width:8px;height:8px;border-radius:50%;background:#C8A96A;animation:rwpulse 1.4s ease-in-out infinite}
        .rw-wait-dots span:nth-child(2){animation-delay:.2s}.rw-wait-dots span:nth-child(3){animation-delay:.4s}
        @keyframes rwpulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
      `}</style>
    </div>
  );
}

export default function TeacherModelPage() {
  const { lang } = useLang();
  const router = useRouter();
  const w = WAIT[lang === "sq" ? "sq" : "ar"];

  const [data, setData] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/teacher/model", { cache: "no-store" });
      if (!r.ok) throw new Error();
      const d: ModelData = await r.json();
      setData(d);
      if (d.onboarding_status === "ACTIVE") {
        router.replace("/teacher");
        return;
      }
    } catch {
      setError(w.loadError);
    } finally {
      setLoading(false);
    }
  }, [router, w.loadError]);

  useEffect(() => {
    load();
  }, [load]);

  const saveDraft = useCallback(
    async (placements: Placement[]) => {
      if (!data?.stage) return;
      await fetch("/api/teacher/model/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: data.stage, placements }),
      }).catch(() => {});
    },
    [data?.stage],
  );

  const handleSubmit = useCallback(
    async (placements: Placement[]) => {
      if (!data?.stage) return;
      setSubmitting(true);
      setError("");
      try {
        const r = await fetch("/api/teacher/model/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: data.stage, placements }),
        });
        const d = await r.json();
        if (!r.ok) {
          setError(d.error ?? w.submitError);
          setSubmitting(false);
          return;
        }
        // Status changed — refresh gating everywhere
        invalidateCache("/api/teacher");
        window.location.reload();
      } catch {
        setError(w.submitError);
        setSubmitting(false);
      }
    },
    [data?.stage, w.submitError],
  );

  if (loading) return <MandalaLoader />;

  if (error && !data) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#8b1a1a" }}>{error}</div>
    );
  }

  if (!data) return null;

  const title = lang === "sq" && data.title_sq ? data.title_sq : data.title_ar;

  if (data.onboarding_status === "STAGE1_REVIEW") {
    return (
      <WaitingScreen lang={lang} badge={w.stage1Badge} title={w.underReview} message={w.stage1Review} />
    );
  }
  if (data.onboarding_status === "AWAITING_CLASS") {
    return (
      <WaitingScreen lang={lang} badge={w.stage2Badge} title={w.almostThere} message={w.awaitingClass} />
    );
  }

  if (data.stage === "STAGE1" || data.stage === "STAGE2") {
    return (
      <div style={{ padding: "12px 8px 48px" }}>
        {error && (
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto 12px",
              background: "rgba(139,26,26,.06)",
              border: "1px solid rgba(139,26,26,.2)",
              color: "#8b1a1a",
              padding: "11px 16px",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}
        <RowadBoard
          lang={lang}
          title={title}
          levels={data.levels}
          cards={data.cards}
          detailed={data.stage === "STAGE2"}
          initial={data.placements}
          onChange={saveDraft}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    );
  }

  return null;
}
