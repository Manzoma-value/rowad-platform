"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, Radar } from "lucide-react";
import TraitSpectrumPanel from "@/components/TraitSpectrumPanel";
import { useLang } from "@/lib/language-context";
import { seedFromString } from "@/lib/trait-spectrum";

type SpectrumData = {
  student: { id: string; full_name: string };
  assessments_count: number;
  radar: Array<{ trait_id: string; name: string; maqsad: string; average: number }>;
  modules: Array<{
    module_id: string;
    module_title: string;
    stage_title: string;
    total_score: number;
    general_note: string | null;
    teacher_name: string;
    submitted_at: string;
    trait_scores: Array<{ trait_id: string; trait_name: string; maqsad: string; score: number; note: string | null }>;
  }>;
};

const COLORS: Record<string, string> = {
  DEEN: "#8F765B",
  AQL: "#655B53",
  NAFS: "#1B5E20",
  NASL: "#6B1E2D",
  MAL: "#4A0E1C",
};

const COPY = {
  ar: {
    title: "طيف السمات",
    subtitle: "صورة واضحة ومتراكمة لقراءات السمات التي وثّقها المشرفون عبر رحلة التعلم.",
    history: "سجل القراءات",
    reading: "قراءة موثقة",
    by: "بواسطة",
    empty: "لا توجد قراءة طيفية بعد",
    emptySub: "سيظهر الطيف هنا بعد أن يوثّق المشرف أول قراءة للسمات.",
    loading: "جارٍ تحميل الطيف...",
  },
  sq: {
    title: "Spektri i tipareve",
    subtitle: "Pamje e qartë dhe e përmbledhur e leximeve të dokumentuara gjatë rrugëtimit.",
    history: "Historia e leximeve",
    reading: "lexim i dokumentuar",
    by: "Nga",
    empty: "Ende nuk ka lexim të spektrit",
    emptySub: "Spektri do të shfaqet pasi edukatori të dokumentojë leximin e parë.",
    loading: "Duke ngarkuar spektrin...",
  },
} as const;

export default function StudentSpectrumCard({ endpoint, showHistory = true }: { endpoint: string; showHistory?: boolean }) {
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = COPY[L];
  const [data, setData] = useState<SpectrumData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(endpoint, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => { if (active) setData(payload); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint]);

  if (loading) return <div className="ssc-state"><span />{T.loading}<style>{styles}</style></div>;
  if (!data?.radar.length) {
    return <section className="ssc-empty" dir={L === "ar" ? "rtl" : "ltr"}><Radar size={28} /><strong>{T.empty}</strong><p>{T.emptySub}</p><style>{styles}</style></section>;
  }

  return (
    <section className="ssc" dir={L === "ar" ? "rtl" : "ltr"}>
      <header><span><Radar size={18} /></span><div><h2>{T.title}</h2><p>{T.subtitle}</p></div><b>{data.assessments_count} <small>{T.reading}</small></b></header>
      <TraitSpectrumPanel
        traits={data.radar.map((item) => ({ label: item.name, color: COLORS[item.maqsad] ?? "#6B1E2D", pct: item.average }))}
        seed={seedFromString(data.student.id)}
        lang={L}
      />
      {showHistory && data.modules.length > 0 && (
        <div className="ssc-history">
          <h3><ClipboardCheck size={16} />{T.history}</h3>
          <div>{[...data.modules].reverse().map((module) => (
            <article key={`${module.module_id}:${module.submitted_at}`}>
              <div><small>{module.stage_title}</small><strong>{module.module_title}</strong><span>{T.by}: {module.teacher_name}</span></div>
              <b>{module.total_score}<small>/100</small></b>
              {module.general_note && <p>{module.general_note}</p>}
            </article>
          ))}</div>
        </div>
      )}
      <style>{styles}</style>
    </section>
  );
}

const styles = `
.ssc{display:flex;flex-direction:column;gap:14px;font-family:'Cairo',sans-serif}.ssc>header{display:flex;align-items:center;gap:11px;border:1px solid #E5E0D5;border-radius:17px;background:#FFFBF5;padding:14px 16px}.ssc>header>span{display:grid;width:42px;height:42px;flex:none;place-items:center;border-radius:12px;background:#32101A;color:#D9C9B0}.ssc>header>div{min-width:0;flex:1}.ssc>header h2{margin:0;color:#32101A;font-size:16px;font-weight:900}.ssc>header p{margin:3px 0 0;color:#655B53;font-size:10.5px;line-height:1.65;font-weight:700}.ssc>header>b{display:flex;flex-direction:column;align-items:center;border-radius:11px;background:#EFEAE0;padding:7px 11px;color:#6B1E2D;font-size:18px}.ssc>header>b small{color:#796A62;font-size:8px;white-space:nowrap}.ssc-history{border:1px solid #E5E0D5;border-radius:18px;background:#FFFBF5;padding:15px}.ssc-history>h3{display:flex;align-items:center;gap:7px;margin:0 0 11px;color:#32101A;font-size:13px}.ssc-history>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.ssc-history article{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;border:1px solid #E5E0D5;border-radius:13px;background:#F7F3EB;padding:11px}.ssc-history article>div{display:flex;min-width:0;flex-direction:column}.ssc-history article small,.ssc-history article span{color:#796A62;font-size:8.5px}.ssc-history article strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#32101A;font-size:11.5px}.ssc-history article>b{color:#6B1E2D;font-size:15px}.ssc-history article>b small{font-size:8px}.ssc-history article>p{grid-column:1/-1;margin:2px 0 0;border-radius:9px;background:#FFFBF5;padding:8px;color:#655B53;font-size:9.5px;line-height:1.6}.ssc-state,.ssc-empty{display:flex;min-height:190px;align-items:center;justify-content:center;border:1px solid #E5E0D5;border-radius:18px;background:#FFFBF5;color:#796A62;font:700 11px 'Cairo',sans-serif}.ssc-state{gap:8px}.ssc-state span{width:18px;height:18px;border:2px solid #D9C9B0;border-top-color:#6B1E2D;border-radius:50%;animation:ssc-spin .7s linear infinite}.ssc-empty{flex-direction:column;gap:7px;text-align:center}.ssc-empty svg{color:#6B1E2D}.ssc-empty strong{color:#32101A;font-size:13px}.ssc-empty p{max-width:390px;margin:0;padding:0 18px;font-size:10px;line-height:1.7}@keyframes ssc-spin{to{transform:rotate(360deg)}}@media(max-width:680px){.ssc-history>div{grid-template-columns:1fr}.ssc>header{align-items:flex-start}.ssc>header>b{font-size:14px}}
`;
