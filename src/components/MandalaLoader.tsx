"use client";

import { useEffect, useState, useRef } from "react";

// ── Pre-computed geometry (SSR-safe, no floating point drift) ──────────────
const round = (n: number) => Math.round(n * 10000) / 10000;

// Outer star — 16 points, alternating long/short
const STAR_16 = Array.from({ length: 16 }, (_, i) => {
  const a = (i * 22.5 * Math.PI) / 180;
  const r = i % 2 === 0 ? 108 : 72;
  return { x: round(130 + r * Math.sin(a)), y: round(130 - r * Math.cos(a)) };
});

// Inner star — 8 points
const STAR_8 = Array.from({ length: 8 }, (_, i) => {
  const a = (i * 45 * Math.PI) / 180;
  const r = i % 2 === 0 ? 62 : 38;
  return { x: round(130 + r * Math.sin(a)), y: round(130 - r * Math.cos(a)) };
});

// 12 petal circles
const PETALS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * 30 * Math.PI) / 180;
  return { cx: round(130 + 78 * Math.sin(a)), cy: round(130 - 78 * Math.cos(a)) };
});

// 8 inner petals
const PETALS_INNER = Array.from({ length: 8 }, (_, i) => {
  const a = (i * 45 * Math.PI) / 180;
  return { cx: round(130 + 50 * Math.sin(a)), cy: round(130 - 50 * Math.cos(a)) };
});

// Radial spokes (24)
const SPOKES = Array.from({ length: 24 }, (_, i) => {
  const a = (i * 15 * Math.PI) / 180;
  return {
    x1: round(130 + 20 * Math.sin(a)), y1: round(130 - 20 * Math.cos(a)),
    x2: round(130 + 108 * Math.sin(a)), y2: round(130 - 108 * Math.cos(a)),
  };
});

// Dot ring (16 dots on outer arc)
const DOT_RING = Array.from({ length: 16 }, (_, i) => {
  const a = (i * 22.5 * Math.PI) / 180;
  return { cx: round(130 + 116 * Math.sin(a)), cy: round(130 - 116 * Math.cos(a)) };
});

// Second dot ring (8 dots, midpoint)
const DOT_RING_2 = Array.from({ length: 8 }, (_, i) => {
  const a = ((i * 45 + 22.5) * Math.PI) / 180;
  return { cx: round(130 + 90 * Math.sin(a)), cy: round(130 - 90 * Math.cos(a)) };
});

interface Props {
  label?: string;
  sublabel?: string;
}

