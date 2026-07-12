"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/language-context";
import { useViewOnly } from "@/lib/view-only-context";
import { useConfirm } from "@/lib/confirm-dialog";
import MandalaLoader from "@/components/MandalaLoader";
import IdentityStar from "@/components/IdentityStar";
import IdentityMandala from "@/components/IdentityMandala";
import {
  TRAITS, ASSESS_UI, derive, averageTuples, pickAssessLang,
  type ScoresTuple,
} from "@/lib/rowad-assessment";
import {
  SlidersHorizontal, X, Search, Plus, Pencil, Download, Lock, Unlock,
  Trash2, Users2, ClipboardList, Target,
} from "lucide-react";

// ── Types ──
type GroupRef = { id: string; name: string; _count?: { members: number } };
type AssessmentRow = {
  id: string;
  title: string;
  status: "OPEN" | "CLOSED";
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  group: GroupRef;
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
    eyebrow: "لوحة النماذج",
    title: "نماذج القياس",
    sub: "تتبَّع نتائج السمات لكل مجموعات المعلمين من مكان واحد — أنشئ نموذجاً جديداً، صفِّه، أو صدِّره كتقرير جاهز.",
    metricModels: "نموذج",
    metricOpen: "مفتوح",
    metricClosed: "مغلق",
    metricRatings: "تقييم",
    create: "+ نموذج جديد",
    creating: "جارٍ الإنشاء…",
    filters: "تصفية النتائج",
    allGroups: "كل المجموعات",
    allStatuses: "كل الحالات",
    statusLbl: "الحالة",
    groupLbl: "المجموعة",
    search: "ابحث بعنوان النموذج أو اسم المجموعة…",
    resetFilters: "مسح التصفية",
    result: "نتيجة",
    listEmpty: "لا توجد نماذج قياس بعد.",
    noResults: "لا يوجد نموذج مطابق لخيارات التصفية الحالية.",
    open: "افتح",
    statusOPEN: "مفتوح",
    statusCLOSED: "مغلق",
    ratingsCount: "تقييمات",
    dlgCreateTitle: "أنشئ نموذج قياس جديد",
    dlgRenameTitle: "إعادة تسمية النموذج",
    titleLbl: "عنوان النموذج",
    titlePh: "مثال: نموذج قياس السمات (المرحلة الأولى) — مارس 2026",
    groupPickLbl: "المجموعة",
    groupPickPh: "اختر مجموعة المعلمين",
    cancel: "إلغاء",
    submit: "إنشاء",
    save: "حفظ",
    detailEmptyTitle: "اختر نموذجاً لعرض تفاصيله",
    detailEmptySub: "من القائمة على اليسار، اختر أي نموذج قياس لرؤية نتائجه الكاملة.",
    matrixOf: (n: number) => `${n} عضواً في المجموعة`,
    raterCol: "المقَيِّم",
    targetCol: "الهدف",
    closeBtn: "إغلاق النموذج",
    reopenBtn: "إعادة فتح",
    deleteBtn: "حذف النموذج",
    exportBtn: "تصدير PDF",
    exporting: "جارٍ التصدير…",
    renameBtn: "إعادة تسمية",
    confirmClose: "إغلاق هذا النموذج سيمنع المعلمين من تعديل تقييماتهم. متابعة؟",
    confirmReopen: "إعادة فتح هذا النموذج تسمح بالتعديل من جديد. متابعة؟",
    confirmDelete: "حذف هذا النموذج نهائيًا مع كل بياناته؟ هذا الإجراء لا يمكن التراجع عنه.",
    matrixHead: "المصفوفة الكاملة",
    matrixSub: "كل خانة تعرض الدرجات الخمس التي أعطاها المقَيِّم للهدف.",
    showMatrix: "عرض المصفوفة الكاملة",
    hideMatrix: "إخفاء المصفوفة",
    aggHead: "نتائج الأعضاء",
    aggSub: "السمة الجوهرية والجماعية لكل عضو، مبنيّة على متوسط كل التقييمات التي تلقّاها.",
    teacherSearch: "ابحث عن معلم داخل هذا النموذج…",
    resultFilter: "تصفية حسب السمة الجوهرية",
    resultFilterAll: "كل السمات",
    perTraitHead: "متوسط كل سمة لكل عضو",
    noRating: "—",
    noMembersMatch: "لا يوجد عضو مطابق للبحث أو التصفية الحالية.",
  },
  sq: {
    eyebrow: "Paneli i Modeleve",
    title: "Modelet e Matjes",
    sub: "Ndiq rezultatet e tipareve për të gjitha grupet e mësuesve nga një vend — krijo model të ri, filtroje, ose eksportoje si raport.",
    metricModels: "modele",
    metricOpen: "të hapura",
    metricClosed: "të mbyllura",
    metricRatings: "vlerësime",
    create: "+ Model i ri",
    creating: "Po krijohet…",
    filters: "Filtrimi",
    allGroups: "Të gjitha grupet",
    allStatuses: "Të gjitha statuset",
    statusLbl: "Statusi",
    groupLbl: "Grupi",
    search: "Kërko sipas titullit ose grupit…",
    resetFilters: "Pastro filtrat",
    result: "rezultate",
    listEmpty: "Nuk ka modele matjeje ende.",
    noResults: "Asnjë model nuk përputhet me filtrat aktualë.",
    open: "Hap",
    statusOPEN: "I hapur",
    statusCLOSED: "I mbyllur",
    ratingsCount: "vlerësime",
    dlgCreateTitle: "Krijo model matjeje të ri",
    dlgRenameTitle: "Riemërto modelin",
    titleLbl: "Titulli",
    titlePh: "Shembull: Modeli i Tipareve (Faza 1) — Mars 2026",
    groupPickLbl: "Grupi",
    groupPickPh: "Zgjidh grupin e mësuesve",
    cancel: "Anulo",
    submit: "Krijo",
    save: "Ruaj",
    detailEmptyTitle: "Zgjidh një model për të parë detajet",
    detailEmptySub: "Nga lista majtas, zgjidh çdo model matjeje për të parë rezultatet e plota.",
    matrixOf: (n: number) => `${n} anëtarë të grupit`,
    raterCol: "Vlerësuesi",
    targetCol: "Synimi",
    closeBtn: "Mbyll modelin",
    reopenBtn: "Rihap",
    deleteBtn: "Fshi modelin",
    exportBtn: "Eksporto PDF",
    exporting: "Po eksportohet…",
    renameBtn: "Riemërto",
    confirmClose: "Mbyllja do parandalojë mësuesit të redaktojnë. Të vazhdohet?",
    confirmReopen: "Rihapja do lejojë redaktimin sërish. Të vazhdohet?",
    confirmDelete: "Të fshihet ky model përfundimisht me të gjitha të dhënat? Ky veprim nuk mund të zhbëhet.",
    matrixHead: "Matrica e Plotë",
    matrixSub: "Çdo qelizë tregon pesë pikët që vlerësuesi i ka dhënë synimit.",
    showMatrix: "Shfaq matricën e plotë",
    hideMatrix: "Fshih matricën",
    aggHead: "Rezultatet e Anëtarëve",
    aggSub: "Tipari thelbësor dhe kolektiv për secilin, bazuar në mesataren e vlerësimeve.",
    teacherSearch: "Kërko një mësues brenda këtij modeli…",
    resultFilter: "Filtro sipas tiparit thelbësor",
    resultFilterAll: "Të gjitha tiparet",
    perTraitHead: "Mesatarja e çdo tipari për secilin anëtar",
    noRating: "—",
    noMembersMatch: "Asnjë anëtar nuk përputhet me kërkimin ose filtrin aktual.",
  },
} as const;

