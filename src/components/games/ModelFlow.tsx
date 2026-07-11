"use client";

// Consolidated "نموذج التعلم" (Learning Model) flow — two stages back-to-back
// with no admin approval, unlimited retries. Landing → STAGE1 → interstitial
// → STAGE2 → final result → play again.
//
// The old separate /card/STAGE1 and /card/STAGE2 routes still exist for
// direct access, but this is the featured way to play the model.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";
import RowadBoard, { type Card, type Placement } from "@/components/games/RowadBoard";

type Lang = "ar" | "sq" | "en";
type LevelRow = { order: number; name_ar: string; name_sq: string | null };
type StageKey = "STAGE1" | "STAGE2";
type StageData = { title_ar: string; title_sq: string | null; levels: LevelRow[]; cards: Card[] };
type Score = { score: number; total: number };

type LeaderboardEntry = { rank: number; name: string };
type MyScore = {
  best_stage1: number; best_stage2: number; best_combined: number;
  plays_stage1: number; plays_stage2: number;
  total: number; max_combined: number;
};

type Screen = "landing" | "playing" | "interstitial" | "final";

const STR = {
  ar: {
    title: "نموذج التعلم",
    tagline: "الأهم في مسارك التعليمي",
    intro:
      "اختبر فهمك للنموذج الرواد كامل — مرحلتان متتابعتان: ترتيب المفاهيم الخمسة والعشرين بحسب المقصد والمستوى، ثم نسخة موسّعة تحتوي تفاصيل كل مفهوم. لا يوجد حدّ لعدد المحاولات.",
    startBtn: "ابدأ الآن",
    continueBtn: "المرحلة الثانية →",
    finishedBtn: "ابدأ من جديد",
    backToTools: "العودة للأدوات",
    stage1Header: "المرحلة الأولى — البطاقة الأساسية",
    stage2Header: "المرحلة الثانية — البطاقة الموسّعة",
    stage1Done: "أكملت المرحلة الأولى!",
    stage1Score: (s: number, t: number) => `${s} من ${t}`,
    stage1Continue: "أنت الآن جاهز للمرحلة الثانية — نسخة موسّعة تحتوي تفاصيل كل مفهوم.",
    finalTitle: "أتممت نموذج التعلم",
    finalStage1: "المرحلة الأولى",
    finalStage2: "المرحلة الثانية",
    finalCombined: "المجموع",
    encourageHigh: "أداء استثنائي! أنت تسيطر على النموذج تماماً.",
    encourageMid: "أداء جيد. راجع المفاهيم مرة أخرى للوصول إلى الكمال.",
    encourageLow: "كل محاولة جديدة تقرّبك من الإتقان — واصل.",
    myBest: "أفضل نتيجة",
    plays: "عدد المحاولات",
    leaderboardTitle: "المتصدرون",
    leaderboardHint: "الأسماء فقط — لا نكشف النتائج. اجتهد لتظهر هنا!",
    leaderboardEmpty: "لا مشاركين بعد. كن الأول!",
    loadFail: "تعذر تحميل اللعبة.",
    submitFail: "تعذر احتساب النتيجة، حاول مرة أخرى.",
    note: "لا نكشف الإجابات — تعلّم عن طريق التجريب.",
  },
  sq: {
    title: "Modeli i Mësimit",
    tagline: "Më i rëndësishmi në rrugën tënde",
    intro:
      "Testo kuptimin tënd të plotë të Modelit Rowad — dy faza radhazi: rendit 25 konceptet sipas qëllimit dhe nivelit, pastaj versioni i zgjeruar me detajet e çdo koncepti. Pa kufi provash.",
    startBtn: "Fillo tani",
    continueBtn: "Faza e dytë →",
    finishedBtn: "Fillo përsëri",
    backToTools: "Kthehu te mjetet",
    stage1Header: "Faza 1 — Karta bazë",
    stage2Header: "Faza 2 — Karta e zgjeruar",
    stage1Done: "Përfundove Fazën 1!",
    stage1Score: (s: number, t: number) => `${s} nga ${t}`,
    stage1Continue: "Tani je gati për Fazën 2 — versionin e zgjeruar me detajet e çdo koncepti.",
    finalTitle: "Përfundove Modelin e Mësimit",
    finalStage1: "Faza 1",
    finalStage2: "Faza 2",
    finalCombined: "Totali",
    encourageHigh: "Performancë e jashtëzakonshme! E zotëron modelin plotësisht.",
    encourageMid: "Performancë e mirë. Rishiko konceptet për të arritur përsosurinë.",
    encourageLow: "Çdo provë të afron më shumë me zotërimin — vazhdo.",
    myBest: "Rezultati më i mirë",
    plays: "Prova",
    leaderboardTitle: "Kryesuesit",
    leaderboardHint: "Vetëm emrat — nuk zbulohen pikët. Përpiqu të shfaqesh këtu!",
    leaderboardEmpty: "Ende asnjë. Bëhu i pari!",
    loadFail: "Loja nuk u ngarkua.",
    submitFail: "Rezultati nuk u njehsua, provo përsëri.",
    note: "Nuk zbulojmë përgjigjet — mëso përmes provës.",
  },
} as const;

