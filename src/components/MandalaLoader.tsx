"use client";

import { useEffect, useState } from "react";
import MandalaLoaderMobile from "./MandalaLoaderMobile";

// ─────────────────────────────────────────────────────────────────────
// MandalaLoader — pure-CSS animated loader (no rAF, no React re-renders)
//
// On phones (≤600px) we render the dedicated MandalaLoaderMobile —
// a much lighter loader that doesn't break tight phone layouts.
// On desktop we render the full ornate version below.
// ─────────────────────────────────────────────────────────────────────

const R = (n: number) => Math.round(n * 10000) / 10000;

const STAR_16 = Array.from({ length: 16 }, (_, i) => {
  const a = (i * 22.5 * Math.PI) / 180;
  const r = i % 2 === 0 ? 108 : 72;
  return { x: R(130 + r * Math.sin(a)), y: R(130 - r * Math.cos(a)) };
});

const STAR_8 = Array.from({ length: 8 }, (_, i) => {
  const a = (i * 45 * Math.PI) / 180;
  const r = i % 2 === 0 ? 62 : 38;
  return { x: R(130 + r * Math.sin(a)), y: R(130 - r * Math.cos(a)) };
});

const PETALS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * 30 * Math.PI) / 180;
  return { cx: R(130 + 78 * Math.sin(a)), cy: R(130 - 78 * Math.cos(a)) };
});

const PETALS_INNER = Array.from({ length: 8 }, (_, i) => {
  const a = (i * 45 * Math.PI) / 180;
  return { cx: R(130 + 50 * Math.sin(a)), cy: R(130 - 50 * Math.cos(a)) };
});

const SPOKES = Array.from({ length: 24 }, (_, i) => {
  const a = (i * 15 * Math.PI) / 180;
  return {
    x1: R(130 + 20 * Math.sin(a)), y1: R(130 - 20 * Math.cos(a)),
    x2: R(130 + 108 * Math.sin(a)), y2: R(130 - 108 * Math.cos(a)),
  };
});

const DOT_RING = Array.from({ length: 16 }, (_, i) => {
  const a = (i * 22.5 * Math.PI) / 180;
  return { cx: R(130 + 116 * Math.sin(a)), cy: R(130 - 116 * Math.cos(a)) };
});

const DOT_RING_2 = Array.from({ length: 8 }, (_, i) => {
  const a = ((i * 45 + 22.5) * Math.PI) / 180;
  return { cx: R(130 + 90 * Math.sin(a)), cy: R(130 - 90 * Math.cos(a)) };
});

interface Props {
  label?: string;
  sublabel?: string;
  /** Compact variant for inline use (smaller card, less padding) */
  compact?: boolean;
  /** Drop the card chrome entirely — just the mandala */
  bare?: boolean;
}

