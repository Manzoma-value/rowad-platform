"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import RowadBoard, { type Card, type Placement } from "@/components/games/RowadBoard";

type Lang = "ar" | "sq" | "en";
type LevelRow = { order: number; name_ar: string; name_sq: string | null };

const STR = {
  ar: {
    loadFail: "تعذر تحميل اللعبة، حاول لاحقاً.",
    submitFail: "تعذر احتساب النتيجة، حاول مرة أخرى.",
    scoreOf: (s: number, t: number) => `حصلت على ${s} من ${t}`,
    bestScore: "أفضل نتيجة",
    encourageHigh: "نتيجة ممتازة! استمر في صقل معرفتك بالنموذج.",
    encourageMid: "نتيجة جيدة. يمكنك تحسينها مع مزيد من التدريب.",
    encourageLow: "كل لعبة فرصة جديدة — جرّب مرة أخرى بعد مراجعة المفاهيم.",
    playAgain: "العب مرة أخرى",
    backToGames: "العودة للألعاب",
    homeBack: "الصفحة الرئيسية",
    note: "اللعبة لا تكشف الإجابات الصحيحة، عليك أن تكتشفها بنفسك من خلال التجريب والتعلم.",
  },
  sq: {
    loadFail: "Loja nuk u ngarkua, provo më vonë.",
    submitFail: "Rezultati nuk u njehsua, provo përsëri.",
    scoreOf: (s: number, t: number) => `Ti more ${s} nga ${t}`,
    bestScore: "Rezultati më i mirë",
    encourageHigh: "Rezultat i shkëlqyer! Vazhdo të thellosh njohuritë e modelit.",
    encourageMid: "Rezultat i mirë. Mund ta përmirësosh me më shumë praktikë.",
    encourageLow: "Çdo lojë është një shans i ri — provo përsëri pas rishikimit.",
    playAgain: "Luaj sërish",
    backToGames: "Kthehu te lojërat",
    homeBack: "Shtëpia",
    note: "Loja nuk t'i zbulon përgjigjet e sakta — duhet t'i zbulosh vetë përmes provës dhe mësimit.",
  },
} as const;

type Data = {
  stage: "STAGE1" | "STAGE2";
  title_ar: string;
  title_sq: string | null;
  levels: LevelRow[];
  cards: Card[];
};

