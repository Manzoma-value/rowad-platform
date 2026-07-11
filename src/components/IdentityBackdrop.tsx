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
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .identity-backdrop__art {
          position: absolute;
          inset: 0;
          background-image: url('/IdentityBG.png');
          background-repeat: no-repeat;
          background-position: center 38%;
          /* Large but bounded so the mandala stays a graceful centrepiece
             rather than pixel-stretching across ultrawide monitors. */
          background-size: min(1150px, 115vmin) auto;
          opacity: 0.16;
          /* Melt the artwork's edges into the page — no visible frame. */
          -webkit-mask-image: radial-gradient(
            ellipse 68% 66% at 50% 40%,
            #000 46%,
            transparent 82%
          );
          mask-image: radial-gradient(
            ellipse 68% 66% at 50% 40%,
            #000 46%,
            transparent 82%
          );
        }
        @media (max-width: 767px) {
          .identity-backdrop__art {
            background-size: 150vw auto;
            background-position: center 30%;
            opacity: 0.12;
          }
        }
      `}</style>
    </div>
  );
}
