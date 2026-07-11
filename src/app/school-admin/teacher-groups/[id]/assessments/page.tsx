"use client";
export const dynamic = "force-dynamic";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { useViewOnly } from "@/lib/view-only-context";
import { useConfirm } from "@/lib/confirm-dialog";
import MandalaLoader from "@/components/MandalaLoader";
import {
  TRAITS, ASSESS_UI, derive, averageTuples, pickAssessLang,
  type ScoresTuple,
} from "@/lib/rowad-assessment";

type AssessmentRow = {
  id: string;
  title: string;
  status: "OPEN" | "CLOSED";
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  _count: { ratings: number };
};

type Member = { teacher_id: string; profile: { id: string; full_name: string; email: string | null } };
type RatingRow = {
  rater_teacher_id: string; target_teacher_id: string;
  s_lineage: number; s_atonement: number; s_awareness: number; s_zeal: number; s_distinct: number;
  updated_at: string;
};
type AssessmentFull = {
  id: string;
  title: string;
  status: "OPEN" | "CLOSED";
  group: { id: string; name: string };
  members: Member[];
  ratings: RatingRow[];
};

const UI = {
  ar: {
    back: "← العودة للمجموعة",
    title: "نماذج القياس",
    sub: "تتبَّع كل التقييمات داخل هذه المجموعة. أنشئ تقييماً جديداً، أو افتح أحدها لرؤية المصفوفة الكاملة.",
    create: "+ تقييم جديد",
    creating: "جارٍ الإنشاء…",
    listEmpty: "لا توجد تقييمات بعد لهذه المجموعة.",
    open: "افتح",
    statusOPEN: "مفتوح",
    statusCLOSED: "مغلق",
    ratingsCount: "تقييمات",
    newDlgTitle: "أنشئ تقييماً جديداً",
    titleLbl: "عنوان التقييم",
    titlePh: "مثال: نموذج قياس السمات (المرحلة الأولى) — مارس 2026",
    cancel: "إلغاء",
    submit: "إنشاء",
    matrixOf: (n: number, m: number) => `${n} مُقَيِّم × ${m} هدف`,
    raterCol: "المقَيِّم",
    targetCol: "الهدف",
    avgRow: "المتوسط",
    closeBtn: "إغلاق التقييم",
    reopenBtn: "إعادة فتح",
    deleteBtn: "حذف",
    confirmClose: "إغلاق هذا التقييم سيمنع المعلمين من تعديل تقييماتهم. متابعة؟",
    confirmReopen: "إعادة فتح هذا التقييم تسمح بالتعديل من جديد. متابعة؟",
    confirmDelete: "حذف هذا التقييم نهائيًا مع كل البيانات؟",
    matrixHead: "المصفوفة الكاملة",
    matrixSub: "كل خانة تعرض الدرجات الخمس (نسل · كفارات · دراية · حمية · تمييز) التي أعطاها المقَيِّم للهدف.",
    aggHead: "نتائج كل مشرف",
    aggSub: "السمة الجوهرية والجماعية والمساندة لكل مشرف، مبنيّة على متوسط كل التقييمات التي تلقّاها.",
    filterMember: "فلتر المشارك",
    filterAll: "الكل",
    perTraitHead: "متوسط كل سمة لكل مشرف",
    print: "طباعة / PDF",
    noRating: "—",
  },
  sq: {
    back: "← Kthehu te grupi",
    title: "Modelet e Matjes",
    sub: "Ndiq të gjitha vlerësimet brenda këtij grupi. Krijo një të ri, ose hap një për të parë matricën e plotë.",
    create: "+ Vlerësim i ri",
    creating: "Po krijohet…",
    listEmpty: "Nuk ka vlerësime ende.",
    open: "Hap",
    statusOPEN: "I hapur",
    statusCLOSED: "I mbyllur",
    ratingsCount: "vlerësime",
    newDlgTitle: "Krijo një vlerësim të ri",
    titleLbl: "Titulli",
    titlePh: "Shembull: Modeli i Matjes së Tipareve (Faza 1) — Mars 2026",
    cancel: "Anulo",
    submit: "Krijo",
    matrixOf: (n: number, m: number) => `${n} vlerësues × ${m} synim`,
    raterCol: "Vlerësuesi",
    targetCol: "Synimi",
    avgRow: "Mesatarja",
    closeBtn: "Mbyll vlerësimin",
    reopenBtn: "Rihap",
    deleteBtn: "Fshi",
    confirmClose: "Mbyllja do parandalojë mësuesit të redaktojnë. Të vazhdohet?",
    confirmReopen: "Rihapja do lejojë redaktimin sërish. Të vazhdohet?",
    confirmDelete: "Të fshihet ky vlerësim përfundimisht me të gjitha të dhënat?",
    matrixHead: "Matrica e Plotë",
    matrixSub: "Çdo qelizë tregon pesë pikët (Pasardhësia · Shlyerja · Vetëdija · Zelli · Dallimi).",
    aggHead: "Rezultatet për Secilin Anëtar",
    aggSub: "Tipari thelbësor, kolektiv dhe mbështetës për secilin, bazuar në mesataren e të gjitha vlerësimeve të marra.",
    filterMember: "Filtro sipas anëtarit",
    filterAll: "Të gjithë",
    perTraitHead: "Mesatarja për secilin tipar për secilin anëtar",
    print: "Printo / PDF",
    noRating: "—",
  },
} as const;

