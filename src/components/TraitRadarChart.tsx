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

  return (
    <svg viewBox="0 0 220 220" width={size} height={size} className={`trc-svg ${className ?? ""}`}>
      <g stroke="#B8A082" strokeWidth={1} fill="none" opacity={0.4}>
        {geo.gridRings.map((points, i) => (
          <polygon key={i} points={points} />
        ))}
        {geo.axisLines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
        ))}
      </g>
      <polygon
        points={geo.dataPolygonPoints}
        fill="#6B1E2D" fillOpacity={0.18}
        stroke="#6B1E2D" strokeWidth={2} strokeLinejoin="round"
      />
      {geo.dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4.5} fill={p.color} stroke="#FFFBF5" strokeWidth={1.5} />
      ))}
      <style>{`.trc-svg { display: block; }`}</style>
    </svg>
  );
}