export default function ModelFlow({ backHref }: { backHref: string }) {
  const { lang } = useLang();
  const L: Lang = lang === "sq" ? "sq" : lang === "en" ? "en" : "ar";
  const T = STR[L === "en" ? "ar" : L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [screen, setScreen] = useState<Screen>("landing");
  const [stage, setStage] = useState<StageKey>("STAGE1");
  const [stageData, setStageData] = useState<StageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stage1Score, setStage1Score] = useState<Score | null>(null);
  const [stage2Score, setStage2Score] = useState<Score | null>(null);

  const [my, setMy] = useState<MyScore | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Load a stage's board data. Fires when user starts stage 1 or continues to 2.
  const loadStage = useCallback(async (s: StageKey) => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/teacher/model?stage=${s}`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      const d = (await r.json()) as StageData;
      setStageData(d);
    } catch { setError(T.loadFail); }
    finally { setLoading(false); }
  }, [T.loadFail]);

  // Refresh dashboard data (my score + leaderboard). Called on mount and
  // after each stage completes.
  const refreshDash = useCallback(async () => {
    const [m, l] = await Promise.all([
      fetch("/api/teacher/model/my-score", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/teacher/model/leaderboard", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]);
    if (m) setMy(m);
    if (l?.top) setLeaderboard(l.top);
  }, []);

  useEffect(() => { refreshDash(); }, [refreshDash]);

  const handleSubmit = useCallback(async (placements: Placement[]) => {
    setSubmitting(true);
    setError("");
    try {
      const r = await fetch("/api/teacher/model/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, placements }),
      });
      if (!r.ok) { setError(T.submitFail); setSubmitting(false); return; }
      const d = (await r.json()) as Score;
      if (stage === "STAGE1") {
        setStage1Score(d);
        setScreen("interstitial");
      } else {
        setStage2Score(d);
        setScreen("final");
      }
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      refreshDash();
    } catch { setError(T.submitFail); setSubmitting(false); }
  }, [stage, T.submitFail, refreshDash]);

  function startStage1() {
    setStage("STAGE1");
    setStage1Score(null);
    setStage2Score(null);
    setScreen("playing");
    loadStage("STAGE1");
  }
  function continueToStage2() {
    setStage("STAGE2");
    setScreen("playing");
    loadStage("STAGE2");
  }
  function playAgain() {
    setStage1Score(null);
    setStage2Score(null);
    setStageData(null);
    setScreen("landing");
    refreshDash();
  }

  // ── Landing screen ──
  if (screen === "landing") {
    return (
      <div className="mf-page" dir={dir}>
        <Link href={backHref} className="mf-back">← {T.backToTools}</Link>

        <div className="mf-hero">
          <div className="mf-hero-badge">✦ {T.tagline}</div>
          <h1 className="mf-hero-title">{T.title}</h1>
          <p className="mf-hero-sub">{T.intro}</p>
          <button className="mf-hero-btn" onClick={startStage1}>{T.startBtn}</button>
        </div>

        <div className="mf-cols">
          <section className="mf-panel">
            <h2 className="mf-panel-h">{T.myBest}</h2>
            {my ? (
              <div className="mf-my">
                <div className="mf-my-combined">
                  <span className="mf-my-combined-num">{my.best_combined}</span>
                  <span className="mf-my-combined-den">/ {my.max_combined}</span>
                </div>
                <div className="mf-my-stages">
                  <div className="mf-my-stage">
                    <span className="mf-my-stage-k">{T.finalStage1}</span>
                    <strong>{my.best_stage1} / {my.total}</strong>
                  </div>
                  <div className="mf-my-stage">
                    <span className="mf-my-stage-k">{T.finalStage2}</span>
                    <strong>{my.best_stage2} / {my.total}</strong>
                  </div>
                </div>
                <div className="mf-my-plays">
                  {T.plays}: <strong>{my.plays_stage1 + my.plays_stage2}</strong>
                </div>
              </div>
            ) : <MandalaLoader />}
          </section>

          <section className="mf-panel mf-lb">
            <h2 className="mf-panel-h">{T.leaderboardTitle}</h2>
            <p className="mf-lb-hint">{T.leaderboardHint}</p>
            {leaderboard.length === 0 ? (
              <div className="mf-lb-empty">{T.leaderboardEmpty}</div>
            ) : (
              <ol className="mf-lb-list">
                {leaderboard.map((e) => (
                  <li key={e.rank} className={`mf-lb-row mf-lb-r${e.rank}`}>
                    <span className="mf-lb-rank">{e.rank}</span>
                    <span className="mf-lb-name">{e.name}</span>
                    <span className="mf-lb-medal" aria-hidden>
                      {e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : "🥉"}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <style>{css}</style>
      </div>
    );
  }

  // ── Playing screen (stage 1 or 2) ──
  if (screen === "playing") {
    if (loading) {
      return (
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MandalaLoader />
        </div>
      );
    }
    if (error) return <div className="mf-err">{error}</div>;
    if (!stageData) return null;
    const title = L === "sq" && stageData.title_sq ? stageData.title_sq : stageData.title_ar;
    return (
      <div className="mf-play" dir={dir}>
        <div className="mf-play-header">
          <span className="mf-stage-tag">{stage === "STAGE1" ? T.stage1Header : T.stage2Header}</span>
        </div>
        {error && <div className="mf-banner">{error}</div>}
        <RowadBoard
          lang={L}
          title={title}
          levels={stageData.levels}
          cards={stageData.cards}
          detailed={stage === "STAGE2"}
          initial={[]}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
        <style>{css}</style>
      </div>
    );
  }

  // ── Interstitial (between stage 1 and stage 2) ──
  if (screen === "interstitial" && stage1Score) {
    const pct = (stage1Score.score / stage1Score.total) * 100;
    return (
      <div className="mf-page" dir={dir}>
        <div className="mf-res">
          <div className="mf-res-stage">{T.stage1Done}</div>
          <div className="mf-res-ring" style={{ "--pct": pct } as React.CSSProperties}>
            <span className="mf-res-num">{stage1Score.score}</span>
            <span className="mf-res-den">/ {stage1Score.total}</span>
          </div>
          <h2 className="mf-res-title">{T.stage1Score(stage1Score.score, stage1Score.total)}</h2>
          <p className="mf-res-msg">{T.stage1Continue}</p>
          <button className="mf-hero-btn" onClick={continueToStage2}>{T.continueBtn}</button>
        </div>
        <style>{css}</style>
      </div>
    );
  }

  // ── Final ──
  if (screen === "final" && stage1Score && stage2Score) {
    const combined = stage1Score.score + stage2Score.score;
    const maxCombined = stage1Score.total + stage2Score.total;
    const pct = (combined / maxCombined) * 100;
    const msg = pct >= 80 ? T.encourageHigh : pct >= 50 ? T.encourageMid : T.encourageLow;
    return (
      <div className="mf-page" dir={dir}>
        <div className="mf-res">
          <div className="mf-res-stage">{T.finalTitle}</div>
          <div className="mf-res-ring mf-res-ring-final" style={{ "--pct": pct } as React.CSSProperties}>
            <span className="mf-res-num">{combined}</span>
            <span className="mf-res-den">/ {maxCombined}</span>
          </div>
          <div className="mf-res-stages">
            <div className="mf-res-stage-box">
              <span>{T.finalStage1}</span>
              <strong>{stage1Score.score} / {stage1Score.total}</strong>
            </div>
            <div className="mf-res-stage-box">
              <span>{T.finalStage2}</span>
              <strong>{stage2Score.score} / {stage2Score.total}</strong>
            </div>
          </div>
          <p className="mf-res-msg">{msg}</p>
          <p className="mf-res-note">{T.note}</p>
          <div className="mf-res-actions">
            <button className="mf-hero-btn" onClick={playAgain}>{T.finishedBtn}</button>
            <Link href={backHref} className="mf-hero-ghost">{T.backToTools}</Link>
          </div>
        </div>
        <style>{css}</style>
      </div>
    );
  }

  return null;
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
.mf-page { font-family: 'Cairo', sans-serif; padding: 20px 4px 40px; max-width: 960px; margin: 0 auto; }
.mf-play { font-family: 'Cairo', sans-serif; }
.mf-play-header { display: flex; justify-content: center; margin: 6px 0 12px; }
.mf-stage-tag { font-size: 13px; font-weight: 900; letter-spacing: 0.04em; color: #6B1E2D; background: rgba(184,155,94,0.14); padding: 6px 14px; border-radius: 99px; border: 1px solid rgba(184,155,94,0.32); }
.mf-back { color: #6B1E2D; font-weight: 800; font-size: 13px; text-decoration: none; margin-bottom: 12px; display: inline-block; }
.mf-back:hover { text-decoration: underline; }

.mf-hero { text-align: center; padding: 34px 20px 30px; background: linear-gradient(165deg,#FFFBF5,#F7F3EB); border: 1.5px solid #B8A082; border-radius: 22px; margin-bottom: 20px; box-shadow: 0 8px 26px rgba(150,115,50,0.10), inset 0 0 0 4px #E5E0D5, inset 0 0 0 5.5px rgba(194,160,89,0.4); }
.mf-hero-badge { display: inline-block; font-size: 11.5px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; color: #6B1E2D; background: rgba(107,30,45,0.08); padding: 5px 14px; border-radius: 99px; margin-bottom: 14px; }
.mf-hero-title { font-family: 'El Messiri','Cairo',serif; font-size: 34px; font-weight: 700; color: #32101A; margin: 0 0 12px; line-height: 1.25; }
.mf-hero-sub { font-size: 14px; color: #6B1E2D; line-height: 1.95; max-width: 620px; margin: 0 auto 22px; }
.mf-hero-btn { background: linear-gradient(180deg,#5B1526,#32101A); color: #B8A082; border: none; padding: 12px 30px; border-radius: 12px; font-family: inherit; font-size: 15px; font-weight: 900; cursor: pointer; letter-spacing: 0.02em; transition: transform .15s; box-shadow: 0 6px 18px rgba(0,0,0,0.15); }
.mf-hero-btn:hover { transform: translateY(-2px); }
.mf-hero-ghost { display: inline-block; padding: 12px 24px; border-radius: 12px; background: transparent; border: 1.5px solid rgba(184,155,94,0.32); color: #6B1E2D; font-family: inherit; font-size: 14px; font-weight: 800; text-decoration: none; }

.mf-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 780px) { .mf-cols { grid-template-columns: 1fr; } }
.mf-panel { background: #FFFBF5; border: 1px solid rgba(184,155,94,0.28); border-radius: 16px; padding: 20px; }
.mf-panel-h { font-size: 15px; font-weight: 900; color: #32101A; margin: 0 0 12px; letter-spacing: 0.02em; }

.mf-my { display: flex; flex-direction: column; gap: 12px; align-items: center; }
.mf-my-combined { display: flex; align-items: baseline; gap: 6px; }
.mf-my-combined-num { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 44px; font-weight: 900; color: #6B1E2D; line-height: 1; }
.mf-my-combined-den { font-size: 15px; font-weight: 700; color: #8F765B; }
.mf-my-stages { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; }
.mf-my-stage { text-align: center; background: rgba(184,155,94,0.08); padding: 8px 4px; border-radius: 10px; }
.mf-my-stage-k { display: block; font-size: 11px; font-weight: 800; color: #6B1E2D; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 3px; }
.mf-my-stage strong { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 15px; color: #32101A; }
.mf-my-plays { font-size: 12.5px; color: #796A62; }
.mf-my-plays strong { color: #32101A; font-family: 'JetBrains Mono', ui-monospace, monospace; }

.mf-lb-hint { font-size: 12px; color: #796A62; margin: 0 0 12px; line-height: 1.7; }
.mf-lb-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.mf-lb-row { display: grid; grid-template-columns: 32px 1fr 32px; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 12px; background: rgba(194,160,89,0.06); border: 1px solid rgba(184,155,94,0.22); }
.mf-lb-r1 { background: linear-gradient(165deg,rgba(184,160,130,0.18),rgba(255,255,255,0.5)); border-color: rgba(184,160,130,0.55); }
.mf-lb-r2 { background: linear-gradient(165deg,rgba(174,174,180,0.14),rgba(255,255,255,0.5)); border-color: rgba(174,174,180,0.45); }
.mf-lb-r3 { background: linear-gradient(165deg,rgba(184,115,51,0.14),rgba(255,255,255,0.5)); border-color: rgba(184,115,51,0.45); }
.mf-lb-rank { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 15px; font-weight: 900; color: #6B1E2D; text-align: center; }
.mf-lb-name { font-size: 14px; font-weight: 800; color: #32101A; }
.mf-lb-medal { font-size: 20px; text-align: center; }
.mf-lb-empty { padding: 22px; text-align: center; color: #8C8274; font-weight: 700; font-size: 12.5px; background: rgba(194,160,89,0.04); border: 1px dashed rgba(184,155,94,0.32); border-radius: 12px; }

.mf-res { text-align: center; padding: 40px 24px; background: linear-gradient(165deg,#FFFBF5,#F7F3EB); border: 1.5px solid #B8A082; border-radius: 22px; box-shadow: 0 14px 40px rgba(150,115,50,0.14); }
.mf-res-stage { font-size: 12px; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase; color: #6B1E2D; margin-bottom: 14px; }
.mf-res-ring { width: 160px; height: 160px; border-radius: 50%; margin: 8px auto 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: conic-gradient(#B8A082 calc(var(--pct) * 1%), rgba(194,160,89,0.16) 0); position: relative; }
.mf-res-ring::before { content: ''; position: absolute; inset: 8px; border-radius: 50%; background: #FFFBF5; }
.mf-res-ring-final { width: 200px; height: 200px; }
.mf-res-num { position: relative; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 48px; font-weight: 900; color: #3B2A0E; line-height: 1; }
.mf-res-den { position: relative; font-size: 14px; color: #8F765B; font-weight: 700; margin-top: 2px; }
.mf-res-title { font-family: 'El Messiri','Cairo',serif; font-size: 26px; font-weight: 700; color: #32101A; margin: 0 0 12px; }
.mf-res-stages { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 380px; margin: 0 auto 16px; }
.mf-res-stage-box { background: rgba(184,155,94,0.10); border: 1px solid rgba(184,155,94,0.32); border-radius: 12px; padding: 10px; text-align: center; }
.mf-res-stage-box span { display: block; font-size: 11px; font-weight: 800; color: #6B1E2D; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
.mf-res-stage-box strong { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 17px; color: #32101A; }
.mf-res-msg { font-size: 14.5px; color: #6B1E2D; line-height: 1.85; max-width: 480px; margin: 0 auto 12px; }
.mf-res-note { font-size: 12px; color: #8F765B; font-style: italic; margin: 0 auto 24px; max-width: 400px; }
.mf-res-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.mf-err, .mf-banner { padding: 12px 16px; text-align: center; color: #6B1E2D; font-weight: 700; background: rgba(139,26,26,0.06); border: 1px solid rgba(139,26,26,0.32); border-radius: 12px; margin: 10px 0; }
`;