export default function AdminAssessmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const L = pickAssessLang(lang);
  const T = UI[L];
  const AT = ASSESS_UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const viewOnly = useViewOnly();
  const confirm = useConfirm();

  const [list, setList] = useState<AssessmentRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AssessmentFull | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [dlg, setDlg] = useState(false);
  const [form, setForm] = useState({ title: "" });
  const [creating, setCreating] = useState(false);

  // filters
  const [memberFilter, setMemberFilter] = useState<string>("");

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await fetch(`/api/school-admin/teacher-groups/${id}/assessments`, { cache: "no-store" });
      const d = await r.json();
      setList(d?.assessments ?? []);
    } finally { setLoadingList(false); }
  }, [id]);

  const loadDetail = useCallback(async (aid: string) => {
    setLoadingDetail(true);
    try {
      const r = await fetch(`/api/school-admin/teacher-groups/${id}/assessments/${aid}`, { cache: "no-store" });
      if (!r.ok) { setDetail(null); return; }
      const d = await r.json();
      setDetail(d?.assessment ?? null);
    } finally { setLoadingDetail(false); }
  }, [id]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { if (selectedId) loadDetail(selectedId); }, [selectedId, loadDetail]);

  async function createAssessment() {
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const r = await fetch(`/api/school-admin/teacher-groups/${id}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) return;
      const d = await r.json();
      setDlg(false);
      setForm({ title: "" });
      await loadList();
      setSelectedId(d?.assessment?.id ?? null);
    } finally { setCreating(false); }
  }

  async function closeOrReopen(open: boolean) {
    if (!selectedId) return;
    const ok = await confirm({
      title: open ? T.reopenBtn : T.closeBtn,
      message: open ? T.confirmReopen : T.confirmClose,
      confirmText: open ? T.reopenBtn : T.closeBtn,
      cancelText: T.cancel,
      variant: "normal",
    });
    if (!ok) return;
    await fetch(`/api/school-admin/teacher-groups/${id}/assessments/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: open ? "OPEN" : "CLOSED" }),
    });
    await loadList();
    await loadDetail(selectedId);
  }

  async function deleteAssessment() {
    if (!selectedId) return;
    const ok = await confirm({
      title: T.deleteBtn, message: T.confirmDelete,
      confirmText: T.deleteBtn, cancelText: T.cancel, variant: "danger",
    });
    if (!ok) return;
    await fetch(`/api/school-admin/teacher-groups/${id}/assessments/${selectedId}`, { method: "DELETE" });
    setSelectedId(null);
    setDetail(null);
    loadList();
  }

  // ── Aggregation derived from the ratings rows.
  const aggregation = useMemo(() => {
    if (!detail) return null;
    const byTarget = new Map<string, ScoresTuple[]>();
    for (const r of detail.ratings) {
      const arr = byTarget.get(r.target_teacher_id) ?? [];
      arr.push([r.s_lineage, r.s_atonement, r.s_awareness, r.s_zeal, r.s_distinct]);
      byTarget.set(r.target_teacher_id, arr);
    }
    return detail.members.map((m) => {
      const tuples = byTarget.get(m.teacher_id) ?? [];
      const avg = averageTuples(tuples);
      const d = avg ? derive(avg) : null;
      return { member: m, count: tuples.length, avg, derive: d };
    });
  }, [detail]);

  const filteredMembers = useMemo(() => {
    if (!detail) return [];
    if (!memberFilter) return detail.members;
    return detail.members.filter((m) => m.teacher_id === memberFilter);
  }, [detail, memberFilter]);

  const ratingFor = (raterId: string, targetId: string) =>
    detail?.ratings.find((r) => r.rater_teacher_id === raterId && r.target_teacher_id === targetId);

  return (
    <div className="aa" dir={dir}>
      <Link href={`/school-admin/teacher-groups`} className="aa-back">{T.back}</Link>

      <header className="aa-hero">
        <div>
          <h1 className="aa-title">{T.title}</h1>
          <p className="aa-sub">{T.sub}</p>
        </div>
        {!viewOnly && (
          <button className="aa-new" onClick={() => setDlg(true)} data-write="true">{T.create}</button>
        )}
      </header>

      <div className="aa-layout">
        <aside className="aa-side">
          {loadingList ? <MandalaLoader /> : list.length === 0 ? (
            <div className="aa-empty">{T.listEmpty}</div>
          ) : (
            <ul className="aa-list">
              {list.map((a) => (
                <li key={a.id}>
                  <button
                    className={`aa-list-item ${selectedId === a.id ? "active" : ""}`}
                    onClick={() => setSelectedId(a.id)}
                  >
                    <div className="aa-list-top">
                      <span className={`aa-tag aa-tag-${a.status}`}>
                        {a.status === "OPEN" ? T.statusOPEN : T.statusCLOSED}
                      </span>
                      <span className="aa-list-count">{a._count.ratings} {T.ratingsCount}</span>
                    </div>
                    <div className="aa-list-title">{a.title}</div>
                    <div className="aa-list-date">{new Date(a.created_at).toLocaleDateString(L === "ar" ? "ar-SA-u-nu-latn" : "sq-AL")}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="aa-detail">
          {!selectedId ? (
            <div className="aa-detail-empty">—</div>
          ) : loadingDetail || !detail ? <MandalaLoader /> : (
            <>
              <header className="aa-detail-head no-print">
                <div className="aa-detail-text">
                  <h2 className="aa-detail-title">{detail.title}</h2>
                  <span className="aa-detail-meta">{T.matrixOf(detail.members.length, detail.members.length)}</span>
                </div>
                <div className="aa-detail-actions">
                  <button className="aa-btn" onClick={() => window.print()}>{T.print}</button>
                  {!viewOnly && (
                    <>
                      {detail.status === "OPEN"
                        ? <button className="aa-btn" onClick={() => closeOrReopen(false)} data-write="true">{T.closeBtn}</button>
                        : <button className="aa-btn" onClick={() => closeOrReopen(true)} data-write="true">{T.reopenBtn}</button>}
                      <button className="aa-btn aa-btn-danger" onClick={deleteAssessment} data-write="true">{T.deleteBtn}</button>
                    </>
                  )}
                </div>
              </header>

              {/* Per-member aggregate cards */}
              <section className="aa-sub">
                <div className="aa-sub-head"><h3>{T.aggHead}</h3><p>{T.aggSub}</p></div>
                <div className="aa-agg-grid">
                  {aggregation && aggregation.map(({ member, count, avg, derive: d }) => (
                    <div key={member.teacher_id} className="aa-agg">
                      <div className="aa-agg-head">
                        <div className="aa-agg-name">{member.profile.full_name}</div>
                        <span className="aa-agg-count">{count}</span>
                      </div>
                      {!avg || !d ? (
                        <div className="aa-agg-empty">{T.noRating}</div>
                      ) : (
                        <>
                          <div className="aa-agg-bars">
                            {TRAITS.map((t, i) => {
                              const isCore = d.coreIdx === i && d.hasCore;
                              const isColl = d.collectiveIdx === i;
                              return (
                                <div key={t.key} className="aa-agg-row">
                                  <span className={`aa-agg-trait ${isCore ? "core" : isColl ? "coll" : ""}`}>{t[L]}</span>
                                  <div className="aa-agg-track"><div className="aa-agg-fill" style={{ width: `${Math.min(100, avg[i])}%`, background: t.color }} /></div>
                                  <span className="aa-agg-val">{avg[i].toFixed(1)}</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="aa-agg-derived">
                            <span><b>{AT.coreLabel}:</b> {d.hasCore && d.coreIdx !== null ? TRAITS[d.coreIdx][L] : AT.noCore}</span>
                            <span><b>{AT.collectiveLabel}:</b> {TRAITS[d.collectiveIdx][L]}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Per-trait per-member table */}
              <section className="aa-sub">
                <div className="aa-sub-head"><h3>{T.perTraitHead}</h3></div>
                <div className="aa-table-wrap">
                  <table className="aa-table">
                    <thead>
                      <tr>
                        <th>{T.targetCol}</th>
                        {TRAITS.map((t) => <th key={t.key}>{t[L]}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {aggregation && aggregation.map(({ member, avg }) => (
                        <tr key={member.teacher_id}>
                          <td className="aa-name-cell">{member.profile.full_name}</td>
                          {(avg ?? [0, 0, 0, 0, 0]).map((v, i) => (
                            <td key={i}>{avg ? v.toFixed(1) : T.noRating}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Full rater × target matrix */}
              <section className="aa-sub">
                <div className="aa-sub-head">
                  <h3>{T.matrixHead}</h3>
                  <p>{T.matrixSub}</p>
                  <div className="aa-filter no-print">
                    <label>{T.filterMember}:</label>
                    <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
                      <option value="">{T.filterAll}</option>
                      {detail.members.map((m) => (
                        <option key={m.teacher_id} value={m.teacher_id}>{m.profile.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="aa-table-wrap">
                  <table className="aa-matrix">
                    <thead>
                      <tr>
                        <th className="aa-corner">{T.raterCol} ↓ / {T.targetCol} →</th>
                        {filteredMembers.map((m) => (
                          <th key={m.teacher_id}>{m.profile.full_name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.members.map((rater) => (
                        <tr key={rater.teacher_id}>
                          <td className="aa-name-cell">{rater.profile.full_name}</td>
                          {filteredMembers.map((target) => {
                            const r = ratingFor(rater.teacher_id, target.teacher_id);
                            if (!r) return <td key={target.teacher_id} className="aa-empty-cell">{T.noRating}</td>;
                            const tuple: ScoresTuple = [r.s_lineage, r.s_atonement, r.s_awareness, r.s_zeal, r.s_distinct];
                            const d = derive(tuple);
                            return (
                              <td key={target.teacher_id} className={rater.teacher_id === target.teacher_id ? "aa-self-cell" : ""}>
                                <div className="aa-cell-scores">
                                  {tuple.map((v, i) => {
                                    const isCore = d.coreIdx === i && d.hasCore;
                                    const isColl = d.collectiveIdx === i;
                                    return (
                                      <span key={i} className={`aa-score ${isCore ? "aa-score-core" : isColl ? "aa-score-coll" : ""}`} title={TRAITS[i][L]}>
                                        {v}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </section>
      </div>

      {dlg && !viewOnly && (
        <div className="aa-overlay" onClick={() => !creating && setDlg(false)}>
          <div className="aa-dlg" onClick={(e) => e.stopPropagation()}>
            <h3 className="aa-dlg-title">{T.newDlgTitle}</h3>
            <label className="aa-dlg-lbl">{T.titleLbl}</label>
            <input className="aa-dlg-input" placeholder={T.titlePh} value={form.title} onChange={(e) => setForm({ title: e.target.value })} autoFocus />
            <div className="aa-dlg-actions">
              <button className="aa-btn" onClick={() => setDlg(false)} disabled={creating}>{T.cancel}</button>
              <button className="aa-btn aa-btn-primary" onClick={createAssessment} disabled={creating || !form.title.trim()}>
                {creating ? T.creating : T.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        .aa { font-family: 'Cairo', sans-serif; }
        .aa-back { display: inline-block; color: #6B1E2D; font-weight: 800; font-size: 13px; text-decoration: none; margin-bottom: 12px; }
        .aa-back:hover { text-decoration: underline; }
        .aa-hero { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
        .aa-title { font-size: 22px; font-weight: 900; color: #32101A; margin: 0 0 6px; }
        .aa-sub { font-size: 13px; color: #655B53; max-width: 640px; line-height: 1.85; margin: 0; }
        .aa-new { background: linear-gradient(180deg,#5B1526,#32101A); color: #B8A082; border: none; padding: 9px 16px; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }

        .aa-layout { display: grid; grid-template-columns: 280px 1fr; gap: 14px; }
        @media (max-width: 900px) { .aa-layout { grid-template-columns: 1fr; } }
        .aa-side { background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 12px; padding: 8px; min-height: 200px; }
        .aa-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
        .aa-list-item { width: 100%; text-align: start; background: transparent; border: 1px solid transparent; padding: 10px 12px; border-radius: 10px; cursor: pointer; font-family: inherit; display: flex; flex-direction: column; gap: 4px; }
        .aa-list-item:hover { background: rgba(194,160,89,0.10); }
        .aa-list-item.active { background: linear-gradient(165deg,#FFFBF5,#F7F3EB); border-color: #B8A082; }
        .aa-list-top { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
        .aa-tag { font-size: 10.5px; font-weight: 800; padding: 2px 9px; border-radius: 99px; letter-spacing: .04em; }
        .aa-tag-OPEN   { background: rgba(76,107,60,0.14); color: #1B5E20; }
        .aa-tag-CLOSED { background: rgba(26,26,26,0.08);  color: #655B53; }
        .aa-list-count { font-size: 11px; color: #8F765B; font-weight: 700; }
        .aa-list-title { font-size: 13.5px; font-weight: 800; color: #32101A; }
        .aa-list-date  { font-size: 11px; color: #8C8274; font-weight: 700; }

        .aa-detail { background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 12px; padding: 14px; min-height: 320px; }
        .aa-detail-empty { padding: 60px 20px; text-align: center; color: #8C8274; font-weight: 700; }
        .aa-detail-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; padding-bottom: 12px; border-bottom: 1px solid rgba(184,155,94,0.32); margin-bottom: 14px; }
        .aa-detail-title { font-size: 17px; font-weight: 900; color: #32101A; margin: 0 0 4px; }
        .aa-detail-meta { font-size: 12px; color: #8F765B; font-weight: 700; }
        .aa-detail-actions { display: flex; gap: 6px; flex-wrap: wrap; }

        .aa-btn { background: #FFF; border: 1.5px solid rgba(194,160,89,0.32); color: #6B1E2D; padding: 6px 12px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
        .aa-btn:hover { border-color: #B8A082; }
        .aa-btn-primary { background: linear-gradient(180deg,#5B1526,#32101A); color: #B8A082; border-color: transparent; }
        .aa-btn-danger  { background: rgba(163,59,46,0.10); color: #A33B2E; border-color: rgba(163,59,46,0.35); }

        .aa-sub { margin-top: 18px; }
        .aa-sub-head { margin-bottom: 10px; }
        .aa-sub-head h3 { margin: 0 0 4px; font-size: 14.5px; font-weight: 900; color: #32101A; }
        .aa-sub-head p { margin: 0; font-size: 12px; color: #655B53; line-height: 1.75; }

        .aa-agg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap: 10px; }
        .aa-agg { background: linear-gradient(165deg,#FFFBF5,#F7F3EB); border: 1px solid rgba(184,155,94,0.40); border-radius: 11px; padding: 12px; }
        .aa-agg-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .aa-agg-name { font-size: 13.5px; font-weight: 800; color: #32101A; }
        .aa-agg-count { font-size: 11px; color: #8F765B; font-weight: 700; background: rgba(184,155,94,0.18); padding: 2px 8px; border-radius: 99px; }
        .aa-agg-empty { font-size: 12px; color: #8C8274; font-weight: 700; padding: 12px 0; }
        .aa-agg-bars { display: flex; flex-direction: column; gap: 5px; margin-bottom: 8px; }
        .aa-agg-row { display: grid; grid-template-columns: 80px 1fr 38px; align-items: center; gap: 6px; }
        .aa-agg-trait { font-size: 11.5px; font-weight: 700; color: #4A0E1C; }
        .aa-agg-trait.core { color: #6B1E2D; font-weight: 800; }
        .aa-agg-trait.coll { color: #8F765B; font-weight: 800; }
        .aa-agg-track { height: 7px; background: rgba(194,160,89,0.18); border-radius: 99px; overflow: hidden; }
        .aa-agg-fill { height: 100%; border-radius: 99px; }
        .aa-agg-val { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11.5px; font-weight: 800; color: #32101A; text-align: center; }
        .aa-agg-derived { display: flex; flex-direction: column; gap: 3px; padding-top: 6px; border-top: 1px dashed rgba(184,155,94,0.32); font-size: 11.5px; color: #4A0E1C; line-height: 1.75; }
        .aa-agg-derived b { color: #6B1E2D; }

        .aa-filter { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 12.5px; }
        .aa-filter label { font-weight: 800; color: #6B1E2D; }
        .aa-filter select { padding: 5px 10px; border-radius: 8px; border: 1.5px solid rgba(194,160,89,0.32); font-family: inherit; background: #FFF; font-size: 12.5px; }

        .aa-table-wrap { overflow-x: auto; border: 1px solid rgba(26,26,26,0.08); border-radius: 10px; background: #FFFBF5; }
        .aa-table, .aa-matrix { width: 100%; border-collapse: collapse; }
        .aa-table th, .aa-matrix th { background: rgba(194,160,89,0.10); color: #6B1E2D; font-size: 11px; font-weight: 800; padding: 8px; text-align: center; letter-spacing: .04em; text-transform: uppercase; border-bottom: 1px solid rgba(184,155,94,0.32); white-space: nowrap; }
        .aa-table th:first-child, .aa-matrix th:first-child { text-align: start; padding-inline-start: 12px; min-width: 160px; }
        .aa-corner { font-size: 10px !important; }
        .aa-table td, .aa-matrix td { padding: 8px; font-size: 12px; text-align: center; border-bottom: 1px solid rgba(26,26,26,0.06); font-family: 'JetBrains Mono', ui-monospace, monospace; font-weight: 700; }
        .aa-name-cell { font-family: 'Cairo', sans-serif !important; font-weight: 800 !important; text-align: start !important; padding-inline-start: 12px !important; color: #32101A; background: rgba(194,160,89,0.05); }
        .aa-empty-cell { color: #BFB6A8 !important; }
        .aa-self-cell { background: rgba(107,30,45,0.04); }
        .aa-cell-scores { display: flex; gap: 3px; justify-content: center; }
        .aa-score { padding: 1px 5px; border-radius: 4px; background: rgba(26,26,26,0.06); color: #4A0E1C; font-size: 11px; min-width: 24px; }
        .aa-score-core { background: rgba(107,30,45,0.18); color: #6B1E2D; }
        .aa-score-coll { background: rgba(199,154,61,0.28); color: #8F765B; }

        .aa-empty { padding: 30px 16px; text-align: center; color: #8C8274; font-weight: 700; font-size: 13px; }
        .aa-overlay { position: fixed; inset: 0; background: rgba(26,26,26,0.55); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; backdrop-filter: blur(4px); }
        .aa-dlg { background: #FFFBF5; border-radius: 14px; padding: 22px; max-width: 460px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .aa-dlg-title { font-size: 16px; font-weight: 900; color: #32101A; margin: 0 0 12px; }
        .aa-dlg-lbl { display: block; font-size: 12px; font-weight: 800; color: #6B1E2D; margin: 8px 0 4px; }
        .aa-dlg-input { width: 100%; padding: 9px 12px; border: 1.5px solid rgba(194,160,89,0.32); border-radius: 8px; font-family: inherit; font-size: 13px; background: #FFF; outline: none; }
        .aa-dlg-input:focus { border-color: #B8A082; }
        .aa-dlg-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }

        @media print {
          .no-print { display: none !important; }
          .aa-layout { grid-template-columns: 1fr !important; }
          .aa-side { display: none !important; }
          .aa { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
