/**
 * IdentityStar — the brand's single-icon ornament from the visual identity
 * guide (دليل الهوية البصرية): an 8-point star built from two rotated
 * squares inside a thin circle, with a filled centre. The guide allows it
 * as a bullet, separator, or watermark (~8% opacity), used sparingly —
 * once per composition, and it may be cropped outside the frame.
 *
 * Stroke widths are in viewBox units (100×100): pass a larger strokeWidth
 * for small render sizes so the linework stays visible (e.g. 5 at 12px,
 * 1.4 at 100px+). Gold lines stay thin per the guide.
 */
export default function IdentityStar({
  size = 22,
  color = "#B8A082",
  strokeWidth = 1.4,
  opacity = 1,
  className,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={{ opacity }}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="46" stroke={color} strokeWidth={strokeWidth} opacity="0.7" />
      <rect x="26" y="26" width="48" height="48" stroke={color} strokeWidth={strokeWidth} />
      <rect
        x="26"
        y="26"
        width="48"
        height="48"
        transform="rotate(45 50 50)"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <circle cx="50" cy="50" r="7" fill={color} />
    </svg>
  );
}