export default function CardGamePlay({
  stage,
  backHref,
}: {
  stage: "STAGE1" | "STAGE2";
  backHref: string;
}) {
  const { lang } = useLang();
  const router = useRouter();
  const L: Lang = lang === "sq" ? "sq" : lang === "en" ? "en" : "ar";
  const T = STR[L === "en" ? "ar" : L];

  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState("");

  const bestKey = `cardGameBest:${stage}`;

  const load = useCallback(() => {
    setLoadError("");
    setResult(null);
    setSubmitError("");
    fetch(`/api/teacher/model?stage=${stage}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return (await r.json()) as Data;
      })
      .then((d) => setData(d))
      .catch(() => setLoadError(T.loadFail));
  }, [stage, T.loadFail]);

  useEffect(() => {
    load();
    try {
      const stored = window.localStorage.getItem(bestKey);
      if (stored) setBestScore(parseInt(stored, 10));
    } catch { /* ignore */ }
  }, [load, bestKey]);

  const handleSubmit = useCallback(async (placements: Placement[]) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const r = await fetch("/api/teacher/model/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, placements }),
      });
      if (!r.ok) {
        setSubmitError(T.submitFail);
        setSubmitting(false);
        return;
      }
      const d = (await r.json()) as { score: number; total: number };
      setResult(d);
      if (bestScore == null || d.score > bestScore) {
        try {
          window.localStorage.setItem(bestKey, String(d.score));
          setBestScore(d.score);
        } catch { /* ignore */ }
      }
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmitError(T.submitFail);
      setSubmitting(false);
    }
  }, [stage, bestKey, bestScore, T.submitFail]);

  if (!data && !loadError) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <MandalaLoader />
      </div>
    );
  }
  if (loadError) {
    return <div style={{ padding: 40, textAlign: "center", color: "#6B1E2D", fontWeight: 700 }}>{loadError}</div>;
  }
  if (!data) return null;

  const title = L === "sq" && data.title_sq ? data.title_sq : data.title_ar;

  if (result) {
    const pct = (result.score / result.total) * 100;
    const msg = pct >= 80 ? T.encourageHigh : pct >= 50 ? T.encourageMid : T.encourageLow;
    return (
      <div className="cg-res-wrap" dir={L === "ar" ? "rtl" : "ltr"}>
        <div className="cg-res-card">
          <div className="cg-res-badge">
            {stage === "STAGE1"
              ? (L === "ar" ? "بطاقة 1" : "Karta 1")
              : (L === "ar" ? "بطاقة 2" : "Karta 2")}
          </div>
          <div className="cg-res-ring" style={{ "--pct": pct } as React.CSSProperties}>
            <span className="cg-res-score">{result.score}</span>
            <span className="cg-res-tot">/ {result.total}</span>
          </div>
          <h1 className="cg-res-title">{T.scoreOf(result.score, result.total)}</h1>
          {bestScore != null && (
            <div className="cg-res-best">
              <span>{T.bestScore}:</span>
              <strong>{bestScore} / {result.total}</strong>
            </div>
          )}
          <p className="cg-res-msg">{msg}</p>
          <p className="cg-res-note">{T.note}</p>
          <div className="cg-res-actions">
            <button className="cg-btn-primary" onClick={load}>{T.playAgain}</button>
            <button className="cg-btn-ghost" onClick={() => router.push(backHref)}>{T.backToGames}</button>
          </div>
        </div>
        <style>{cg_styles}</style>
      </div>
    );
  }

  return (
    <div className="cg-play">
      {submitError && <div className="cg-banner">{submitError}</div>}
      <RowadBoard
        lang={L}
        title={title}
        levels={data.levels}
        cards={data.cards}
        detailed={stage === "STAGE2"}
        initial={[]}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
      <style>{cg_styles}</style>
    </div>
  );
}

const cg_styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
  .cg-play { font-family: 'Cairo', sans-serif; }
  .cg-banner {
    max-width: 700px; margin: 0 auto 18px;
    background: rgba(107,30,45,.12); color: #6B1E2D;
    border: 1px solid rgba(107,30,45,.32); border-radius: 12px;
    padding: 11px 16px; text-align: center; font-weight: 800; font-size: 13.5px;
  }
  .cg-res-wrap {
    min-height: 78vh; display: flex; align-items: center; justify-content: center;
    padding: 30px; font-family: 'Cairo', sans-serif;
    background:
      radial-gradient(ellipse at 50% 10%, #F7F3EB 0%, transparent 55%),
      linear-gradient(160deg,#E5E0D5,#E5E0D5);
  }
  .cg-res-card {
    max-width: 560px; text-align: center;
    background: linear-gradient(160deg, #F7F3EB, #E5E0D5);
    border: 1.5px solid #B8A082; border-radius: 22px;
    padding: 44px clamp(20px, 4vw, 42px);
    box-shadow: 0 14px 50px rgba(107,30,45,.14),
      inset 0 0 0 5px #E5E0D5, inset 0 0 0 6.5px rgba(107,30,45,.42);
  }
  .cg-res-badge {
    display: inline-block; font-size: 11.5px; font-weight: 900; color: #6B1E2D;
    background: rgba(107,30,45,.13); padding: 5px 16px; border-radius: 99px;
    margin-bottom: 18px; letter-spacing: 0.18em; text-transform: uppercase;
    border: 1px solid rgba(107,30,45,0.32);
  }
  .cg-res-ring {
    width: 160px; height: 160px; margin: 0 auto 18px;
    display: flex; align-items: center; justify-content: center; gap: 4px;
    border-radius: 50%; position: relative;
    background:
      conic-gradient(#B8A082 calc(var(--pct) * 1%), rgba(107,30,45,0.18) 0);
    box-shadow: inset 0 0 0 8px #F7F3EB, 0 4px 18px rgba(107,30,45,0.18);
  }
  .cg-res-score { font-size: 48px; font-weight: 900; color: #6B1E2D; line-height: 1; }
  .cg-res-tot { font-size: 16px; font-weight: 700; color: #796A62; }
  .cg-res-title { font-size: 22px; font-weight: 900; color: #6B1E2D; margin: 0 0 10px; }
  .cg-res-best {
    display: inline-flex; gap: 8px; padding: 7px 16px; border-radius: 99px;
    background: rgba(107,30,45,0.12); border: 1px solid rgba(107,30,45,0.30);
    font-size: 13px; color: #796A62; margin-bottom: 16px;
  }
  .cg-res-best strong { color: #6B1E2D; font-weight: 900; }
  .cg-res-msg  { font-size: 14px; color: #6B1E2D; line-height: 1.9; margin: 0 0 10px; font-weight: 600; }
  .cg-res-note { font-size: 12.5px; color: #796A62; line-height: 1.8; margin: 0 0 24px; font-style: italic; }
  .cg-res-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .cg-btn-primary {
    padding: 12px 30px; font-size: 14px; font-weight: 900;
    background: linear-gradient(180deg, #B8A082, #B8A082);
    color: #4A0E1C; border: none; border-radius: 12px; cursor: pointer;
    font-family: inherit;
    box-shadow: 0 6px 18px rgba(107,30,45,0.32), inset 0 1.5px 0 rgba(255,251,245,0.4);
    transition: transform 0.18s;
  }
  .cg-btn-primary:hover { transform: translateY(-2px); }
  .cg-btn-ghost {
    padding: 12px 26px; font-size: 14px; font-weight: 800;
    background: transparent; color: #6B1E2D;
    border: 1.5px solid rgba(107,30,45,0.45); border-radius: 12px; cursor: pointer;
    font-family: inherit;
  }
  .cg-btn-ghost:hover { background: rgba(107,30,45,0.08); border-color: #B8A082; }
`;