export default function MandalaLoader({
  label = "جارٍ التحميل",
  sublabel,
  compact = false,
  bare = false,
}: Props) {
  // ── Mobile branch ──
  // We detect viewport on mount (matchMedia is browser-only, so we start
  // pessimistically as `false` to avoid hydration mismatches and flip it
  // once we know).
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 600px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (isMobile) {
    return <MandalaLoaderMobile label={label} />;
  }

  return (
    <div className={`ml-root${compact ? " ml-root--compact" : ""}${bare ? " ml-root--bare" : ""}`}>
      <div className="ml-glow-bg" aria-hidden="true" />

      <div className="ml-card">
        {!bare && (
          <div className="ml-rule" aria-hidden="true">
            <div className="ml-rule-line" />
            <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
              <path d="M12 1 L22 6 L12 11 L2 6 Z" stroke="#C8A96A" strokeWidth="0.8" fill="rgba(200,169,106,0.12)" />
              <circle cx="12" cy="6" r="1.5" fill="#C8A96A" opacity="0.7" />
            </svg>
            <div className="ml-rule-line" />
          </div>
        )}

        <div className="ml-mandala-wrap">
          <svg viewBox="0 0 260 260" fill="none" style={{ width: "100%", height: "auto", display: "block" }} aria-hidden="true">
            <defs>
              <radialGradient id="mlGoldGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#E5B93C" stopOpacity="0.15" />
                <stop offset="60%" stopColor="#C8A96A" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#C8A96A" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="mlCenterGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#E5B93C" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#C8A96A" stopOpacity="0" />
              </radialGradient>
            </defs>

            <circle cx="130" cy="130" r="125" fill="url(#mlGoldGlow)" />

            {/* Boundary (static) */}
            <circle cx="130" cy="130" r="124" stroke="#C8A96A" strokeWidth="0.3" opacity="0.08" />
            <g className="ml-r1 ml-heavy">
              <circle cx="130" cy="130" r="120" stroke="#C8A96A" strokeWidth="0.4" opacity="0.12" strokeDasharray="2 6" />
            </g>

            {/* Outer dot ring */}
            <g className="ml-r2">
              {DOT_RING.map((d, i) => (
                <circle key={i} cx={d.cx} cy={d.cy} r={i % 4 === 0 ? 2.2 : 1.4} fill="#C8A96A" opacity="0.32" />
              ))}
            </g>

            {/* 16-point star (heavy on mobile) */}
            <g className="ml-rStar ml-heavy">
              <polygon points={STAR_16.map(p => `${p.x},${p.y}`).join(" ")} stroke="#C8A96A" strokeWidth="0.5" fill="none" opacity="0.18" />
            </g>

            {/* Outer rings */}
            <circle cx="130" cy="130" r="108" stroke="#C8A96A" strokeWidth="0.6" opacity="0.15" />
            <g className="ml-r2 ml-heavy">
              <circle cx="130" cy="130" r="100" stroke="#C8A96A" strokeWidth="0.4" strokeDasharray="4 3" opacity="0.1" />
            </g>
            <circle cx="130" cy="130" r="92" stroke="#E5B93C" strokeWidth="0.5" opacity="0.12" />

            {/* 12 petals (heavy) */}
            <g className="ml-rPetals ml-heavy" opacity="0.12">
              {PETALS.map((p, i) => (
                <circle key={i} cx={p.cx} cy={p.cy} r="24" stroke="#C8A96A" strokeWidth="0.5" fill="none" />
              ))}
            </g>

            {/* 24 spokes (heavy) */}
            <g className="ml-rSpokes ml-heavy">
              {SPOKES.map((s, i) => (
                <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                  stroke="#C8A96A" strokeWidth={i % 6 === 0 ? 0.6 : 0.3}
                  opacity={i % 6 === 0 ? 0.2 : 0.08} />
              ))}
            </g>

            {/* Mid rings */}
            <g className="ml-r3">
              <circle cx="130" cy="130" r="82" stroke="#C8A96A" strokeWidth="0.5" opacity="0.18" strokeDasharray="3 5" />
            </g>
            <circle cx="130" cy="130" r="74" stroke="#C8A96A" strokeWidth="0.7" opacity="0.2" />
            <g className="ml-r2 ml-heavy">
              <circle cx="130" cy="130" r="66" stroke="#E5B93C" strokeWidth="0.4" strokeDasharray="6 4" opacity="0.14" />
            </g>

            {/* Second dot ring */}
            <g className="ml-r4">
              {DOT_RING_2.map((d, i) => (
                <circle key={i} cx={d.cx} cy={d.cy} r="2" fill="#E5B93C" opacity="0.4" />
              ))}
            </g>

            {/* Inner star */}
            <g className="ml-rStar2">
              <polygon points={STAR_8.map(p => `${p.x},${p.y}`).join(" ")} stroke="#E5B93C" strokeWidth="0.6" fill="rgba(229,185,60,0.03)" opacity="0.28" />
            </g>

            {/* Inner petals */}
            <g className="ml-r5 ml-heavy" opacity="0.14">
              {PETALS_INNER.map((p, i) => (
                <circle key={i} cx={p.cx} cy={p.cy} r="16" stroke="#E5B93C" strokeWidth="0.5" fill="none" />
              ))}
            </g>

            {/* Inner rings */}
            <g className="ml-r3">
              <circle cx="130" cy="130" r="56" stroke="#C8A96A" strokeWidth="0.6" opacity="0.22" strokeDasharray="2 4" />
            </g>
            <circle cx="130" cy="130" r="46" stroke="#C8A96A" strokeWidth="0.8" opacity="0.28" />
            <g className="ml-r4">
              <circle cx="130" cy="130" r="36" stroke="#E5B93C" strokeWidth="0.5" strokeDasharray="4 3" opacity="0.2" />
            </g>
            <circle cx="130" cy="130" r="26" stroke="#C8A96A" strokeWidth="0.6" opacity="0.35" />
            <g className="ml-r5">
              <circle cx="130" cy="130" r="17" stroke="#E5B93C" strokeWidth="0.7" strokeDasharray="3 2" opacity="0.3" />
            </g>

            {/* Pulsing center */}
            <circle cx="130" cy="130" r="14" fill="url(#mlCenterGlow)" />
            <circle className="ml-pulse2" cx="130" cy="130" r="10" stroke="#C8A96A" strokeWidth="0.5" fill="none" />
            <circle className="ml-pulse"  cx="130" cy="130" r="6"  stroke="#E5B93C" strokeWidth="0.8" fill="none" />
            <circle className="ml-pulse"  cx="130" cy="130" r="3.5" fill="#C8A96A" />
            <circle className="ml-pulse-fast" cx="130" cy="130" r="1.5" fill="#E5B93C" />
          </svg>
        </div>

        {!bare && (
          <div className="ml-rule" aria-hidden="true">
            <div className="ml-rule-line" />
            <svg width="32" height="10" viewBox="0 0 32 10" fill="none">
              <line x1="0" y1="5" x2="10" y2="5" stroke="#C8A96A" strokeWidth="0.6" opacity="0.4" />
              <circle cx="16" cy="5" r="2" stroke="#C8A96A" strokeWidth="0.8" fill="none" opacity="0.5" />
              <circle cx="16" cy="5" r="0.8" fill="#C8A96A" opacity="0.6" />
              <line x1="22" y1="5" x2="32" y2="5" stroke="#C8A96A" strokeWidth="0.6" opacity="0.4" />
            </svg>
            <div className="ml-rule-line" />
          </div>
        )}

        {(label || sublabel) && (
          <div className="ml-label-wrap">
            {label && <span className="ml-label">{label}</span>}
            {sublabel && <span className="ml-sublabel">{sublabel}</span>}
          </div>
        )}

        <div className="ml-dots-row" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="ml-dot" style={{ animationDelay: `${i * 140}ms` }} />
          ))}
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Pure-CSS animation. SVG renders once; rotations are GPU-driven.
   On mobile (≤500px), `.ml-heavy` layers are removed for performance.
