"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/language-context";

const S = {
  ar: {
    title: "تم تعطيل حسابك",
    message: "قام المسؤول بتعطيل حسابك. لم يعد بإمكانك الوصول إلى المنصة.",
    contact: "إذا كنت تعتقد أن هذا خطأ، تواصل مع إدارة مدرستك.",
    logout: "تسجيل الخروج",
  },
  sq: {
    title: "Llogaria juaj u çaktivizua",
    message: "Administratori ka çaktivizuar lllogarinë tuaj. Nuk keni më akses në platformë.",
    contact: "Nëse mendoni se kjo është gabim, kontaktoni administratën e shkollës suaj.",
    logout: "Dil nga llogaria",
  },
} as const;

export default function DeactivatedPage() {
  const { lang } = useLang();
  const T = S[lang === "sq" ? "sq" : "ar"];
  const dir = lang === "sq" ? "ltr" : "rtl";
  const [loggingOut, setLoggingOut] = useState(false);

  // Prevent back-navigation from bypassing this page
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const block = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", block);
    return () => window.removeEventListener("popstate", block);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="da-shell" dir={dir}>
      <div className="da-card">
        {/* Shield icon */}
        <div className="da-icon-wrap">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7A1E1E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="4.5" y1="4.5" x2="19.5" y2="19.5" />
          </svg>
        </div>

        <h1 className="da-title">{T.title}</h1>
        <p className="da-msg">{T.message}</p>
        <p className="da-contact">{T.contact}</p>

        <div className="da-rule">
          <div className="da-rule-line" />
          <div className="da-rule-diamond" />
          <div className="da-rule-line" />
        </div>

        <button className="da-btn" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? <span className="da-spin" /> : null}
          {T.logout}
        </button>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes da-spin-kf{to{transform:rotate(360deg)}}

.da-shell{
  min-height:100vh;display:flex;align-items:center;justify-content:center;
  background:#F6F4EE;font-family:'Cairo',sans-serif;padding:24px;
}

.da-card{
  background:#FFFDF8;border:1px solid rgba(122,30,30,0.12);border-radius:22px;
  padding:48px 40px;max-width:440px;width:100%;text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:16px;
  box-shadow:0 8px 40px rgba(8,11,12,0.07);
  animation:fadeUp 0.4s ease both;
}

.da-icon-wrap{
  width:88px;height:88px;border-radius:50%;
  background:rgba(122,30,30,0.06);border:1.5px solid rgba(122,30,30,0.14);
  display:flex;align-items:center;justify-content:center;
  margin-bottom:8px;
}

.da-title{
  font-size:24px;font-weight:900;color:#7A1E1E;letter-spacing:-0.3px;
}

.da-msg{
  font-size:15px;color:#3D2E10;line-height:1.75;font-weight:600;
  max-width:340px;
}

.da-contact{
  font-size:13px;color:#9A8A70;line-height:1.7;
  max-width:320px;
}

.da-rule{display:flex;align-items:center;gap:10px;width:100%;max-width:200px;margin:8px 0}
.da-rule-line{flex:1;height:1px;background:rgba(122,30,30,0.1)}
.da-rule-diamond{width:5px;height:5px;background:rgba(122,30,30,0.25);transform:rotate(45deg);flex-shrink:0}

.da-btn{
  display:flex;align-items:center;justify-content:center;gap:8px;
  padding:14px 32px;border-radius:12px;
  background:#7A1E1E;color:#FFFDF8;border:none;
  font-family:'Cairo',sans-serif;font-size:14px;font-weight:800;
  cursor:pointer;transition:all 0.18s;width:100%;max-width:260px;
}
.da-btn:hover:not(:disabled){background:#5C1616;transform:translateY(-1px);box-shadow:0 6px 20px rgba(122,30,30,0.2)}
.da-btn:disabled{opacity:0.5;cursor:not-allowed}

.da-spin{
  display:inline-block;width:14px;height:14px;
  border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;
  border-radius:50%;animation:da-spin-kf 0.65s linear infinite;flex-shrink:0;
}

@media(max-width:480px){
  .da-card{padding:36px 24px;border-radius:18px}
  .da-title{font-size:20px}
  .da-msg{font-size:14px}
  .da-icon-wrap{width:72px;height:72px}
  .da-icon-wrap svg{width:38px;height:38px}
}
`;
