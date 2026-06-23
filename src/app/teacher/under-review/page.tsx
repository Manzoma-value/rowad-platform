"use client";
export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language-context";

const COPY = {
  ar: {
    badge: "تقديم",
    title: "طلبك قيد المراجعة",
    body: "تم استلام طلبك بنجاح. تقوم إدارة المدرسة الآن بمراجعة بياناتك، وسيتم تفعيل حسابك بمجرد الموافقة. شكراً لتفضّلك التقديم لمشروع الرواد.",
  },
  sq: {
    badge: "Aplikim",
    title: "Aplikimi yt po shqyrtohet",
    body: "Aplikimi yt u pranua me sukses. Administrata e shkollës po shqyrton të dhënat tua dhe llogaria do të aktivizohet sapo të miratohet. Faleminderit që aplikove në projektin e Ruvadëve.",
  },
} as const;

export default function UnderReviewPage() {
  const { lang } = useLang();
  const router = useRouter();
  const L = lang === "sq" ? "sq" : "ar";
  const C = COPY[L];

  // Bounce out if the teacher is already active or back to PENDING.
  useEffect(() => {
    let alive = true;
    const tick = () => {
      fetch("/api/teacher", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          const s = d?.onboarding_status;
          if (s === "ACTIVE")              router.replace("/teacher");
          else if (s === "REJECTED")       router.replace("/teacher/rejected");
          else if (s === "PENDING_APPLICATION") router.replace("/teacher/application");
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, [router]);

  return (
    <div dir={L === "ar" ? "rtl" : "ltr"} className="ur-wrap">
      <div className="ur-card">
        <div className="ur-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <span className="ur-badge">{C.badge}</span>
        <h1 className="ur-title">{C.title}</h1>
        <p className="ur-body">{C.body}</p>
        <div className="ur-dots"><span /><span /><span /></div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        .ur-wrap {
          min-height: 78vh; display:flex; align-items:center; justify-content:center;
          padding: 24px; font-family:'Cairo','Tajawal',sans-serif;
          background:
            radial-gradient(ellipse at 50% 10%, #F8F1E0 0%, transparent 55%),
            linear-gradient(160deg,#EFE6D2 0%,#E9DFC7 100%);
        }
        .ur-card {
          max-width: 520px; text-align:center;
          background: linear-gradient(160deg,#F8F1E1,#EFE5CE);
          border: 1.5px solid #C0A063; border-radius: 22px; padding: 50px 42px;
          box-shadow: 0 10px 40px rgba(150,115,50,0.12),
            inset 0 0 0 5px #EFE6D1, inset 0 0 0 6.5px rgba(194,160,89,0.4);
        }
        .ur-icon {
          width: 92px; height: 92px; border-radius: 50%; margin: 0 auto 20px;
          display:flex; align-items:center; justify-content:center;
          background: rgba(194,160,89,0.1); color: #A9863F;
          border: 1.5px solid rgba(194,160,89,0.42);
          box-shadow: 0 4px 18px rgba(150,115,50,0.12);
        }
        .ur-badge {
          display:inline-block; font-size:12px; font-weight:800; color:#A9863F;
          background:rgba(194,160,89,.12); padding:4px 16px; border-radius:99px;
          margin-bottom:14px; letter-spacing:1.6px; text-transform:uppercase;
          border:1px solid rgba(194,160,89,0.3);
        }
        .ur-title { font-size:22px; font-weight:900; color:#3B2F1C; margin:0 0 14px; }
        .ur-body  { font-size:14.5px; color:#7A6440; line-height:1.95; margin:0 0 22px; }
        .ur-dots { display:flex; gap:8px; justify-content:center; }
        .ur-dots span {
          width:8px; height:8px; border-radius:50%; background:#C2A059;
          animation: urp 1.5s ease-in-out infinite;
        }
        .ur-dots span:nth-child(2) { animation-delay:.2s; }
        .ur-dots span:nth-child(3) { animation-delay:.4s; }
        @keyframes urp { 0%,100% { opacity:.25; transform:scale(.75); } 50% { opacity:1; transform:scale(1); } }
      `}</style>
    </div>
  );
}