─────────────────────────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

  @keyframes ml-fadein  { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
  @keyframes ml-rotR    { to { transform: rotate(360deg); } }
  @keyframes ml-rotL    { to { transform: rotate(-360deg); } }
  @keyframes ml-pulse   { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
  @keyframes ml-pulse2  { 0%,100% { opacity: 0.30; } 50% { opacity: 0.55; } }
  @keyframes ml-pulseF  { 0%,100% { opacity: 0.8; transform: scale(0.92); } 50% { opacity: 1; transform: scale(1.08); } }
  @keyframes ml-dot     { 0%,80%,100% { opacity: 0.15; transform: scaleY(0.4); } 40% { opacity: 1; transform: scaleY(1); } }
  @keyframes ml-bgFloat { 0%,100% { transform: translate(-50%,-50%) scale(1); } 50% { transform: translate(-50%,-50%) scale(1.06); } }

  .ml-root {
    display: flex; align-items: center; justify-content: center;
    min-height: clamp(220px, 50vh, 480px);
    width: 100%; position: relative;
    font-family: 'Cairo', sans-serif; direction: rtl;
    padding: 16px; box-sizing: border-box;
  }
  .ml-root--compact { min-height: 180px; padding: 8px; }
  .ml-root--bare    { min-height: 0; padding: 0; background: transparent; }

  .ml-glow-bg {
    position: absolute; top: 50%; left: 50%;
    width: min(500px, 130vw); height: min(500px, 130vw);
    border-radius: 50%;
    background: radial-gradient(circle,
      rgba(200,169,106,0.07) 0%,
      rgba(229,185,60,0.03) 40%,
      transparent 70%);
    transform: translate(-50%, -50%);
    pointer-events: none;
    animation: ml-bgFloat 4s ease-in-out infinite;
  }
  .ml-root--bare .ml-glow-bg { display: none; }

  .ml-card {
    position: relative;
    display: flex; flex-direction: column; align-items: center;
    padding: clamp(18px, 4vw, 28px) clamp(20px, 6vw, 40px) clamp(22px, 4vw, 32px);
    width: 100%;
    max-width: min(360px, calc(100vw - 32px));
    background: #FFFFFF; border: 1px solid #E2D9CA; border-radius: 16px;
    box-shadow:
      0 2px 0 rgba(200,169,106,0.10),
      0 8px 32px rgba(11,11,12,0.07),
      0 24px 64px rgba(11,11,12,0.04),
      inset 0 1px 0 rgba(255,255,255,0.8);
    animation: ml-fadein 0.4s cubic-bezier(0.22,1,0.36,1) both;
    overflow: hidden;
  }
  .ml-root--compact .ml-card { padding: 14px 20px 16px; max-width: 240px; }
  .ml-root--bare .ml-card    { background: transparent; border: none; box-shadow: none; padding: 0; max-width: 220px; }

  .ml-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg,
      transparent 0%, rgba(200,169,106,0.35) 15%,
      rgba(229,185,60,0.65) 40%, #E5B93C 50%,
      rgba(229,185,60,0.65) 60%, rgba(200,169,106,0.35) 85%,
      transparent 100%);
  }
  .ml-root--bare .ml-card::before { display: none; }

  .ml-rule {
    display: flex; align-items: center; width: 100%;
    margin-bottom: clamp(12px, 3vw, 20px); gap: 10px;
  }
  .ml-rule:last-of-type {
    margin-bottom: 0; margin-top: clamp(12px, 3vw, 20px);
  }
  .ml-rule-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(200,169,106,0.22), transparent); }

  /* Mandala — sized to the card */
  .ml-mandala-wrap {
    position: relative; width: 100%;
    max-width: clamp(140px, 55vw, 220px);
    display: flex; align-items: center; justify-content: center;
    filter: drop-shadow(0 6px 24px rgba(200,169,106,0.10));
  }
  .ml-root--compact .ml-mandala-wrap { max-width: 110px; }
  .ml-root--bare .ml-mandala-wrap    { max-width: 100%; filter: none; }

  /* ─── Layer rotations (pure CSS, GPU-friendly) ───
     transform-origin is the SVG center (130,130 within a 260 viewBox).
     Using transform-box: fill-box ensures Firefox/Safari behave like Chrome. */
  .ml-mandala-wrap svg g[class^='ml-r'],
  .ml-mandala-wrap svg g[class*=' ml-r'] {
    transform-origin: 130px 130px;
    transform-box: fill-box;
  }
  .ml-r1      { animation: ml-rotR 50s linear infinite; }
  .ml-r2      { animation: ml-rotL 38s linear infinite; }
  .ml-rStar   { animation: ml-rotR 80s linear infinite; }
  .ml-r3      { animation: ml-rotR 26s linear infinite; }
  .ml-rPetals { animation: ml-rotR 120s linear infinite; }
  .ml-rSpokes { animation: ml-rotR 180s linear infinite; }
  .ml-r4      { animation: ml-rotL 20s linear infinite; }
  .ml-rStar2  { animation: ml-rotL 32s linear infinite; }
  .ml-r5      { animation: ml-rotR 14s linear infinite; }

  /* Pulsing inner circles */
  .ml-pulse      { animation: ml-pulse  2.6s ease-in-out infinite; transform-origin: 130px 130px; transform-box: fill-box; }
  .ml-pulse2     { animation: ml-pulse2 3.2s ease-in-out infinite; transform-origin: 130px 130px; transform-box: fill-box; }
  .ml-pulse-fast { animation: ml-pulseF 1.4s ease-in-out infinite; transform-origin: 130px 130px; transform-box: fill-box; }

  /* Label */
  .ml-label-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 4px; }
  .ml-label    { font-size: clamp(12px, 3.5vw, 14px); font-weight: 700; color: #4a3f2a; letter-spacing: 0.3px; text-align: center; }
  .ml-sublabel { font-size: clamp(10px, 2.8vw, 11.5px); font-weight: 500; color: #8A7A5A; text-align: center; }

  /* Animated bottom dots */
  .ml-dots-row { display: flex; align-items: center; gap: 4px; margin-top: 12px; height: 16px; }
  .ml-dot      { width: 3px; height: 14px; border-radius: 2px; background: #C8A96A; opacity: 0.2; animation: ml-dot 1.4s ease-in-out infinite; }
  .ml-root--bare .ml-dots-row { display: none; }

  /* ─── MOBILE: strip the heaviest decoration layers ───
     The mandala still looks rich, but we save ~40% of the SVG paint cost
     and avoid jank on low-end Android. */
  @media (max-width: 500px) {
    .ml-heavy { display: none; }
    .ml-mandala-wrap { max-width: 140px; filter: none; }
    .ml-card { box-shadow: 0 2px 0 rgba(200,169,106,0.10), 0 4px 16px rgba(11,11,12,0.05); }
    /* Slow rotations a bit on small screens for smoother frames */
    .ml-r1      { animation-duration: 80s; }
    .ml-r2      { animation-duration: 55s; }
    .ml-r3      { animation-duration: 40s; }
    .ml-r4      { animation-duration: 32s; }
    .ml-r5      { animation-duration: 22s; }
  }

  /* Respect reduced-motion users */
  @media (prefers-reduced-motion: reduce) {
    .ml-r1, .ml-r2, .ml-r3, .ml-r4, .ml-r5,
    .ml-rStar, .ml-rStar2, .ml-rPetals, .ml-rSpokes {
      animation: none;
    }
    .ml-pulse, .ml-pulse2, .ml-pulse-fast, .ml-glow-bg, .ml-dot {
      animation-duration: 6s;
    }
  }
`;
