"use client";

// A restrained, continuous trait spectrum shared by teacher and admin views.
// Directional color fields softly merge inside a neutral measurement grid,
// keeping the visual analytical rather than decorative.

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
  const blurId = `tsb-blur-${uid}`;
  const rotation = (seed % 9) - 4;
  const polarPoint = (radius: number, angle: number) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: 300 + Math.cos(radians) * radius,
      y: 300 + Math.sin(radians) * radius,
    };
  };
  const sectors = traits.map((trait, index) => {
    const angle = -90 + rotation + (index * 360) / Math.max(1, traits.length);
    const strength = Math.max(0, Math.min(100, trait.pct));
    const radius = Math.min(232, 78 + strength * 3);
    const halfAngle = Math.min(42, 195 / Math.max(1, traits.length));
    const start = polarPoint(radius, angle - halfAngle);
    const end = polarPoint(radius, angle + halfAngle);
    const focus = polarPoint(radius * 0.72, angle);
    return {
      ...trait,
      angle,
      radius,
      focus,
      path: `M 300 300 L ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${radius.toFixed(1)} ${radius.toFixed(1)} 0 0 1 ${end.x.toFixed(1)} ${end.y.toFixed(1)} Z`,
    };
  });

  return (
    <div className={`tsb-wrap ${className ?? ""}`} style={{ width: size }}>
      <svg viewBox="0 0 600 600" width={size} height={size} className="tsb-svg">
        <defs>
          <clipPath id={clipId}>
            <circle cx={300} cy={300} r={238} />
          </clipPath>
          <filter id={blurId} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation={mode === "compact" ? 13 : 19} />
          </filter>
          {sectors.map((sector, index) => (
            <radialGradient
              key={index}
              id={`tsb-field-${uid}-${index}`}
              gradientUnits="userSpaceOnUse"
              cx={sector.focus.x}
              cy={sector.focus.y}
              r={Math.max(105, sector.radius * 0.92)}
            >
              <stop offset="0%" stopColor={sector.color} stopOpacity={0.82} />
              <stop offset="42%" stopColor={sector.color} stopOpacity={0.58} />
              <stop offset="78%" stopColor={sector.color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={sector.color} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>

        <circle cx={300} cy={300} r={247} fill="#FFFFFF" stroke="#B8A082" strokeWidth={3} />

        <g clipPath={`url(#${clipId})`}>
          <circle cx={300} cy={300} r={238} fill="#FFFBF5" />
          <g filter={`url(#${blurId})`}>
            {sectors.map((sector, index) => (
              <path
                key={`${sector.label}-${index}`}
                d={sector.path}
                fill={`url(#tsb-field-${uid}-${index})`}
              />
            ))}
          </g>
          {sectors.map((sector, index) => (
            <path
              key={`definition-${sector.label}-${index}`}
              d={sector.path}
              fill={sector.color}
              fillOpacity={0.055}
            />
          ))}
          {frame && (
            <g stroke="#8F765B" strokeWidth={1} fill="none" opacity={0.3}>
              {[238, 190, 142, 94].map((r) => (
                <circle key={r} cx={300} cy={300} r={r} />
              ))}
              {sectors.map((sector, index) => {
                const endpoint = polarPoint(238, sector.angle);
                return (
                  <line
                    key={index}
                    x1={300}
                    y1={300}
                    x2={endpoint.x}
                    y2={endpoint.y}
                  />
                );
              })}
            </g>
          )}
          <polygon
            points={sectors
              .map((sector) => {
                const point = polarPoint(54, sector.angle);
                return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
              })
              .join(" ")}
            fill="#FFFBF5"
            fillOpacity={0.9}
            stroke="#8F765B"
            strokeOpacity={0.36}
            strokeWidth={1.5}
          />
          <circle cx={300} cy={300} r={7} fill="#B8A082" stroke="#FFFFFF" strokeWidth={2} />
        </g>

        <circle cx={300} cy={300} r={255} fill="none" stroke="#D9C9B0" strokeWidth={1} />
        <circle cx={300} cy={300} r={266} fill="none" stroke="#B8A082" strokeWidth={2} strokeOpacity={0.42} />
      </svg>

      {showMixedSwatch && (
        <div className="tsb-mixed">
          <span className="tsb-mixed-swatch" style={{ background: mixedHex }} />
          <span className="tsb-mixed-hex">{mixedHex}</span>
        </div>
      )}

      <style>{`
        .tsb-wrap { display: inline-flex; flex-direction: column; align-items: center; gap: 8px; }
        .tsb-svg { display: block; filter: drop-shadow(0 14px 24px rgba(107,30,45,0.11)); }
        .tsb-mixed { display: flex; align-items: center; gap: 8px; }
        .tsb-mixed-swatch { width: 20px; height: 20px; border-radius: 7px; border: 2px solid #FFFBF5; box-shadow: 0 0 0 1px rgba(26,26,26,0.15); display: inline-block; }
        .tsb-mixed-hex { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; font-weight: 700; color: #655B53; letter-spacing: 0.02em; }
      `}</style>
    </div>
  );
}
