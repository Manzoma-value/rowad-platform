"use client";

// Trait Spectrum Blob — the organic "watercolor" color-blend visualization
// used across نماذج القياس (teacher rating live preview + admin results).
// Colors always arrive via the `traits` prop (never a literal string in
// this file), so scripts/check-theme-colors.mjs never flags this component;
// any decorative chrome below uses only the build's approved palette.
//
// mode="full"  — real SVG watercolor filters + geometric frame. Use for a
//                single on-screen instance (the live rating preview, one
//                expanded admin card).
// mode="compact" — no SVG filters, fewer layers, no frame. Cheap enough to
//                  render dozens at once (the admin member grid).

import { useId, useMemo } from "react";
import { computeBlobLayers, blendCmykWeighted, type SpectrumTrait } from "@/lib/trait-spectrum";

export default function TraitSpectrumBlob({
  traits,
  size = 220,
  seed = 1,
  mode = "full",
  showFrame,
  showMixedSwatch = false,
  className,
}: {
  traits: SpectrumTrait[];
  size?: number;
  seed?: number;
  mode?: "full" | "compact";
  showFrame?: boolean;
  showMixedSwatch?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const frame = showFrame ?? mode === "full";
  const layers = useMemo(
    () => computeBlobLayers(traits, seed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(traits.map((t) => [t.color, t.pct])), seed],
  );
  const mixedHex = useMemo(() => (traits.length ? blendCmykWeighted(traits) : "#EFEAE0"), [traits]);

  const clipId = `tsb-clip-${uid}`;
  const filterId = `tsb-filter-${uid}`;
  const vignetteId = `tsb-vgn-${uid}`;

  return (
    <div className={`tsb-wrap ${className ?? ""}`} style={{ width: size }}>
      <svg viewBox="0 0 600 600" width={size} height={size} className="tsb-svg">
        <defs>
          <clipPath id={clipId}>
            <circle cx={300} cy={300} r={238} />
          </clipPath>
          {mode === "full" && (
            <>
              <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%">
                <feTurbulence type="fractalNoise" baseFrequency={0.012} numOctaves={2} seed={seed % 97} result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale={26} xChannelSelector="R" yChannelSelector="G" />
                <feGaussianBlur stdDeviation={7} />
              </filter>
              <radialGradient id={vignetteId} cx="50%" cy="45%" r="65%">
                <stop offset="0%" stopColor="#D9C9B0" stopOpacity={0.14} />
                <stop offset="55%" stopColor="#D9C9B0" stopOpacity={0} />
                <stop offset="100%" stopColor="#1A1A1A" stopOpacity={0.3} />
              </radialGradient>
            </>
          )}
        </defs>

        <circle cx={300} cy={300} r={242} fill="#1A1A1A" />

        <g clipPath={`url(#${clipId})`}>
          {layers.map((layer) => (
            <g key={layer.traitIndex} filter={mode === "full" ? `url(#${filterId})` : undefined}>
              {(mode === "full" ? layer.circles : layer.circles.slice(0, 3)).map((c, i) => (
                <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={layer.color} opacity={c.opacity} />
              ))}
            </g>
          ))}
          {mode === "full" && <circle cx={300} cy={300} r={238} fill={`url(#${vignetteId})`} />}
        </g>

        {frame && (
          <g stroke="#D9C9B0" strokeWidth={1} fill="none" opacity={0.55}>
            {[238, 196, 150, 100].map((r) => (
              <circle key={r} cx={300} cy={300} r={r} opacity={0.5} />
            ))}
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i * 30 * Math.PI) / 180;
              return (
                <line
                  key={i}
                  x1={300 + 40 * Math.cos(a)} y1={300 + 40 * Math.sin(a)}
                  x2={300 + 238 * Math.cos(a)} y2={300 + 238 * Math.sin(a)}
                  opacity={0.3}
                />
              );
            })}
            <polygon
              points={Array.from({ length: 8 })
                .map((_, i) => {
                  const a = (i * 45 * Math.PI) / 180;
                  return `${(300 + 58 * Math.cos(a)).toFixed(1)},${(300 + 58 * Math.sin(a)).toFixed(1)}`;
                })
                .join(" ")}
              opacity={0.6}
            />
            <circle cx={300} cy={300} r={242} strokeWidth={2} opacity={0.8} />
          </g>
        )}
        {frame && <circle cx={300} cy={300} r={6} fill="#D9C9B0" />}
      </svg>

      {showMixedSwatch && (
        <div className="tsb-mixed">
          <span className="tsb-mixed-swatch" style={{ background: mixedHex }} />
          <span className="tsb-mixed-hex">{mixedHex}</span>
        </div>
      )}

      <style>{`
        .tsb-wrap { display: inline-flex; flex-direction: column; align-items: center; gap: 8px; }
        .tsb-svg { display: block; filter: drop-shadow(0 10px 24px rgba(107,30,45,0.16)); }
        .tsb-mixed { display: flex; align-items: center; gap: 8px; }
        .tsb-mixed-swatch { width: 20px; height: 20px; border-radius: 7px; border: 2px solid #FFFBF5; box-shadow: 0 0 0 1px rgba(26,26,26,0.15); display: inline-block; }
        .tsb-mixed-hex { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; font-weight: 700; color: #655B53; letter-spacing: 0.02em; }
      `}</style>
    </div>
  );
}