export default function AssessmentsHubPage() {
  const { lang } = useLang();
  const L = pickAssessLang(lang);
  const T = UI[L];
  const AT = ASSESS_UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const viewOnly = useViewOnly();
  const confirm = useConfirm();

  const [list, setList] = useState<AssessmentRow[]>([]);
  const [groups, setGroups] = useState<GroupRef[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AssessmentFull | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── List-level filters ──
  const [query, setQuery] = useState("");
  const [fGroup, setFGroup] = useState("");
  const [fStatus, setFStatus] = useState("");

  // ── Detail-level filters ──
  const [teacherSearch, setTeacherSearch] = useState("");
  const [traitFilter, setTraitFilter] = useState<number | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);

  const [dlg, setDlg] = useState<{ mode: "create" | "rename" } | null>(null);
  const [form, setForm] = useState({ title: "", groupId: "" });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await fetch(`/api/school-admin/assessments`, { cache: "no-store" });
      const d = await r.json();
      setList(d?.assessments ?? []);
      setGroups(d?.groups ?? []);
    } finally { setLoadingList(false); }
  }, []);

  const loadDetail = useCallback(async (aid: string) => {
    setLoadingDetail(true);
    try {
      const r = await fetch(`/api/school-admin/assessments/${aid}`, { cache: "no-store" });
      if (!r.ok) { setDetail(null); return; }
      const d = await r.json();
      setDetail(d?.assessment ?? null);
    } finally { setLoadingDetail(false); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    setTeacherSearch("");
    setTraitFilter(null);
    setShowMatrix(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Pre-select a group from ?group= if present (deep link from the group page).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const g = params.get("group");
    if (g) setFGroup(g);
  }, []);

  const filteredList = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return list.filter((a) => {
      if (fGroup && a.group.id !== fGroup) return false;
      if (fStatus && a.status !== fStatus) return false;
      if (!needle) return true;
      return `${a.title} ${a.group.name}`.toLowerCase().includes(needle);
    });
  }, [list, query, fGroup, fStatus]);

  const totals = useMemo(() => ({
    models: list.length,
    open: list.filter((a) => a.status === "OPEN").length,
    closed: list.filter((a) => a.status === "CLOSED").length,
    ratings: list.reduce((sum, a) => sum + a._count.ratings, 0),
  }), [list]);

  const hasActiveFilters = Boolean(query.trim() || fGroup || fStatus);
  const resetFilters = () => { setQuery(""); setFGroup(""); setFStatus(""); };

  async function openCreateDialog() {
    setForm({ title: "", groupId: fGroup || groups[0]?.id || "" });
    setDlg({ mode: "create" });
  }
  function openRenameDialog() {
    if (!detail) return;
    setForm({ title: detail.title, groupId: detail.group.id });
    setDlg({ mode: "rename" });
  }

  async function submitDialog() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (dlg?.mode === "create") {
        if (!form.groupId) return;
        const r = await fetch(`/api/school-admin/assessments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: form.title, group_id: form.groupId }),
        });
        if (!r.ok) return;
        const d = await r.json();
        setDlg(null);
        await loadList();
        setSelectedId(d?.assessment?.id ?? null);
      } else if (dlg?.mode === "rename" && selectedId) {
        const r = await fetch(`/api/school-admin/assessments/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: form.title }),
        });
        if (!r.ok) return;
        setDlg(null);
        await loadList();
        await loadDetail(selectedId);
      }
    } finally { setSaving(false); }
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
    await fetch(`/api/school-admin/assessments/${selectedId}`, {
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
    await fetch(`/api/school-admin/assessments/${selectedId}`, { method: "DELETE" });
    setSelectedId(null);
    setDetail(null);
    loadList();
  }

  // ── Aggregation derived from the ratings rows ──
  const aggregation = useMemo(() => {
    if (!detail) return [];
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

  const visibleAggregation = useMemo(() => {
    const needle = teacherSearch.trim().toLowerCase();
    return aggregation.filter(({ member, derive: d }) => {
      if (needle && !member.profile.full_name.toLowerCase().includes(needle)) return false;
      if (traitFilter !== null) {
        if (!d) return false;
        const resultIdx = d.hasCore && d.coreIdx !== null ? d.coreIdx : d.collectiveIdx;
        if (resultIdx !== traitFilter) return false;
      }
      return true;
    });
  }, [aggregation, teacherSearch, traitFilter]);

  const visibleMemberIds = useMemo(() => new Set(visibleAggregation.map((a) => a.member.teacher_id)), [visibleAggregation]);
  const matrixMembers = useMemo(
    () => (detail?.members ?? []).filter((m) => visibleMemberIds.has(m.teacher_id)),
    [detail, visibleMemberIds],
  );

  const ratingFor = (raterId: string, targetId: string) =>
    detail?.ratings.find((r) => r.rater_teacher_id === raterId && r.target_teacher_id === targetId);

  async function exportPdf() {
    if (!exportRef.current || !detail) return;
    setExporting(true);
    try {
      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);
      const canvas = await html2canvas(exportRef.current, { scale: 2, backgroundColor: "#FBF7EF", useCORS: true });
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = 190, pageHeight = 277;
      const imgWidth = pageWidth, imgHeight = (canvas.height * imgWidth) / canvas.width;
      const image = canvas.toDataURL("image/png");
      let position = 0;
      doc.addImage(image, "PNG", 10, 10, imgWidth, imgHeight);
      let remaining = imgHeight - pageHeight;
      while (remaining > 0) {
        position += pageHeight;
        doc.addPage();
        doc.addImage(image, "PNG", 10, 10 - position, imgWidth, imgHeight);
        remaining -= pageHeight;
      }
      doc.save(`${detail.title.replace(/[^\p{L}\p{N}\- ]/gu, "").trim() || "assessment"}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="am-page" dir={dir}>
      <section className="am-hero">
        <div className="am-hero-star" aria-hidden="true">
          <IdentityMandala size={270} stroke="#D9C9B0" opacity={0.9} spin spinDuration={130} />
        </div>
        <div>
          <p className="am-eyebrow">
            <IdentityStar size={11} strokeWidth={5} color="#D9C9B0" />
            {T.eyebrow}
          </p>
          <h1>{T.title}</h1>
          <p>{T.sub}</p>
        </div>
        <div className="am-hero-metrics">
          <Metric value={totals.models} label={T.metricModels} />
          <Metric value={totals.open} label={T.metricOpen} />
          <Metric value={totals.closed} label={T.metricClosed} />
          <Metric value={totals.ratings} label={T.metricRatings} />
        </div>
      </section>

      {!viewOnly && (
        <div className="am-createbar">
          <button className="am-create" onClick={openCreateDialog} data-write="true">
            <Plus size={15} strokeWidth={2.4} />
            {T.create}
          </button>
        </div>
      )}

      {/* ── Filters ── */}
      <section className="am-filters">
        <div className="am-filters-head">
          <SlidersHorizontal size={14} strokeWidth={2} />
          <span>{T.filters}</span>
          <em className="am-filters-count">{filteredList.length} {T.result}</em>
          {hasActiveFilters && (
            <button type="button" className="am-filters-reset" onClick={resetFilters}>
              <X size={12} strokeWidth={2.4} />
              {T.resetFilters}
            </button>
          )}
        </div>
        <div className="am-filters-row">
          <label className="am-filter am-filter-search">
            <span>{T.search}</span>
            <div className="am-search-box">
              <Search size={14} strokeWidth={2} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={T.search} />
            </div>
          </label>
          <label className="am-filter">
            <span>{T.groupLbl}</span>
            <select value={fGroup} onChange={(e) => setFGroup(e.target.value)}>
              <option value="">{T.allGroups}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </label>
          <label className="am-filter">
            <span>{T.statusLbl}</span>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">{T.allStatuses}</option>
              <option value="OPEN">{T.statusOPEN}</option>
              <option value="CLOSED">{T.statusCLOSED}</option>
            </select>
          </label>
        </div>
      </section>

      <div className="am-layout">
        <aside className="am-side">
          {loadingList ? <MandalaLoader compact /> : filteredList.length === 0 ? (
            <div className="am-empty">{hasActiveFilters ? T.noResults : T.listEmpty}</div>
          ) : (
            <ul className="am-list">
              {filteredList.map((a) => (
                <li key={a.id}>
                  <button
                    className={`am-list-item ${selectedId === a.id ? "active" : ""}`}
                    onClick={() => setSelectedId(a.id)}
                  >
                    <div className="am-list-top">
                      <span className={`am-tag am-tag-${a.status}`}>
                        {a.status === "OPEN" ? T.statusOPEN : T.statusCLOSED}
                      </span>
                      <span className="am-list-count">{a._count.ratings} {T.ratingsCount}</span>
                    </div>
                    <div className="am-list-title">{a.title}</div>
                    <div className="am-list-meta">
                      <Users2 size={11} strokeWidth={2} />
                      {a.group.name}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="am-detail">
          {!selectedId ? (
            <div className="am-detail-empty">
              <ClipboardList size={34} strokeWidth={1.4} />
              <strong>{T.detailEmptyTitle}</strong>
              <span>{T.detailEmptySub}</span>
            </div>
          ) : loadingDetail || !detail ? <MandalaLoader compact /> : (
            <>
              <header className="am-detail-head">
                <div className="am-detail-text">
                  <div className="am-detail-title-row">
                    <h2 className="am-detail-title">{detail.title}</h2>
                    {!viewOnly && (
                      <button className="am-icon-btn" onClick={openRenameDialog} title={T.renameBtn} data-write="true">
                        <Pencil size={13} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                  <span className="am-detail-meta">
                    <Users2 size={12} strokeWidth={2} /> {detail.group.name} · {T.matrixOf(detail.members.length)}
                  </span>
                </div>
                <div className="am-detail-actions">
                  <button className="am-btn" onClick={exportPdf} disabled={exporting} data-write="true">
                    <Download size={13} strokeWidth={2} />
                    {exporting ? T.exporting : T.exportBtn}
                  </button>
                  {!viewOnly && (
                    <>
                      {detail.status === "OPEN"
                        ? <button className="am-btn" onClick={() => closeOrReopen(false)} data-write="true"><Lock size={13} strokeWidth={2} />{T.closeBtn}</button>
                        : <button className="am-btn" onClick={() => closeOrReopen(true)} data-write="true"><Unlock size={13} strokeWidth={2} />{T.reopenBtn}</button>}
                      <button className="am-btn am-btn-danger" onClick={deleteAssessment} data-write="true">
                        <Trash2 size={13} strokeWidth={2} />
                        {T.deleteBtn}
                      </button>
                    </>
                  )}
                </div>
              </header>

              {/* ── Detail-level filters: teacher search + result (core trait) chips ── */}
              <div className="am-detail-filters">
                <div className="am-search-box am-search-box--detail">
                  <Search size={13} strokeWidth={2} />
                  <input value={teacherSearch} onChange={(e) => setTeacherSearch(e.target.value)} placeholder={T.teacherSearch} />
                </div>
                <div className="am-trait-chips">
                  <span className="am-trait-chips-label">{T.resultFilter}:</span>
                  <button
                    className={`am-trait-chip ${traitFilter === null ? "active" : ""}`}
                    onClick={() => setTraitFilter(null)}
                  >
                    {T.resultFilterAll}
                  </button>
                  {TRAITS.map((tr, i) => (
                    <button
                      key={tr.key}
                      className={`am-trait-chip ${traitFilter === i ? "active" : ""}`}
                      style={traitFilter === i ? { background: tr.color, borderColor: tr.color, color: "#FFFBF5" } : undefined}
                      onClick={() => setTraitFilter(i)}
                    >
                      {tr[L]}
                    </button>
                  ))}
                </div>
              </div>

              {visibleAggregation.length === 0 ? (
                <div className="am-empty">{T.noMembersMatch}</div>
              ) : (
                <>
                  {/* Per-member aggregate cards */}
                  <section className="am-sub">
                    <div className="am-sub-head"><h3>{T.aggHead}</h3><p>{T.aggSub}</p></div>
                    <div className="am-agg-grid">
                      {visibleAggregation.map(({ member, count, avg, derive: d }) => (
                        <div key={member.teacher_id} className="am-agg">
                          <div className="am-agg-watermark" aria-hidden="true">
                            <IdentityMandala size={80} stroke="#4A0E1C" opacity={0.05} />
                          </div>
                          <div className="am-agg-head">
                            <div className="am-agg-name">{member.profile.full_name}</div>
                            <span className="am-agg-count">{count}</span>
                          </div>
                          {!avg || !d ? (
                            <div className="am-agg-empty">{T.noRating}</div>
                          ) : (
                            <>
                              <div className="am-agg-bars">
                                {TRAITS.map((tr, i) => {
                                  const isCore = d.coreIdx === i && d.hasCore;
                                  const isColl = d.collectiveIdx === i;
                                  return (
                                    <div key={tr.key} className="am-agg-row">
                                      <span className={`am-agg-trait ${isCore ? "core" : isColl ? "coll" : ""}`}>{tr[L]}</span>
                                      <div className="am-agg-track"><div className="am-agg-fill" style={{ width: `${Math.min(100, avg[i])}%`, background: tr.color }} /></div>
                                      <span className="am-agg-val">{avg[i].toFixed(1)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="am-agg-derived">
                                <span className="am-agg-derived-core"><b>{AT.coreLabel}:</b> {d.hasCore && d.coreIdx !== null ? TRAITS[d.coreIdx][L] : AT.noCore}</span>
                                <span><b>{AT.collectiveLabel}:</b> {TRAITS[d.collectiveIdx][L]}</span>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Per-trait per-member table */}
                  <section className="am-sub">
                    <div className="am-sub-head"><h3>{T.perTraitHead}</h3></div>
                    <div className="am-table-wrap">
                      <table className="am-table">
                        <thead>
                          <tr>
                            <th>{T.targetCol}</th>
                            {TRAITS.map((tr) => <th key={tr.key}>{tr[L]}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {visibleAggregation.map(({ member, avg }) => (
                            <tr key={member.teacher_id}>
                              <td className="am-name-cell">{member.profile.full_name}</td>
                              {(avg ?? [0, 0, 0, 0, 0]).map((v, i) => (
                                <td key={i}>{avg ? v.toFixed(1) : T.noRating}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Full rater × target matrix — collapsed by default */}
                  <section className="am-sub">
                    <button className="am-matrix-toggle" onClick={() => setShowMatrix((v) => !v)}>
                      <Target size={13} strokeWidth={2} />
                      {showMatrix ? T.hideMatrix : T.showMatrix}
                    </button>
                    {showMatrix && (
                      <>
                        <div className="am-sub-head" style={{ marginTop: 12 }}><h3>{T.matrixHead}</h3><p>{T.matrixSub}</p></div>
                        <div className="am-table-wrap">
                          <table className="am-matrix">
                            <thead>
                              <tr>
                                <th className="am-corner">{T.raterCol} ↓ / {T.targetCol} →</th>
                                {matrixMembers.map((m) => (
                                  <th key={m.teacher_id}>{m.profile.full_name}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {matrixMembers.map((rater) => (
                                <tr key={rater.teacher_id}>
                                  <td className="am-name-cell">{rater.profile.full_name}</td>
                                  {matrixMembers.map((target) => {
                                    const r = ratingFor(rater.teacher_id, target.teacher_id);
                                    if (!r) return <td key={target.teacher_id} className="am-empty-cell">{T.noRating}</td>;
                                    const tuple: ScoresTuple = [r.s_lineage, r.s_atonement, r.s_awareness, r.s_zeal, r.s_distinct];
                                    const d = derive(tuple);
                                    return (
                                      <td key={target.teacher_id} className={rater.teacher_id === target.teacher_id ? "am-self-cell" : ""}>
                                        <div className="am-cell-scores">
                                          {tuple.map((v, i) => {
                                            const isCore = d.coreIdx === i && d.hasCore;
                                            const isColl = d.collectiveIdx === i;
                                            return (
                                              <span key={i} className={`am-score ${isCore ? "am-score-core" : isColl ? "am-score-coll" : ""}`} title={TRAITS[i][L]}>
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
                      </>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </section>
      </div>

      {dlg && !viewOnly && (
        <div className="am-overlay" onClick={() => !saving && setDlg(null)}>
          <div className="am-dlg" onClick={(e) => e.stopPropagation()}>
            <h3 className="am-dlg-title">{dlg.mode === "create" ? T.dlgCreateTitle : T.dlgRenameTitle}</h3>
            <label className="am-dlg-lbl">{T.titleLbl}</label>
            <input className="am-dlg-input" placeholder={T.titlePh} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} autoFocus />
            {dlg.mode === "create" && (
              <>
                <label className="am-dlg-lbl">{T.groupPickLbl}</label>
                <select className="am-dlg-input" value={form.groupId} onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}>
                  <option value="" disabled>{T.groupPickPh}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({g._count?.members ?? 0})</option>
                  ))}
                </select>
              </>
            )}
            <div className="am-dlg-actions">
              <button className="am-btn" onClick={() => setDlg(null)} disabled={saving}>{T.cancel}</button>
              <button
                className="am-btn am-btn-primary"
                onClick={submitDialog}
                disabled={saving || !form.title.trim() || (dlg.mode === "create" && !form.groupId)}
              >
                {saving ? T.creating : dlg.mode === "create" ? T.submit : T.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hidden export sheet — captured via html2canvas, not the on-screen UI ── */}
      {detail && (
        <div className="am-export-mount" aria-hidden="true">
          <div ref={exportRef} className="am-export-sheet">
            <div className="am-export-head">
              <div className="am-export-mark" />
              <div>
                <div className="am-export-eyebrow">{T.title}</div>
                <div className="am-export-title">{detail.title}</div>
                <div className="am-export-sub">{detail.group.name} · {T.matrixOf(detail.members.length)}</div>
              </div>
              <span className={`am-export-status am-export-status-${detail.status}`}>
                {detail.status === "OPEN" ? T.statusOPEN : T.statusCLOSED}
              </span>
            </div>
            <div className="am-export-grid">
              {aggregation.map(({ member, count, avg, derive: d }) => (
                <div key={member.teacher_id} className="am-export-card">
                  <div className="am-export-card-head">
                    <strong>{member.profile.full_name}</strong>
                    <span>{count} {T.ratingsCount}</span>
                  </div>
                  {!avg || !d ? (
                    <div className="am-export-noresult">{T.noRating}</div>
                  ) : (
                    <>
                      {TRAITS.map((tr, i) => {
                        const isCore = d.coreIdx === i && d.hasCore;
                        return (
                          <div key={tr.key} className="am-export-row">
                            <span className={isCore ? "am-export-trait-core" : ""}>{tr[L]}</span>
                            <div className="am-export-track"><div className="am-export-fill" style={{ width: `${Math.min(100, avg[i])}%`, background: tr.color }} /></div>
                            <b>{avg[i].toFixed(1)}</b>
                          </div>
                        );
                      })}
                      <div className="am-export-footer">
                        {d.hasCore && d.coreIdx !== null ? `${AT.coreLabel}: ${TRAITS[d.coreIdx][L]}` : AT.noCore}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="am-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@500;700&family=Cairo:wght@400;600;700;800&display=swap');
  @keyframes am-fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

  .am-page { --font-head:'Noto Kufi Arabic','Cairo',sans-serif; display:flex; flex-direction:column; gap:16px; font-family:'Cairo',sans-serif; color:#1A1A1A; }

  .am-hero {
    display:grid; grid-template-columns: minmax(0,1fr) auto; gap:22px; align-items:end;
    padding:28px 30px; border-radius:24px; overflow:hidden; position:relative;
    background: radial-gradient(circle at 85% -30%, rgba(184,160,130,.22), transparent 44%), radial-gradient(circle at 10% 120%, rgba(107,30,45,.55), transparent 46%), linear-gradient(140deg,#32101A 0%,#4A0E1C 55%,#5B1526 100%);
    border:1px solid rgba(184,160,130,.38); color:#FFFBF5;
    box-shadow: 0 22px 55px rgba(50,16,26,.25), inset 0 1px 0 rgba(217,201,176,.12);
  }
  .am-hero:before { content:""; position:absolute; top:0; inset-inline:28px; height:1.5px; background:linear-gradient(90deg,transparent,rgba(217,201,176,.55) 30%,rgba(217,201,176,.55) 70%,transparent); }
  .am-hero-star { position:absolute; inset-inline-end:-70px; top:50%; transform:translateY(-50%); opacity:.14; pointer-events:none; }
  .am-eyebrow { margin:0 0 6px; display:flex; align-items:center; gap:8px; color:#D9C9B0; font-size:10.5px; font-weight:700; letter-spacing:.22em; text-transform:uppercase; }
  .am-hero h1 { margin:0; font-family:var(--font-head); font-size:27px; font-weight:700; color:#FFFBF5; line-height:1.4; }
  .am-hero p { max-width:640px; margin:8px 0 0; color:rgba(239,234,224,.72); font-size:13.5px; line-height:1.9; font-weight:400; }
  .am-hero-metrics { display:grid; grid-template-columns:repeat(4, minmax(74px,1fr)); gap:10px; position:relative; z-index:1; }
  .am-metric { padding:12px 14px; border-radius:16px; background:rgba(50,16,26,.45); border:1px solid rgba(184,160,130,.30); backdrop-filter:blur(10px); min-width:78px; box-shadow:inset 0 1px 0 rgba(217,201,176,.10); }
  .am-metric strong { display:block; color:#D9C9B0; font-family:var(--font-head); font-size:22px; line-height:1.2; font-weight:700; }
  .am-metric span { display:block; margin-top:6px; color:rgba(239,234,224,.68); font-size:11px; font-weight:600; }

  .am-createbar { display:flex; justify-content:flex-end; }
  .am-create { display:inline-flex; align-items:center; gap:7px; height:44px; padding:0 20px; border-radius:14px; background:linear-gradient(180deg,#5B1526,#32101A); border:1px solid rgba(184,160,130,.35); color:#D9C9B0; font:800 13px 'Cairo',sans-serif; cursor:pointer; transition:box-shadow .18s ease, transform .18s ease; }
  .am-create:hover { box-shadow:0 8px 22px rgba(184,160,130,.28); transform:translateY(-1px); }

  /* ── Filters ── */
  .am-filters { border-radius:20px; padding:16px 18px; background:linear-gradient(180deg,#FFFBF5,#F7F3EB); border:1px solid rgba(184,160,130,.26); box-shadow:0 10px 26px rgba(50,16,26,.045); position:relative; overflow:hidden; }
  .am-filters:before { content:""; position:absolute; top:0; inset-inline:18px; height:2px; background:linear-gradient(90deg,transparent,#B8A082,transparent); }
  .am-filters-head { display:flex; align-items:center; gap:8px; margin-bottom:13px; color:#655B53; }
  .am-filters-head svg { color:#B8A082; }
  .am-filters-head > span { font-family:var(--font-head); font-size:12.5px; font-weight:700; }
  .am-filters-count { font-style:normal; font-size:11px; font-weight:700; color:#6B1E2D; background:rgba(184,160,130,.14); border:1px solid rgba(184,160,130,.25); border-radius:999px; padding:2px 10px; }
  .am-filters-reset { margin-inline-start:auto; display:inline-flex; align-items:center; gap:5px; background:none; border:1px solid rgba(107,30,45,.22); border-radius:999px; padding:4px 12px; color:#6B1E2D; font:700 11px 'Cairo',sans-serif; cursor:pointer; transition:background .16s ease; }
  .am-filters-reset:hover { background:rgba(107,30,45,.07); }
  .am-filters-row { display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px; }
  .am-filter { display:flex; flex-direction:column; gap:6px; min-width:0; }
  .am-filter > span { font-size:10.5px; font-weight:700; letter-spacing:.04em; color:#8F765B; }
  .am-filter select { height:42px; border-radius:13px; padding:0 12px; border:1px solid rgba(184,160,130,.30); background:#FFFFFF; font:700 12.5px 'Cairo',sans-serif; color:#1A1A1A; cursor:pointer; outline:none; transition:border-color .18s ease, box-shadow .18s ease; }
  .am-filter select:hover { border-color:rgba(184,160,130,.5); }
  .am-filter select:focus { border-color:rgba(184,160,130,.6); box-shadow:0 0 0 4px rgba(184,160,130,.10); }

  .am-search-box { display:flex; align-items:center; gap:8px; height:42px; border-radius:13px; padding:0 12px; border:1px solid rgba(184,160,130,.30); background:#FFFFFF; transition:border-color .18s ease, box-shadow .18s ease; }
  .am-search-box:focus-within { border-color:rgba(184,160,130,.6); box-shadow:0 0 0 4px rgba(184,160,130,.10); }
  .am-search-box svg { color:#B8A082; flex-shrink:0; }
  .am-search-box input { flex:1; border:none; outline:none; background:transparent; font:700 12.5px 'Cairo',sans-serif; color:#1A1A1A; min-width:0; }
  .am-search-box--detail { max-width:320px; background:#F7F3EB; }

  .am-empty { padding:40px 20px; text-align:center; border-radius:18px; background:#FFFBF5; border:1px solid rgba(184,160,130,.16); color:#796A62; font-weight:700; font-size:13px; }

  /* ── Layout ── */
  .am-layout { display:grid; grid-template-columns:300px 1fr; gap:16px; align-items:start; }
  @media (max-width:1000px) { .am-layout { grid-template-columns:1fr; } .am-filters-row { grid-template-columns:1fr; } }

  .am-side { background:linear-gradient(180deg,#FFFBF5,#F7F3EB); border:1px solid rgba(184,160,130,.22); border-radius:20px; padding:10px; min-height:220px; box-shadow:0 10px 26px rgba(50,16,26,.045); }
  .am-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:5px; }
  .am-list-item { width:100%; text-align:start; background:transparent; border:1px solid transparent; padding:12px 13px; border-radius:14px; cursor:pointer; font-family:inherit; display:flex; flex-direction:column; gap:5px; transition:all .16s ease; }
  .am-list-item:hover { background:rgba(184,160,130,.09); }
  .am-list-item.active { background:linear-gradient(165deg,#FFFBF5,#F7F3EB); border-color:rgba(184,160,130,.5); box-shadow:0 6px 16px rgba(50,16,26,.08); }
  .am-list-top { display:flex; justify-content:space-between; gap:8px; align-items:center; }
  .am-tag { font-size:10px; font-weight:800; padding:2px 9px; border-radius:99px; letter-spacing:.03em; }
  .am-tag-OPEN { background:rgba(27,94,32,.10); color:#1B5E20; }
  .am-tag-CLOSED { background:rgba(184,160,130,.16); color:#8F765B; }
  .am-list-count { font-size:10.5px; color:#8F765B; font-weight:700; }
  .am-list-title { font-size:13px; font-weight:700; color:#1A1A1A; line-height:1.4; }
  .am-list-meta { display:flex; align-items:center; gap:5px; font-size:10.5px; color:#8C8274; font-weight:700; }
  .am-list-meta svg { color:#B8A082; }

  .am-detail { background:linear-gradient(180deg,#FFFBF5,#F7F3EB); border:1px solid rgba(184,160,130,.22); border-radius:20px; padding:20px; min-height:320px; box-shadow:0 10px 26px rgba(50,16,26,.045); }
  .am-detail-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:70px 20px; text-align:center; color:#8C8274; }
  .am-detail-empty svg { color:#B8A082; margin-bottom:4px; }
  .am-detail-empty strong { font-family:var(--font-head); font-size:15px; color:#655B53; }
  .am-detail-empty span { font-size:12.5px; max-width:340px; }

  .am-detail-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; padding-bottom:14px; border-bottom:1px solid rgba(184,160,130,.26); margin-bottom:16px; }
  .am-detail-title-row { display:flex; align-items:center; gap:8px; }
  .am-detail-title { font-family:var(--font-head); font-size:18px; font-weight:700; color:#1A1A1A; margin:0; }
  .am-icon-btn { display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:8px; background:rgba(184,160,130,.12); border:1px solid rgba(184,160,130,.24); color:#8F765B; cursor:pointer; transition:all .16s ease; }
  .am-icon-btn:hover { background:rgba(184,160,130,.2); color:#6B1E2D; }
  .am-detail-meta { display:inline-flex; align-items:center; gap:6px; margin-top:6px; font-size:12px; color:#8F765B; font-weight:700; }
  .am-detail-actions { display:flex; gap:7px; flex-wrap:wrap; }

  .am-btn { display:inline-flex; align-items:center; gap:6px; background:#FFF; border:1.5px solid rgba(184,160,130,.32); color:#6B1E2D; padding:8px 14px; border-radius:11px; font-family:inherit; font-size:12px; font-weight:800; cursor:pointer; transition:all .16s ease; }
  .am-btn:hover:not(:disabled) { border-color:#B8A082; transform:translateY(-1px); }
  .am-btn:disabled { opacity:.55; cursor:not-allowed; }
  .am-btn-primary { background:linear-gradient(180deg,#5B1526,#32101A); color:#D9C9B0; border-color:transparent; }
  .am-btn-danger { background:rgba(107,30,45,.07); color:#6B1E2D; border-color:rgba(107,30,45,.28); }

  .am-detail-filters { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
  .am-trait-chips { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .am-trait-chips-label { font-size:11px; font-weight:800; color:#8F765B; margin-inline-end:2px; }
  .am-trait-chip { border:1.5px solid rgba(184,160,130,.30); background:#FFFFFF; color:#655B53; padding:6px 13px; border-radius:999px; font:700 11.5px 'Cairo',sans-serif; cursor:pointer; transition:all .16s ease; }
  .am-trait-chip:hover { border-color:rgba(184,160,130,.55); }
  .am-trait-chip.active { border-color:transparent; color:#FFFBF5; font-weight:800; }

  .am-sub { margin-top:20px; }
  .am-sub-head { margin-bottom:11px; }
  .am-sub-head h3 { margin:0 0 4px; font-family:var(--font-head); font-size:14px; font-weight:700; color:#1A1A1A; }
  .am-sub-head p { margin:0; font-size:12px; color:#796A62; line-height:1.75; }

  .am-agg-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(270px,1fr)); gap:12px; }
  .am-agg { position:relative; overflow:hidden; background:linear-gradient(165deg,#FFFBF5,#F7F3EB); border:1px solid rgba(184,160,130,.28); border-radius:16px; padding:14px; box-shadow:0 8px 20px rgba(50,16,26,.045); transition:transform .18s ease, border-color .18s ease; }
  .am-agg:hover { transform:translateY(-2px); border-color:rgba(184,160,130,.5); }
  .am-agg-watermark { position:absolute; inset-inline-end:-16px; bottom:-16px; pointer-events:none; z-index:0; }
  .am-agg-head { position:relative; z-index:1; display:flex; justify-content:space-between; align-items:center; margin-bottom:9px; }
  .am-agg-name { font-family:var(--font-head); font-size:13px; font-weight:700; color:#1A1A1A; }
  .am-agg-count { font-size:10.5px; color:#8F765B; font-weight:700; background:rgba(184,160,130,.16); padding:2px 8px; border-radius:99px; }
  .am-agg-empty { position:relative; z-index:1; font-size:12px; color:#8C8274; font-weight:700; padding:10px 0; }
  .am-agg-bars { position:relative; z-index:1; display:flex; flex-direction:column; gap:5px; margin-bottom:9px; }
  .am-agg-row { display:grid; grid-template-columns:64px 1fr 34px; align-items:center; gap:6px; }
  .am-agg-trait { font-size:10.5px; font-weight:700; color:#4A0E1C; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .am-agg-trait.core { color:#6B1E2D; font-weight:800; }
  .am-agg-trait.coll { color:#8F765B; font-weight:800; }
  .am-agg-track { height:6px; background:rgba(184,160,130,.18); border-radius:99px; overflow:hidden; }
  .am-agg-fill { height:100%; border-radius:99px; }
  .am-agg-val { font-family:ui-monospace,monospace; font-size:11px; font-weight:800; color:#1A1A1A; text-align:center; }
  .am-agg-derived { position:relative; z-index:1; display:flex; flex-direction:column; gap:3px; padding-top:7px; border-top:1px dashed rgba(184,160,130,.32); font-size:11px; color:#4A0E1C; line-height:1.75; }
  .am-agg-derived b { color:#6B1E2D; }
  .am-agg-derived-core { font-weight:700; }

  .am-matrix-toggle { display:inline-flex; align-items:center; gap:7px; background:rgba(184,160,130,.10); border:1px solid rgba(184,160,130,.26); color:#6B1E2D; padding:9px 16px; border-radius:12px; font:800 12px 'Cairo',sans-serif; cursor:pointer; transition:all .16s ease; }
  .am-matrix-toggle:hover { background:rgba(184,160,130,.18); }

  .am-table-wrap { overflow-x:auto; border:1px solid rgba(184,160,130,.18); border-radius:14px; background:#FFFBF5; }
  .am-table, .am-matrix { width:100%; border-collapse:collapse; }
  .am-table th, .am-matrix th { background:rgba(184,160,130,.10); color:#6B1E2D; font-size:10.5px; font-weight:800; padding:9px 8px; text-align:center; letter-spacing:.03em; border-bottom:1px solid rgba(184,160,130,.26); white-space:nowrap; }
  .am-table th:first-child, .am-matrix th:first-child { text-align:start; padding-inline-start:14px; min-width:160px; }
  .am-corner { font-size:9.5px !important; }
  .am-table td, .am-matrix td { padding:9px 8px; font-size:12px; text-align:center; border-bottom:1px solid rgba(26,26,26,.05); font-family:ui-monospace,monospace; font-weight:700; }
  .am-name-cell { font-family:'Cairo',sans-serif !important; font-weight:700 !important; text-align:start !important; padding-inline-start:14px !important; color:#1A1A1A; background:rgba(184,160,130,.04); }
  .am-empty-cell { color:#C9BFAF !important; }
  .am-self-cell { background:rgba(107,30,45,.04); }
  .am-cell-scores { display:flex; gap:3px; justify-content:center; }
  .am-score { padding:1px 5px; border-radius:5px; background:rgba(26,26,26,.05); color:#4A0E1C; font-size:10.5px; min-width:22px; }
  .am-score-core { background:rgba(107,30,45,.18); color:#6B1E2D; }
  .am-score-coll { background:rgba(184,160,130,.28); color:#8F765B; }

  .am-overlay { position:fixed; inset:0; background:rgba(26,17,14,.55); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px; backdrop-filter:blur(5px); }
  .am-dlg { background:linear-gradient(165deg,#FFFBF5,#F7F3EB); border:1.5px solid rgba(184,160,130,.4); border-radius:18px; padding:24px; max-width:440px; width:100%; box-shadow:0 26px 64px rgba(50,16,26,.28); }
  .am-dlg-title { font-family:var(--font-head); font-size:16.5px; font-weight:700; color:#4A0E1C; margin:0 0 14px; }
  .am-dlg-lbl { display:block; font-size:11.5px; font-weight:800; color:#6B1E2D; margin:10px 0 5px; }
  .am-dlg-input { width:100%; padding:10px 13px; border:1.5px solid rgba(184,160,130,.32); border-radius:11px; font-family:inherit; font-size:13px; background:#FFF; outline:none; }
  .am-dlg-input:focus { border-color:#B8A082; }
  .am-dlg-actions { display:flex; gap:9px; justify-content:flex-end; margin-top:18px; }

  /* ── Hidden PDF export sheet ── */
  .am-export-mount { position:fixed; inset-inline-start:-9999px; top:0; z-index:-1; }
  .am-export-sheet { width:760px; padding:34px; background:#FBF7EF; font-family:'Cairo',sans-serif; direction:rtl; }
  .am-export-head { display:flex; align-items:center; gap:16px; padding-bottom:18px; margin-bottom:20px; border-bottom:2px solid #B8A082; }
  .am-export-mark { width:44px; height:44px; border-radius:12px; background:linear-gradient(150deg,#4A0E1C,#32101A); flex-shrink:0; }
  .am-export-eyebrow { font-size:10px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; color:#8F765B; }
  .am-export-title { font-family:'Noto Kufi Arabic','Cairo',sans-serif; font-size:20px; font-weight:700; color:#32101A; margin-top:3px; }
  .am-export-sub { font-size:12px; font-weight:700; color:#655B53; margin-top:4px; }
  .am-export-status { margin-inline-start:auto; padding:5px 14px; border-radius:999px; font-size:11px; font-weight:800; }
  .am-export-status-OPEN { background:rgba(27,94,32,.12); color:#1B5E20; }
  .am-export-status-CLOSED { background:rgba(184,160,130,.2); color:#8F765B; }
  .am-export-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
  .am-export-card { border:1px solid rgba(184,160,130,.35); border-radius:14px; padding:13px 14px; background:#FFFFFF; }
  .am-export-card-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
  .am-export-card-head strong { font-family:'Noto Kufi Arabic','Cairo',sans-serif; font-size:13px; font-weight:700; color:#1A1A1A; }
  .am-export-card-head span { font-size:10.5px; color:#8F765B; font-weight:700; }
  .am-export-noresult { font-size:11.5px; color:#8C8274; font-weight:700; padding:8px 0; }
  .am-export-row { display:grid; grid-template-columns:58px 1fr 30px; align-items:center; gap:6px; margin-bottom:4px; }
  .am-export-row span { font-size:10px; font-weight:700; color:#4A0E1C; }
  .am-export-trait-core { color:#6B1E2D !important; font-weight:800 !important; }
  .am-export-track { height:6px; background:rgba(184,160,130,.18); border-radius:99px; overflow:hidden; }
  .am-export-fill { height:100%; border-radius:99px; }
  .am-export-row b { font-size:10.5px; color:#1A1A1A; text-align:center; }
  .am-export-footer { margin-top:8px; padding-top:7px; border-top:1px dashed rgba(184,160,130,.35); font-size:10.5px; font-weight:700; color:#6B1E2D; }

  @media (max-width:700px) {
    .am-hero { padding:20px; border-radius:20px; }
    .am-hero h1 { font-size:23px; }
    .am-hero-metrics { grid-template-columns:repeat(2,1fr); }
    .am-detail { padding:16px; }
    .am-agg-grid { grid-template-columns:1fr; }
  }
`;
