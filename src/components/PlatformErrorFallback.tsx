"use client";

import { startTransition, useEffect } from "react";
import Link from "next/link";

type PlatformErrorFallbackProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PlatformErrorFallback({
  error,
  reset,
}: PlatformErrorFallbackProps) {
  useEffect(() => {
    console.error("[platform error boundary]", error);
  }, [error]);

  return (
    <main className="platform-error-page" dir="rtl">
      <section className="platform-error-card" role="alert">
        <span className="platform-error-mark" aria-hidden="true" />
        <p className="platform-error-eyebrow">AL ROWAD PLATFORM</p>
        <h1>تعذر تحميل هذه الصفحة</h1>
        <p className="platform-error-copy">
          حدث خطأ غير متوقع. يمكنك إعادة المحاولة بأمان، ولن تفقد بياناتك.
        </p>
        <p className="platform-error-copy" dir="ltr">
          This page encountered an unexpected error. You can safely retry.
        </p>
        <div className="platform-error-actions">
          <button type="button" onClick={() => startTransition(reset)}>
            إعادة المحاولة · Retry
          </button>
          <Link href="/">العودة للرئيسية · Home</Link>
        </div>
      </section>

      <style>{`
        .platform-error-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background:
            radial-gradient(circle at 12% 8%, rgba(184,160,130,.22), transparent 32%),
            radial-gradient(circle at 88% 92%, rgba(107,30,45,.10), transparent 34%),
            #EFEAE0;
          color: #1A1A1A;
          font-family: Tajawal, sans-serif;
        }
        .platform-error-card {
          width: min(100%, 620px);
          padding: clamp(28px, 6vw, 52px);
          border: 1px solid rgba(184,160,130,.38);
          border-radius: 28px;
          background: rgba(255,251,245,.94);
          box-shadow: 0 24px 70px rgba(107,30,45,.12);
          text-align: center;
        }
        .platform-error-mark {
          display: block;
          width: 44px;
          height: 4px;
          margin: 0 auto 18px;
          border-radius: 99px;
          background: linear-gradient(90deg,#4A0E1C,#B8A082);
        }
        .platform-error-eyebrow {
          margin: 0 0 10px;
          color: #8F765B;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .2em;
        }
        .platform-error-card h1 {
          margin: 0 0 12px;
          color: #4A0E1C;
          font-size: clamp(24px, 5vw, 34px);
          font-weight: 900;
        }
        .platform-error-copy {
          margin: 5px 0;
          color: #655B53;
          font-size: 14px;
          line-height: 1.8;
        }
        .platform-error-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-top: 24px;
        }
        .platform-error-actions button,
        .platform-error-actions a {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 18px;
          border-radius: 13px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
        }
        .platform-error-actions button {
          border: 1px solid #4A0E1C;
          background: #4A0E1C;
          color: #D9C9B0;
        }
        .platform-error-actions a {
          border: 1px solid rgba(184,160,130,.48);
          background: #FFFBF5;
          color: #4A0E1C;
        }
      `}</style>
    </main>
  );
}
