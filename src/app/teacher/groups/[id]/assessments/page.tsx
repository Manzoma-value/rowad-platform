"use client";
export const dynamic = "force-dynamic";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CheckCircle2, ClipboardCheck, Clock3, Users } from "lucide-react";
import { useLang } from "@/lib/language-context";
import MandalaLoader from "@/components/MandalaLoader";

type Group = { id: string; name: string; description: string | null; members: unknown[] };
type Assessment = {
  id: string; title: string; status: "OPEN" | "CLOSED"; created_at: string; closed_at: string | null;
  _count?: { ratings: number; traits: number };
};

const COPY = {
  ar: {
    back: "العودة إلى المجموعة", eyebrow: "مساحة القياس", title: "نماذج القياس",
    sub: "ابدأ بالنموذج المفتوح، تابع من أنهيت تقييمهم، وارجع إلى النتائج من مكان واحد واضح.",
    open: "مفتوح الآن", closed: "مغلق", active: "نماذج نشطة", completed: "نماذج مكتملة",
    members: "أعضاء المجموعة", ratings: "قراءة محفوظة", traits: "سمات",
    enter: "فتح مساحة التقييم", view: "عرض النتائج", empty: "لا توجد نماذج قياس لهذه المجموعة بعد.",
    error: "تعذّر تحميل نماذج القياس.",
  },
  sq: {
    back: "Kthehu te grupi", eyebrow: "Hapësira e matjes", title: "Modelet e matjes",
    sub: "Fillo me modelin e hapur, ndiq kë ke vlerësuar dhe kthehu te rezultatet nga një vend i qartë.",
    open: "I hapur tani", closed: "I mbyllur", active: "Modele aktive", completed: "Modele të mbyllura",
    members: "Anëtarë të grupit", ratings: "lexime të ruajtura", traits: "tipare",
    enter: "Hap vlerësimin", view: "Shiko rezultatet", empty: "Nuk ka ende modele matjeje për këtë grup.",
    error: "Modelet e matjes nuk u ngarkuan.",
  },
} as const;

