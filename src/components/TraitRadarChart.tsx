"use client";

// Trait Radar Chart — small pentagon/N-gon chart companion to
// TraitSpectrumBlob. Pure vector polygons, no filters, so it's cheap
// enough for any grid size (admin member cards, live rating preview).
// Axes share the same angle distribution as the blob so both visuals
// point the same way for a given trait.

import { computeRadarGeometry, type SpectrumTrait } from "@/lib/trait-spectrum";

export default function TraitRadarChart({
  traits,
  size = 150,
  className,
}: {
  traits: SpectrumTrait[];
  size?: number;
  className?: string;
}) {
  const geo = computeRadarGeometry(traits);
  const description = traits.map((trait) => `${trait.label}: ${Number(trait.pct.toFixed(1))}%`).join("، ");

  return (
    <svg
      viewBox="0 0 220 220"
      width={size}
      height={size}
      className={`trc-svg ${className ?? ""}`}
      role="img"
      aria-label={description}
    >
      <title>{description}</title>
      <circle cx={110} cy={110} r={106} fill="#FFFBF5" stroke="#8F765B" strokeWidth={2.4} />
      <circle cx={110} cy={110} r={98} fill="none" stroke="#D9C9B0" strokeWidth={1.2} />
      <g stroke="#8F765B" strokeWidth={2} fill="none" opacity={0.68}>
        {geo.gridRings.map((points, i) => (
          <polygon key={i} points={points} />
        ))}
      </g>
      <g stroke="#8F765B" strokeWidth={1.7} opacity={0.62}>
        {geo.axisLines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
        ))}
      </g>
      {geo.axisLines.map((line, index) => (
        <circle
          key={`axis-${index}`}
          cx={line.x2}
          cy={line.y2}
          r={4.5}
          fill={traits[index]?.color ?? "#8F765B"}
          stroke="#FFFBF5"
          strokeWidth={2}
        />
      ))}
      <polygon
        points={geo.dataPolygonPoints}
        fill="#6B1E2D" fillOpacity={0.16}
        stroke="#6B1E2D" strokeWidth={4} strokeLinejoin="round"
      />
      {geo.dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={7} fill={p.color} stroke="#FFFBF5" strokeWidth={3}>
          <title>{`${p.label}: ${Number(p.pct.toFixed(1))}%`}</title>
        </circle>
      ))}
      <g className="trc-scale" aria-hidden="true">
        <rect x={81} y={196} width={58} height={18} rx={9} fill="#32101A" />
        <text x={110} y={208.5} textAnchor="middle" direction="ltr" unicodeBidi="isolate">{`0–${geo.scaleMax}%`}</text>
      </g>
      <style>{`
        .trc-svg{display:block;overflow:visible;filter:drop-shadow(0 10px 18px rgba(107,30,45,.12))}
        .trc-scale text{fill:#FFFBF5;font:800 9px ui-monospace,Consolas,monospace;letter-spacing:.02em}
      `}</style>
    </svg>
  );
}
