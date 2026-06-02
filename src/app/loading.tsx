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
          "radial-gradient(ellipse at center, rgba(200,169,106,0.06), transparent 60%), #F6F4EE",
      }}
    >
      <MandalaLoader />
    </div>
  );
}
