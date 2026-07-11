"use client";

/**
 * MandalaLoaderMobile — phone-optimised loading indicator.
 *
 * Why a separate component:
 *   The full MandalaLoader has ~10 animated SVG layers and a wrapping
 *   card with borders, glows, and ornaments. On small viewports that
 *   visual density (a) cramps the layout, (b) hurts paint perf on
 *   low-end Android, and (c) just looks heavy.
 *
 * This mobile version is intentionally minimal:
 *   - One small SVG (~80px) with 3 rotating gold rings
 *   - A pulsing gold dot at the center
 *   - A short caption
 *   - No card, no borders, no shadows — drops cleanly into any layout
 *   - Pure CSS animations, zero React re-renders
 */

interface Props {
  label?: string;
}

export default function MandalaLoaderMobile({ label = "جارٍ التحميل" }: Props) {
  return (
    <div className="mlm-root">
      <div className="mlm-mandala">
        <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="mlm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#B8A082" />
              <stop offset="100%" stopColor="#B8A082" />
            </linearGradient>
          </defs>

          {/* Outer ring — slow rotation */}
          <g className="mlm-r1">
            <circle cx="50" cy="50" r="42" stroke="url(#mlm-grad)" strokeWidth="1.5" strokeDasharray="6 4" fill="none" opacity="0.55" />
          </g>

          {/* Middle ring — counter-rotates */}
          <g className="mlm-r2">
            <circle cx="50" cy="50" r="30" stroke="#B8A082" strokeWidth="1" fill="none" opacity="0.45" />
            <circle cx="50" cy="8"  r="1.5" fill="#B8A082" />
            <circle cx="50" cy="92" r="1.5" fill="#B8A082" />
            <circle cx="8"  cy="50" r="1.5" fill="#B8A082" />
            <circle cx="92" cy="50" r="1.5" fill="#B8A082" />
          </g>

          {/* Inner ring — fast rotation */}
          <g className="mlm-r3">
            <circle cx="50" cy="50" r="20" stroke="url(#mlm-grad)" strokeWidth="1.2" strokeDasharray="3 3" fill="none" opacity="0.7" />
          </g>

          {/* Pulsing center */}
          <circle className="mlm-pulse-bg" cx="50" cy="50" r="10" fill="rgba(184,160,130,0.18)" />
          <circle className="mlm-pulse" cx="50" cy="50" r="4" fill="url(#mlm-grad)" />
        </svg>
      </div>

      {label && <p className="mlm-label">{label}</p>}

      <style>{css}</style>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700&display=swap');

  @keyframes mlm-rotR  { to { transform: rotate(360deg); } }
  @keyframes mlm-rotL  { to { transform: rotate(-360deg); } }
  @keyframes mlm-pulse { 0%,100% { transform: scale(1);   opacity: 0.95; }
                         50%     { transform: scale(1.4); opacity: 0.5; } }
  @keyframes mlm-pBg   { 0%,100% { transform: scale(1);   opacity: 0.3; }
                         50%     { transform: scale(1.25); opacity: 0.7; } }
  @keyframes mlm-fade  { from { opacity: 0; transform: translateY(6px); }
                         to   { opacity: 1; transform: translateY(0); } }

  .mlm-root {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 24px 16px;
    width: 100%;
    min-height: 160px;
    font-family: 'Cairo', sans-serif;
    direction: rtl;
    animation: mlm-fade 0.3s cubic-bezier(0.22,1,0.36,1) both;
  }

  /* The mandala — sized to feel substantial without dominating */
  .mlm-mandala {
    width: 84px;
    height: 84px;
    position: relative;
    filter: drop-shadow(0 2px 12px rgba(184,160,130,0.20));
  }
  .mlm-mandala svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  /* Layer rotations — pure CSS, GPU-accelerated, zero re-renders */
  .mlm-mandala svg g[class^='mlm-r'] {
    transform-origin: 50px 50px;
    transform-box: fill-box;
  }
  .mlm-r1 { animation: mlm-rotR 8s linear infinite; }
  .mlm-r2 { animation: mlm-rotL 12s linear infinite; }
  .mlm-r3 { animation: mlm-rotR 4s linear infinite; }

  /* Pulsing center */
  .mlm-pulse,
  .mlm-pulse-bg {
    transform-origin: 50px 50px;
    transform-box: fill-box;
  }
  .mlm-pulse    { animation: mlm-pulse 1.4s ease-in-out infinite; }
  .mlm-pulse-bg { animation: mlm-pBg   1.8s ease-in-out infinite; }

  /* Label */
  .mlm-label {
    font-size: 12.5px;
    font-weight: 600;
    color: #6B1E2D;
    letter-spacing: 0.04em;
    text-align: center;
    line-height: 1.4;
    margin: 0;
  }

  /* Respect reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .mlm-r1, .mlm-r2, .mlm-r3 { animation-duration: 30s; }
    .mlm-pulse, .mlm-pulse-bg { animation: none; }
  }
`;
