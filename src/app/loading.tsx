// Global Next.js loading UI — shown automatically during any
// suspense / route transition until the target page is ready.
import MandalaLoader from "@/components/MandalaLoader";

export default function GlobalLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse at center, rgba(184,160,130,0.06), transparent 60%), #EFEAE0",
      }}
    >
      <MandalaLoader />
    </div>
  );
}
