"use client";

// Clean, white trait spectrum shared by the teacher and admin experiences.
// Each trait keeps its own clearly separated petal and outer-ring segment;
// no dark blend is used, so close values remain readable.

import { useId, useMemo } from "react";
import { blendCmykWeighted, type SpectrumTrait } from "@/lib/trait-spectrum";

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
  const frame = showFrame ?? true;
  const mixedHex = useMemo(() => (traits.length ? blendCmykWeighted(traits) : "#EFEAE0"), [traits]);

  const clipId = `tsb-clip-${uid}`;
  const total = Math.max(1, traits.reduce((sum, trait) => sum + Math.max(0, trait.pct), 0));
  const rotation = (seed % 9) - 4;
  const petals = traits.map((trait, index) => {
    const angle = -90 + rotation + (index * 360) / Math.max(1, traits.length);
    const radians = (angle * Math.PI) / 180;
    const strength = Math.max(0, Math.min(100, trait.pct));
    const distance = mode === "compact" ? 128 : 136;
    return {
      ...trait,
      angle,
      cx: 300 + Math.cos(radians) * distance,
      cy: 300 + Math.sin(radians) * distance,
      radius: 64 + strength * 0.62,
    };
  });
  const arcs = traits.map((trait, index) => {
    const preceding = traits
      .slice(0, index)
      .reduce((sum, item) => sum + Math.max(0, item.pct), 0);
    return {
      trait,
      pct: (Math.max(0, trait.pct) / total) * 100,
      offset: (preceding / total) * 100,
    };
  });

  return (
    <div className={`tsb-wrap ${className ?? ""}`} style={{ width: size }}>
      <svg viewBox="0 0 600 600" width={size} height={size} className="tsb-svg">
        <defs>
          <clipPath id={clipId}>
            <circle cx={300} cy={300} r={238} />
          </clipPath>
        </defs>

        <circle cx={300} cy={300} r={246} fill="#FFFFFF" stroke="#D9C9B0" strokeWidth={4} />

        <g clipPath={`url(#${clipId})`}>
          <circle cx={300} cy={300} r={238} fill="#FFFFFF" />
          {frame && (
            <g stroke="#D9C9B0" strokeWidth={1} fill="none" opacity={0.48}>
            {[238, 196, 150, 100].map((r) => (
                <circle key={r} cx={300} cy={300} r={r} />
            ))}
              {petals.map((petal, index) => {
                const a = (petal.angle * Math.PI) / 180;
              return (
                <line
                    key={index}
                  x1={300 + 40 * Math.cos(a)} y1={300 + 40 * Math.sin(a)}
                  x2={300 + 238 * Math.cos(a)} y2={300 + 238 * Math.sin(a)}
                    opacity={0.7}
                />
              );
            })}
            </g>
          )}
          {petals.map((petal, index) => (
            <g key={`${petal.label}-${index}`}>
              <circle
                cx={petal.cx}
                cy={petal.cy}
                r={petal.radius}
                fill={petal.color}
                fillOpacity={0.15}
                stroke={petal.color}
                strokeOpacity={0.82}
                strokeWidth={4}
              />
              <circle
                cx={petal.cx}
                cy={petal.cy}
                r={Math.max(28, petal.radius * 0.62)}
                fill={petal.color}
                fillOpacity={0.16}
              />
            </g>
          ))}
          <circle cx={300} cy={300} r={54} fill="#FFFFFF" stroke="#D9C9B0" strokeWidth={2} />
          <circle cx={300} cy={300} r={8} fill="#6B1E2D" />
        </g>

        <g transform="rotate(-90 300 300)">
          {arcs.map(({ trait, pct, offset }, index) => {
            return (
              <circle
                key={`${trait.label}-${index}`}
                cx={300}
                cy={300}
                r={268}
                pathLength={100}
                fill="none"
                stroke={trait.color}
                strokeWidth={24}
                strokeLinecap="butt"
                strokeDasharray={`${Math.max(0.6, pct)} ${Math.max(0, 100 - pct)}`}
                strokeDashoffset={-offset}
              />
            );
          })}
        </g>
        <circle cx={300} cy={300} r={282} fill="none" stroke="#D9C9B0" strokeWidth={2} />
      </svg>

      {showMixedSwatch && (
        <div className="tsb-mixed">
          <span className="tsb-mixed-swatch" style={{ background: mixedHex }} />
          <span className="tsb-mixed-hex">{mixedHex}</span>
        </div>
      )}

      <style>{`
        .tsb-wrap { display: inline-flex; flex-direction: column; align-items: center; gap: 8px; }
        .tsb-svg { display: block; filter: drop-shadow(0 12px 22px rgba(107,30,45,0.10)); }
        .tsb-mixed { display: flex; align-items: center; gap: 8px; }
        .tsb-mixed-swatch { width: 20px; height: 20px; border-radius: 7px; border: 2px solid #FFFBF5; box-shadow: 0 0 0 1px rgba(26,26,26,0.15); display: inline-block; }
        .tsb-mixed-hex { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; font-weight: 700; color: #655B53; letter-spacing: 0.02em; }
      `}</style>
    </div>
  );
}