export default function MandalaLoader({
  label = "جارٍ التحميل",
  sublabel,
}: Props) {
  const [tick, setTick] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = performance.now();
    const animate = (now: number) => {
      setTick(Math.floor(((now - startRef.current) / 16) % 36000));
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  // Smooth rotation values derived from tick
  const t = tick * 0.5; // degrees base

  // Ring rotations — each at different speed/direction
  const rot1 = `rotate(${(t * 0.35) % 360} 130 130)`;
  const rot2 = `rotate(${(-(t * 0.55)) % 360} 130 130)`;
  const rot3 = `rotate(${(t * 0.9) % 360} 130 130)`;
  const rot4 = `rotate(${(-(t * 1.4)) % 360} 130 130)`;
  const rot5 = `rotate(${(t * 2.1) % 360} 130 130)`;
  const rotStar = `rotate(${(t * 0.2) % 360} 130 130)`;
  const rotStar2 = `rotate(${(-(t * 0.45)) % 360} 130 130)`;
  const rotPetals = `rotate(${(t * 0.15) % 360} 130 130)`;
  const rotSpokes = `rotate(${(t * 0.08) % 360} 130 130)`;

  // Pulsing opacity for center
  const pulse = 0.55 + 0.35 * Math.sin((tick * 0.04 * Math.PI) / 180);
  const pulse2 = 0.3 + 0.2 * Math.sin((tick * 0.07 * Math.PI) / 180);
  const glowPulse = 0.12 + 0.08 * Math.sin((tick * 0.05 * Math.PI) / 180);

  // Dot pulse stagger
  const dotOpacity = (i: number, offset = 0) =>
    0.15 + 0.5 * Math.abs(Math.sin(((tick * 0.06 + i * 23 + offset) * Math.PI) / 180));

  return (
    <div className="ml-root">
      {/* Ambient background glow */}
      <div className="ml-glow-bg" style={{ opacity: glowPulse }} />

      <div className="ml-card">
        {/* Top ornamental rule */}
        <div className="ml-rule">
          <div className="ml-rule-line" />
          <div className="ml-rule-ornament">
            <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
              <path d="M12 1 L22 6 L12 11 L2 6 Z" stroke="#C8A96A" strokeWidth="0.8" fill="rgba(200,169,106,0.12)" />
              <circle cx="12" cy="6" r="1.5" fill="#C8A96A" opacity="0.7" />
            </svg>
          </div>
          <div className="ml-rule-line" />
        </div>

        {/* Main mandala SVG */}
        <div className="ml-mandala-wrap">
          <svg viewBox="0 0 260 260" fill="none" style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#E5B93C" stopOpacity="0.15" />
                <stop offset="60%" stopColor="#C8A96A" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#C8A96A" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#E5B93C" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#C8A96A" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Ambient glow circle */}
            <circle cx="130" cy="130" r="125" fill="url(#goldGlow)" />

            {/* ── Layer 0: Outermost boundary ring ── */}
            <circle cx="130" cy="130" r="124" stroke="#C8A96A" strokeWidth="0.3" opacity="0.08" />
            <circle cx="130" cy="130" r="120" stroke="#C8A96A" strokeWidth="0.4" opacity="0.12"
              strokeDasharray="2 6" transform={rot1} />

            {/* ── Layer 1: Outer dot ring (16 dots) ── */}
            <g transform={rot2}>
              {DOT_RING.map((d, i) => (
                <circle key={i} cx={d.cx} cy={d.cy} r={i % 4 === 0 ? 2.2 : 1.4}
                  fill="#C8A96A" opacity={dotOpacity(i)} />
              ))}
            </g>

            {/* ── Layer 2: 16-point star polygon ── */}
            <g transform={rotStar}>
              <polygon
                points={STAR_16.map(p => `${p.x},${p.y}`).join(" ")}
                stroke="#C8A96A" strokeWidth="0.5" fill="none" opacity="0.18"
              />
            </g>

            {/* ── Layer 3: Outer concentric rings ── */}
            <circle cx="130" cy="130" r="108" stroke="#C8A96A" strokeWidth="0.6" opacity="0.15" />
            <circle cx="130" cy="130" r="100" stroke="#C8A96A" strokeWidth="0.4"
              strokeDasharray="4 3" opacity="0.1" transform={rot2} />
            <circle cx="130" cy="130" r="92" stroke="#E5B93C" strokeWidth="0.5" opacity="0.12" />

            {/* ── Layer 4: 12 outer petals ── */}
            <g transform={rotPetals} opacity="0.12">
              {PETALS.map((p, i) => (
                <circle key={i} cx={p.cx} cy={p.cy} r="24"
                  stroke="#C8A96A" strokeWidth="0.5" fill="none" />
              ))}
            </g>

            {/* ── Layer 5: 24 spokes ── */}
            <g transform={rotSpokes}>
              {SPOKES.map((s, i) => (
                <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                  stroke="#C8A96A" strokeWidth={i % 6 === 0 ? 0.6 : 0.3}
                  opacity={i % 6 === 0 ? 0.2 : 0.08} />
              ))}
            </g>

            {/* ── Layer 6: Mid rings ── */}
            <circle cx="130" cy="130" r="82" stroke="#C8A96A" strokeWidth="0.5" opacity="0.18"
              strokeDasharray="3 5" transform={rot3} />
            <circle cx="130" cy="130" r="74" stroke="#C8A96A" strokeWidth="0.7" opacity="0.2" />
            <circle cx="130" cy="130" r="66" stroke="#E5B93C" strokeWidth="0.4"
              strokeDasharray="6 4" opacity="0.14" transform={rot2} />

            {/* ── Layer 7: Second dot ring ── */}
            <g transform={rot4}>
              {DOT_RING_2.map((d, i) => (
                <circle key={i} cx={d.cx} cy={d.cy} r="2"
                  fill="#E5B93C" opacity={dotOpacity(i, 90)} />
              ))}
            </g>

            {/* ── Layer 8: 8-point inner star ── */}
            <g transform={rotStar2}>
              <polygon
                points={STAR_8.map(p => `${p.x},${p.y}`).join(" ")}
                stroke="#E5B93C" strokeWidth="0.6" fill="rgba(229,185,60,0.03)" opacity="0.28"
              />
            </g>

            {/* ── Layer 9: 8 inner petals ── */}
            <g transform={rot5} opacity="0.14">
              {PETALS_INNER.map((p, i) => (
                <circle key={i} cx={p.cx} cy={p.cy} r="16"
                  stroke="#E5B93C" strokeWidth="0.5" fill="none" />
              ))}
            </g>

            {/* ── Layer 10: Inner rings ── */}
            <circle cx="130" cy="130" r="56" stroke="#C8A96A" strokeWidth="0.6" opacity="0.22"
              strokeDasharray="2 4" transform={rot3} />
            <circle cx="130" cy="130" r="46" stroke="#C8A96A" strokeWidth="0.8" opacity="0.28" />
            <circle cx="130" cy="130" r="36" stroke="#E5B93C" strokeWidth="0.5"
              strokeDasharray="4 3" opacity="0.2" transform={rot4} />
            <circle cx="130" cy="130" r="26" stroke="#C8A96A" strokeWidth="0.6" opacity="0.35" />
            <circle cx="130" cy="130" r="17" stroke="#E5B93C" strokeWidth="0.7"
              strokeDasharray="3 2" opacity="0.3" transform={rot5} />

            {/* ── Center focal point ── */}
            <circle cx="130" cy="130" r="14" fill="url(#centerGlow)" />
            <circle cx="130" cy="130" r="10" stroke="#C8A96A" strokeWidth="0.5"
              opacity={pulse2} fill="none" />
            <circle cx="130" cy="130" r="6" stroke="#E5B93C" strokeWidth="0.8"
              opacity={pulse * 0.7} fill="none" />
            <circle cx="130" cy="130" r="3.5" fill="#C8A96A" opacity={pulse} />
            <circle cx="130" cy="130" r="1.5" fill="#E5B93C" opacity={pulse * 1.2 > 1 ? 1 : pulse * 1.2} />
          </svg>
        </div>

        {/* Bottom ornamental rule */}
        <div className="ml-rule">
          <div className="ml-rule-line" />
          <div className="ml-rule-ornament">
            <svg width="32" height="10" viewBox="0 0 32 10" fill="none">
              <line x1="0" y1="5" x2="10" y2="5" stroke="#C8A96A" strokeWidth="0.6" opacity="0.4"/>
              <circle cx="16" cy="5" r="2" stroke="#C8A96A" strokeWidth="0.8" fill="none" opacity="0.5"/>
              <circle cx="16" cy="5" r="0.8" fill="#C8A96A" opacity="0.6"/>
              <line x1="22" y1="5" x2="32" y2="5" stroke="#C8A96A" strokeWidth="0.6" opacity="0.4"/>
            </svg>
          </div>
          <div className="ml-rule-line" />
        </div>

        {/* Label */}
        <div className="ml-label-wrap">
          <span className="ml-label">{label}</span>
          {sublabel && <span className="ml-sublabel">{sublabel}</span>}
        </div>

        {/* Animated dots */}
        <div className="ml-dots-row">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="ml-dot" style={{ animationDelay: `${i * 140}ms` }} />
          ))}
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

  @keyframes mlFadeIn {
    from { opacity: 0; transform: scale(0.96) translateY(6px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes mlDot {
    0%, 80%, 100% { opacity: 0.15; transform: scaleY(0.4); }
    40%           { opacity: 1;    transform: scaleY(1); }
  }
  @keyframes mlBgFloat {
    0%, 100% { transform: translate(-50%, -50%) scale(1);    }
    50%      { transform: translate(-50%, -50%) scale(1.05); }
  }

  .ml-root {
    display: flex;
    align-items: center;
    justify-content: center;
    /* responsive height — never shorter than content, never taller than viewport */
    min-height: clamp(260px, 50vh, 480px);
    width: 100%;
    position: relative;
    font-family: 'Cairo', sans-serif;
    direction: rtl;
    padding: 16px;
    box-sizing: border-box;
  }

  /* Ambient background glow */
  .ml-glow-bg {
    position: absolute;
    top: 50%; left: 50%;
    width: min(500px, 140vw);
    height: min(500px, 140vw);
    border-radius: 50%;
    background: radial-gradient(circle,
      rgba(200,169,106,0.07) 0%,
      rgba(229,185,60,0.03) 40%,
      transparent 70%
    );
    transform: translate(-50%, -50%);
    pointer-events: none;
    animation: mlBgFloat 4s ease-in-out infinite;
  }

  /* Card */
  .ml-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    /* responsive padding: tighter on mobile, roomier on desktop */
    padding: clamp(18px, 4vw, 28px) clamp(20px, 6vw, 40px) clamp(22px, 4vw, 32px);
    width: 100%;
    /* never wider than viewport minus 32px gutters */
    max-width: min(360px, calc(100vw - 32px));
    background: #FFFFFF;
    border: 1px solid #E2D9CA;
    border-radius: 16px;
    box-shadow:
      0 2px 0 rgba(200,169,106,0.10),
      0 8px 32px rgba(11,11,12,0.07),
      0 24px 64px rgba(11,11,12,0.04),
      inset 0 1px 0 rgba(255,255,255,0.8);
    animation: mlFadeIn 0.45s cubic-bezier(0.22,1,0.36,1) both;
    overflow: hidden;
  }

  /* Gold top accent */
  .ml-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(200,169,106,0.35) 15%,
      rgba(229,185,60,0.65) 40%,
      #E5B93C 50%,
      rgba(229,185,60,0.65) 60%,
      rgba(200,169,106,0.35) 85%,
      transparent 100%
    );
  }

  /* Bottom subtle line */
  .ml-card::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg,
      transparent,
      rgba(200,169,106,0.12) 30%,
      rgba(200,169,106,0.12) 70%,
      transparent
    );
  }

  /* Ornamental rule */
  .ml-rule {
    display: flex;
    align-items: center;
    width: 100%;
    margin-bottom: clamp(12px, 3vw, 20px);
  }
  .ml-rule:last-of-type {
    margin-bottom: 0;
    margin-top: clamp(12px, 3vw, 20px);
  }
  .ml-rule-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(200,169,106,0.22), transparent);
  }
  .ml-rule-ornament {
    flex-shrink: 0;
    padding: 0 10px;
    display: flex;
    align-items: center;
  }

  /* Mandala wrapper — responsive size, never overflows card */
  .ml-mandala-wrap {
    position: relative;
    width: 100%;
    /* clamp: 140px on small phone → 220px on desktop */
    max-width: clamp(140px, 55vw, 220px);
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 6px 24px rgba(200,169,106,0.10));
  }

  /* Label */
  .ml-label-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
  }
  .ml-label {
    font-size: clamp(12px, 3.5vw, 14px);
    font-weight: 700;
    color: #4a3f2a;
    letter-spacing: 0.3px;
    text-align: center;
  }
  .ml-sublabel {
    font-size: clamp(10px, 2.8vw, 11.5px);
    font-weight: 500;
    color: #8A7A5A;
    text-align: center;
  }

  /* Animated dots */
  .ml-dots-row {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 12px;
    height: 16px;
  }
  .ml-dot {
    width: 3px;
    height: 14px;
    border-radius: 2px;
    background: #C8A96A;
    opacity: 0.2;
    animation: mlDot 1.4s ease-in-out infinite;
  }
`;