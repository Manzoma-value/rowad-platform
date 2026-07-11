/**
 * IdentityBackdrop
 * ────────────────
 * A fixed, full-viewport watermark that paints the platform's identity
 * artwork (`/IdentityBG.png` — the burgundy/gold Islamic mandala on a cream
 * field) softly behind every screen.
 *
 * Design intent
 *  • Sits at z-index 0 — above the page background, below all real content
 *    (content wrappers in the layouts use z-index ≥ 10), the sticky topbar
 *    (z 40) and the sidebar (z 50). It therefore never covers anything.
 *  • The artwork's own background is the same cream as the page, so it melts
 *    into the surface; a radial mask fades its edges to nothing so there are
 *    no hard seams on wide screens.
 *  • Low opacity keeps text fully readable — cards have their own opaque
 *    surfaces, and the mandala only whispers through the gaps.
 *
 * Drop `<IdentityBackdrop />` as the FIRST child of a layout shell.
 * Once approved on the admin dashboards it can go into every layout.
 */
export default function IdentityBackdrop() {
  return (
    <div className="identity-backdrop" aria-hidden="true">
      <div className="identity-backdrop__art" />
      <style>{`
        .identity-backdrop {
          position: fixed;
          inset: 0;
          /* Clear the fixed sidebar so the artwork centres in the CONTENT
             area, not the raw viewport. Logical property = it follows the
             sidebar to the other side when the language/direction flips.
             (Both admin shells set dir on the wrapper, so this inherits.) */
          inset-inline-start: 286px;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .identity-backdrop__art {
          /* Keep the artwork at its natural aspect ratio, sized to sit
             comfortably inside the content area on any screen. */
          width: min(86%, 92vmin, 900px);
          aspect-ratio: 715 / 682;
          background-image: url('/IdentityBG.png');
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
          opacity: 0.5;
          /* Soft circular fade — dissolves the image's rectangular edges
             into the page so no border/seam is ever visible. */
          -webkit-mask-image: radial-gradient(
            ellipse 50% 50% at 50% 50%,
            #000 52%,
            transparent 76%
          );
          mask-image: radial-gradient(
            ellipse 50% 50% at 50% 50%,
            #000 52%,
            transparent 76%
          );
        }
        @media (max-width: 767px) {
          /* Sidebar is off-canvas on mobile — use the full viewport. */
          .identity-backdrop {
            inset-inline-start: 0;
          }
          .identity-backdrop__art {
            width: 105vw;
            opacity: 0.45;
          }
        }
      `}</style>
    </div>
  );
}
