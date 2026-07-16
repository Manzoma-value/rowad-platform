"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useLang } from "@/lib/language-context";

export default function TeacherLoadError({ onRetry }: { onRetry: () => void }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  return (
    <section className="teacher-load-error" dir={ar ? "rtl" : "ltr"} role="alert">
      <span className="teacher-load-error__icon"><AlertTriangle size={22} /></span>
      <h2>{ar ? "تعذّر تحميل البيانات" : "Të dhënat nuk u ngarkuan"}</h2>
      <p>{ar ? "تحقق من الاتصال ثم حاول مرة أخرى. لن تفقد أي بيانات." : "Kontrolloni lidhjen dhe provoni përsëri. Asnjë e dhënë nuk do të humbasë."}</p>
      <button type="button" onClick={onRetry}>
        <RefreshCw size={15} />
        {ar ? "إعادة المحاولة" : "Provo përsëri"}
      </button>
      <style>{`
        .teacher-load-error{min-height:360px;margin:20px;padding:36px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:#FFFBF5;border:1px solid #D9C9B0;border-radius:16px;color:#32101A;font-family:'Cairo',sans-serif}
        .teacher-load-error__icon{width:48px;height:48px;display:grid;place-items:center;margin-bottom:14px;border-radius:50%;background:rgba(107,30,45,.09);color:#6B1E2D}
        .teacher-load-error h2{margin:0 0 7px;font-size:19px}.teacher-load-error p{max-width:480px;margin:0;color:#655B53;font-size:13px;line-height:1.8}
        .teacher-load-error button{display:inline-flex;align-items:center;gap:7px;margin-top:20px;padding:10px 18px;border:0;border-radius:9px;background:#6B1E2D;color:#FFFBF5;font:inherit;font-size:12px;font-weight:900;cursor:pointer}
        .teacher-load-error button:hover{background:#4A0E1C}@media(max-width:600px){.teacher-load-error{min-height:300px;margin:10px;padding:26px 18px}}
      `}</style>
    </section>
  );
}
