"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useLang } from "@/lib/language-context";
import { invalidateCache } from "@/lib/api-cache";
import TraitEvalForm from "@/components/TraitEvalForm";

const COPY = {
  ar: { back:"العودة إلى ملف المستفيد", eyebrow:"مساحة تقييم مركّزة", title:"قراءة سمات المستفيد", sub:"وزّع 100 نقطة، راجع الأدلة، ثم اضغط حفظ. لا يوجد حفظ تلقائي." },
  sq: { back:"Kthehu te profili i pjesëmarrësit", eyebrow:"Hapësirë e fokusuar vlerësimi", title:"Leximi i tipareve", sub:"Shpërndaj 100 pikë, rishiko provat dhe shtyp Ruaj. Nuk ka ruajtje automatike." },
} as const;

export default function StudentTraitRatingPage() {
  const { id, moduleId } = useParams<{id:string;moduleId:string}>();
  const router = useRouter();
  const { lang } = useLang();
  const L = lang === "ar" ? "ar" : "sq";
  const T = COPY[L];
  const back = `/teacher/reports/students/${id}`;

  return <main className="str-page" dir={L === "ar" ? "rtl" : "ltr"}>
    <Link className="str-back" href={back}><ArrowLeft size={15}/>{T.back}</Link>
    <header className="str-intro"><span><Sparkles size={13}/>{T.eyebrow}</span><h1>{T.title}</h1><p>{T.sub}</p></header>
    <TraitEvalForm
      studentId={id}
      moduleId={moduleId}
      lang={L}
      onClose={()=>router.push(back)}
      onSaved={()=>{
        invalidateCache(`/api/teacher/reports/students/${id}`);
        router.push(`${back}?saved=1`);
      }}
    />
    <style>{`
      .str-page,.str-page *{box-sizing:border-box}.str-page{max-width:1160px;margin:0 auto;padding:18px 24px 70px;color:#32101A;font-family:'Cairo',sans-serif}.str-back{display:inline-flex;align-items:center;gap:7px;margin-bottom:13px;color:#6B1E2D;font-size:12px;font-weight:900;text-decoration:none}.str-page[dir=rtl] .str-back svg{transform:scaleX(-1)}.str-intro{margin-bottom:12px}.str-intro>span{display:flex;align-items:center;gap:6px;color:#8F765B;font-size:9.5px;font-weight:900;letter-spacing:.09em}.str-intro h1{margin:3px 0 2px;font-size:22px}.str-intro p{margin:0;color:#796A62;font-size:10.5px;font-weight:700}@media(max-width:620px){.str-page{padding:13px 10px 55px}.str-intro{padding-inline:5px}}
    `}</style>
  </main>;
}