export default function TeacherAssessmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = COPY[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const [group, setGroup] = useState<Group | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/teacher/groups/${id}`, { cache: "no-store" }).then((r) => r.ok ? r.json() : Promise.reject()),
      fetch(`/api/teacher/groups/${id}/assessments`, { cache: "no-store" }).then((r) => r.ok ? r.json() : Promise.reject()),
    ]).then(([groupPayload, assessmentPayload]) => {
      if (!active) return;
      setGroup(groupPayload?.group ?? null);
      setAssessments(Array.isArray(assessmentPayload?.assessments) ? assessmentPayload.assessments : []);
    }).catch(() => active && setError(true)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  const openCount = useMemo(() => assessments.filter((a) => a.status === "OPEN").length, [assessments]);
  const closedCount = assessments.length - openCount;

  if (loading) return <div className="ta-loading"><MandalaLoader /><style>{styles}</style></div>;

  return (
    <main className="ta" dir={dir}>
      <Link href={`/teacher/groups/${id}`} className="ta-back"><ArrowLeft size={16} />{T.back}</Link>
      <header className="ta-hero">
        <div className="ta-hero-copy">
          <span className="ta-eyebrow"><ClipboardCheck size={14} />{T.eyebrow}</span>
          <h1>{T.title}</h1>
          <p>{group?.name} · {T.sub}</p>
        </div>
        <div className="ta-hero-stats">
          <div><strong>{openCount}</strong><span>{T.active}</span></div>
          <div><strong>{closedCount}</strong><span>{T.completed}</span></div>
          <div><strong>{group?.members.length ?? 0}</strong><span>{T.members}</span></div>
        </div>
      </header>

      {error ? <div className="ta-empty">{T.error}</div> : assessments.length === 0 ? (
        <div className="ta-empty"><ClipboardCheck size={34} /><strong>{T.empty}</strong></div>
      ) : (
        <section className="ta-list" aria-label={T.title}>
          {assessments.map((assessment, index) => {
            const isOpen = assessment.status === "OPEN";
            return (
              <Link href={`/teacher/groups/${id}/assessments/${assessment.id}`} className={`ta-card ${isOpen ? "open" : "closed"}`} key={assessment.id}>
                <div className="ta-index">{String(index + 1).padStart(2, "0")}</div>
                <div className="ta-card-body">
                  <div className="ta-card-meta">
                    <span className={`ta-status ${isOpen ? "open" : "closed"}`}>
                      {isOpen ? <Clock3 size={13} /> : <CheckCircle2 size={13} />}{isOpen ? T.open : T.closed}
                    </span>
                    <time>{new Date(assessment.created_at).toLocaleDateString(L === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "sq-AL")}</time>
                  </div>
                  <h2>{assessment.title}</h2>
                  <div className="ta-facts">
                    <span><ClipboardCheck size={14} />{assessment._count?.ratings ?? 0} {T.ratings}</span>
                    <span><Users size={14} />{assessment._count?.traits ?? 0} {T.traits}</span>
                  </div>
                </div>
                <span className="ta-action">{isOpen ? T.enter : T.view}<ArrowUpRight size={17} /></span>
              </Link>
            );
          })}
        </section>
      )}
      <style>{styles}</style>
    </main>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
.ta,.ta-loading{font-family:'Cairo',sans-serif}.ta{max-width:1180px;margin:0 auto;padding:10px 0 60px;color:#32101A}.ta-loading{min-height:55vh;display:grid;place-items:center}.ta-back{display:inline-flex;align-items:center;gap:7px;margin-bottom:14px;color:#6B1E2D;font-size:12px;font-weight:900;text-decoration:none}.ta[dir="rtl"] .ta-back svg{transform:scaleX(-1)}
.ta-hero{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:30px;align-items:end;padding:30px;border-radius:28px;background:radial-gradient(circle at 5% 0,rgba(217,201,176,.20),transparent 36%),linear-gradient(135deg,#32101A,#6B1E2D);box-shadow:0 22px 52px rgba(107,30,45,.18)}.ta-hero:after{content:"";position:absolute;inset:10px;border:1px solid rgba(217,201,176,.14);border-radius:20px;pointer-events:none}.ta-hero-copy,.ta-hero-stats{position:relative;z-index:1}.ta-eyebrow{display:inline-flex;align-items:center;gap:7px;color:#D9C9B0;font-size:11px;font-weight:900;letter-spacing:.06em}.ta-hero h1{margin:8px 0 4px;color:#FFFBF5;font-size:32px;line-height:1.25}.ta-hero p{max-width:720px;margin:0;color:rgba(255,251,245,.72);font-size:13px;line-height:1.85;font-weight:700}.ta-hero-stats{display:grid;grid-template-columns:repeat(3,minmax(92px,1fr));gap:8px}.ta-hero-stats div{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:88px;padding:10px;border:1px solid rgba(217,201,176,.18);border-radius:16px;background:rgba(255,251,245,.07);backdrop-filter:blur(8px)}.ta-hero-stats strong{color:#D9C9B0;font-size:25px}.ta-hero-stats span{color:rgba(255,251,245,.66);font-size:10px;font-weight:800;text-align:center}
.ta-list{display:grid;gap:12px;margin-top:18px}.ta-card{display:grid;grid-template-columns:66px minmax(0,1fr) auto;align-items:center;gap:18px;min-height:150px;padding:18px 20px;border:1px solid rgba(107,30,45,.14);border-radius:22px;background:#FFFBF5;color:inherit;text-decoration:none;box-shadow:0 12px 30px rgba(107,30,45,.055);transition:.18s}.ta-card:hover{transform:translateY(-2px);border-color:rgba(107,30,45,.38);box-shadow:0 18px 38px rgba(107,30,45,.11)}.ta-card.open{box-shadow:inset 4px 0 0 #6B1E2D,0 12px 30px rgba(107,30,45,.055)}.ta[dir="rtl"] .ta-card.open{box-shadow:inset -4px 0 0 #6B1E2D,0 12px 30px rgba(107,30,45,.055)}.ta-index{display:grid;place-items:center;width:56px;height:56px;border-radius:18px;background:#F7F3EB;color:#6B1E2D;font:900 16px ui-monospace,Consolas,monospace}.ta-card-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.ta-status{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;font-size:10px;font-weight:900}.ta-status.open{background:rgba(27,94,32,.1);color:#1B5E20}.ta-status.closed{background:rgba(26,26,26,.07);color:#655B53}.ta-card time{color:#8F765B;font-size:10px;font-weight:800}.ta-card h2{margin:8px 0;color:#32101A;font-size:18px;line-height:1.5}.ta-facts{display:flex;gap:14px;flex-wrap:wrap;color:#796A62;font-size:11px;font-weight:800}.ta-facts span{display:inline-flex;align-items:center;gap:5px}.ta-action{display:inline-flex;align-items:center;gap:8px;padding:11px 14px;border-radius:13px;background:#6B1E2D;color:#fff;font-size:11px;font-weight:900;white-space:nowrap}.ta-card.closed .ta-action{background:#F7F3EB;color:#6B1E2D}.ta-empty{min-height:260px;margin-top:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;border:1px dashed rgba(107,30,45,.3);border-radius:22px;background:#FFFBF5;color:#796A62;text-align:center;padding:30px}
@media(max-width:800px){.ta-hero{grid-template-columns:1fr;align-items:start}.ta-card{grid-template-columns:52px minmax(0,1fr)}.ta-index{width:46px;height:46px}.ta-action{grid-column:1/-1;justify-content:center}.ta-hero-stats{width:100%}}
@media(max-width:520px){.ta{padding-inline:4px}.ta-hero{padding:22px 18px;border-radius:22px}.ta-hero h1{font-size:25px}.ta-hero-stats{grid-template-columns:1fr}.ta-hero-stats div{min-height:64px}.ta-card{grid-template-columns:1fr;padding:16px}.ta-index{display:none}}
`;
