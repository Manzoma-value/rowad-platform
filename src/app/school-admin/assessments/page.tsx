"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/language-context";
import { useViewOnly } from "@/lib/view-only-context";
import { useConfirm } from "@/lib/confirm-dialog";
import MandalaLoader from "@/components/MandalaLoader";
import IdentityStar from "@/components/IdentityStar";
import IdentityMandala from "@/components/IdentityMandala";
import TraitSpectrumPanel from "@/components/TraitSpectrumPanel";
import { seedFromString, blendCmykWeighted } from "@/lib/trait-spectrum";
import {
  ASSESS_UI, derive, averageTuples, pickAssessLang, defaultTraitDrafts, canonicalizeDefaultTraits,
  type ScoresTuple, type TraitDraft,
} from "@/lib/rowad-assessment";
import {
  SlidersHorizontal, X, Search, Plus, Pencil, Download, Lock, Unlock,
  Trash2, Users2, ClipboardList, Target, GripVertical, Layers3, Sparkles, CheckSquare,
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
  groups: GroupRef[];
  _count: { ratings: number; traits: number };
};

type Trait = { id: string; position: number; label_ar: string; label_sq: string; statement_ar: string; statement_sq: string; color: string };
type Member = { teacher_id: string; profile: { id: string; full_name: string; email: string | null } };
type RatingRow = { rater_teacher_id: string; target_teacher_id: string; scores: ScoresTuple; updated_at: string };
type AssessmentFull = {
  id: string;
  title: string;
  status: "OPEN" | "CLOSED";
  groups: GroupRef[];
  traits: Trait[];
  members: Member[];
  ratings: RatingRow[];
};

function traitLabel(t: Trait, lang: "ar" | "sq") { return lang === "ar" ? t.label_ar : t.label_sq; }

// Lead with the five high-contrast canonical trait colors, followed by the
// brand neutrals as extra choices for fully custom trait sets.
const SWATCHES = [
  "#2563EB", "#D97706", "#7C3AED", "#DC2626", "#059669",
  "#6B1E2D", "#B8A082", "#8F765B", "#4A0E1C", "#A55A68", "#1B5E20", "#32101A", "#D9C9B0",
];

const UI = {
  ar: {
    eyebrow: "لوحة النماذج",
    title: "نماذج القياس",
    sub: "تتبَّع نتائج السمات لكل مجموعات المعلمين من مكان واحد — أنشئ نموذجاً جديداً بسماته الخاصة، صفِّه، أو صدِّره كتقرير جاهز.",
    metricModels: "نموذج",
    metricOpen: "مفتوح",
    metricClosed: "مغلق",
    metricRatings: "تقييم",
    create: "نموذج جديد",
    createHelpTitle: "أنشئ نموذجاً لكل المدرسة أو لمجموعة محددة",
    createHelpSub: "اختر النطاق، خصّص السمات والألوان، ثم افتح النموذج للمعلمين من شاشة واحدة.",
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
    statusOPEN: "مفتوح",
    statusCLOSED: "مغلق",
    ratingsCount: "تقييمات",
    dlgCreateTitle: "أنشئ نموذج قياس جديد",
    dlgEditTitle: "تعديل النموذج",
    titleLbl: "عنوان النموذج",
    titlePh: "مثال: نموذج قياس السمات (المرحلة الأولى) — مارس 2026",
    groupsPickLbl: "المجموعات المستهدفة",
    groupsPickSub: "كل الأعضاء في المجموعات المختارة سيقيّمون بعضهم بعضاً كمجموعة واحدة. الكل مُحدَّد افتراضياً.",
    scopeLbl: "نطاق التطبيق",
    scopeAll: "كل المجموعات",
    scopeAllSub: "تطبيق النموذج على جميع مجموعات المعلمين الحالية.",
    scopeSpecific: "مجموعات محددة",
    scopeSpecificSub: "اختر مجموعة واحدة أو أكثر لهذا النموذج فقط.",
    setupTitle: "إعداد النموذج",
    traitsCount: (n: number) => `${n} سمات`,
    selectedGroups: (n: number) => `${n} مجموعات محددة`,
    selectAll: "تحديد الكل",
    deselectAll: "إلغاء تحديد الكل",
    traitsLbl: "سمات النموذج",
    traitsSub: "خصّص العدد والعناوين والعبارات كما تشاء — تبدأ مسبقة التعبئة بسمات نموذج الرواد الافتراضي ويمكنك تعديلها أو حذفها أو إضافة غيرها.",
    traitLabelAr: "الاسم (عربي)",
    traitLabelSq: "الاسم (ألباني)",
    traitStatementAr: "عبارة التقييم (عربي)",
    traitStatementSq: "عبارة التقييم (ألباني)",
    addTrait: "+ إضافة سمة",
    removeTrait: "حذف السمة",
    minTraitsWarn: "يلزم سمة واحدة على الأقل.",
    lockedEditNote: "بدأ المعلمون بالتقييم على هذا النموذج، لذا لا يمكن تعديل السمات أو المجموعات المستهدفة بعد الآن — يمكنك تغيير العنوان فقط. أنشئ نموذجاً جديداً لتخصيص مختلف.",
    cancel: "إلغاء",
    submit: "إنشاء",
    save: "حفظ",
    detailEmptyTitle: "اختر نموذجاً لعرض تفاصيله",
    detailEmptySub: "من القائمة على اليسار، اختر أي نموذج قياس لرؤية نتائجه الكاملة.",
    matrixOf: (n: number) => `${n} عضواً`,
    groupsOf: (n: number) => `${n} مجموعة`,
    raterCol: "المقَيِّم",
    targetCol: "الهدف",
    closeBtn: "إغلاق النموذج",
    reopenBtn: "إعادة فتح",
    deleteBtn: "حذف النموذج",
    exportBtn: "تصدير PDF",
    exporting: "جارٍ التصدير…",
    editBtn: "تعديل",
    confirmClose: "إغلاق هذا النموذج سيمنع المعلمين من تعديل تقييماتهم. متابعة؟",
    confirmReopen: "إعادة فتح هذا النموذج تسمح بالتعديل من جديد. متابعة؟",
    confirmDelete: "حذف هذا النموذج نهائيًا مع كل بياناته؟ هذا الإجراء لا يمكن التراجع عنه.",
    matrixHead: "المصفوفة الكاملة",
    matrixSub: "كل خانة تعرض درجات السمات التي أعطاها المقَيِّم للهدف.",
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
    sub: "Ndiq rezultatet e tipareve për të gjitha grupet e mësuesve nga një vend — krijo model të ri me tiparet e tij, filtroje, ose eksportoje si raport.",
    metricModels: "modele",
    metricOpen: "të hapura",
    metricClosed: "të mbyllura",
    metricRatings: "vlerësime",
    create: "Model i ri",
    createHelpTitle: "Krijo një model për gjithë shkollën ose për grupe të caktuara",
    createHelpSub: "Zgjidh shtrirjen, personalizo tiparet dhe ngjyrat, pastaj hape për mësuesit nga një ekran.",
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
    statusOPEN: "I hapur",
    statusCLOSED: "I mbyllur",
    ratingsCount: "vlerësime",
    dlgCreateTitle: "Krijo model matjeje të ri",
    dlgEditTitle: "Modifiko modelin",
    titleLbl: "Titulli",
    titlePh: "Shembull: Modeli i Tipareve (Faza 1) — Mars 2026",
    groupsPickLbl: "Grupet e synuara",
    groupsPickSub: "Të gjithë anëtarët e grupeve të zgjedhura do të vlerësojnë njëri-tjetrin si një grup i vetëm. Të gjitha janë të zgjedhura si parazgjedhje.",
    scopeLbl: "Shtrirja e modelit",
    scopeAll: "Të gjitha grupet",
    scopeAllSub: "Zbatoje modelin në të gjitha grupet aktuale të mësuesve.",
    scopeSpecific: "Grupe të caktuara",
    scopeSpecificSub: "Zgjidh një ose më shumë grupe vetëm për këtë model.",
    setupTitle: "Konfigurimi i modelit",
    traitsCount: (n: number) => `${n} tipare`,
    selectedGroups: (n: number) => `${n} grupe të zgjedhura`,
    selectAll: "Zgjidh të gjitha",
    deselectAll: "Hiq zgjedhjen",
    traitsLbl: "Tiparet e modelit",
    traitsSub: "Personalizo numrin, titujt dhe pohimet si të duash — fillon e mbushur me tiparet e modelit standard Rowad dhe mund t'i ndryshosh, fshish, ose shtosh të tjera.",
    traitLabelAr: "Emri (arabisht)",
    traitLabelSq: "Emri (shqip)",
    traitStatementAr: "Pohimi (arabisht)",
    traitStatementSq: "Pohimi (shqip)",
    addTrait: "+ Shto tipar",
    removeTrait: "Fshi tiparin",
    minTraitsWarn: "Duhet të paktën një tipar.",
    lockedEditNote: "Mësuesit kanë filluar të vlerësojnë në këtë model, kështu që tiparet ose grupet e synuara nuk mund të ndryshohen më — mund të ndryshosh vetëm titullin. Krijo një model të ri për personalizim tjetër.",
    cancel: "Anulo",
    submit: "Krijo",
    save: "Ruaj",
    detailEmptyTitle: "Zgjidh një model për të parë detajet",
    detailEmptySub: "Nga lista majtas, zgjidh çdo model matjeje për të parë rezultatet e plota.",
    matrixOf: (n: number) => `${n} anëtarë`,
    groupsOf: (n: number) => `${n} grupe`,
    raterCol: "Vlerësuesi",
    targetCol: "Synimi",
    closeBtn: "Mbyll modelin",
    reopenBtn: "Rihap",
    deleteBtn: "Fshi modelin",
    exportBtn: "Eksporto PDF",
    exporting: "Po eksportohet…",
    editBtn: "Modifiko",
    confirmClose: "Mbyllja do parandalojë mësuesit të redaktojnë. Të vazhdohet?",
    confirmReopen: "Rihapja do lejojë redaktimin sërish. Të vazhdohet?",
    confirmDelete: "Të fshihet ky model përfundimisht me të gjitha të dhënat? Ky veprim nuk mund të zhbëhet.",
    matrixHead: "Matrica e Plotë",
    matrixSub: "Çdo qelizë tregon pikët e tipareve që vlerësuesi i ka dhënë synimit.",
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

  const [dlg, setDlg] = useState<{ mode: "create" | "edit" } | null>(null);
  const [form, setForm] = useState<{ title: string; groupIds: string[]; traits: TraitDraft[] }>({ title: "", groupIds: [], traits: [] });
  const [saving, setSaving] = useState(false);
  const [dlgError, setDlgError] = useState("");
  const [exporting, setExporting] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await fetch(`/api/school-admin/assessments`, { cache: "no-store" });
      const d = await r.json();
      const assessments = d?.assessments ?? [];
      setList(assessments);
      setGroups(d?.groups ?? []);
      setSelectedId((current) => current ?? assessments[0]?.id ?? null);
    } finally { setLoadingList(false); }
  }, []);

  const loadDetail = useCallback(async (aid: string) => {
    setLoadingDetail(true);
    try {
      const r = await fetch(`/api/school-admin/assessments/${aid}`, { cache: "no-store" });
      if (!r.ok) { setDetail(null); return; }
      const d = await r.json();
      const assessment = d?.assessment as AssessmentFull | undefined;
      setDetail(assessment ? { ...assessment, traits: canonicalizeDefaultTraits(assessment.traits) } : null);
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
      if (fGroup && !a.groups.some((g) => g.id === fGroup)) return false;
      if (fStatus && a.status !== fStatus) return false;
      if (!needle) return true;
      return `${a.title} ${a.groups.map((g) => g.name).join(" ")}`.toLowerCase().includes(needle);
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

  function openCreateDialog() {
    setForm({ title: "", groupIds: groups.map((g) => g.id), traits: defaultTraitDrafts() });
    setDlgError("");
    setDlg({ mode: "create" });
  }
  function openEditDialog() {
    if (!detail) return;
    setForm({
      title: detail.title,
      groupIds: detail.groups.map((g) => g.id),
      traits: detail.traits.map((t) => ({ label_ar: t.label_ar, label_sq: t.label_sq, statement_ar: t.statement_ar, statement_sq: t.statement_sq, color: t.color })),
    });
    setDlgError("");
    setDlg({ mode: "edit" });
  }

  const editLocked = dlg?.mode === "edit" && (detail?.ratings.length ?? 0) > 0;

  function toggleGroup(id: string) {
    setForm((f) => ({
      ...f,
      groupIds: f.groupIds.includes(id) ? f.groupIds.filter((g) => g !== id) : [...f.groupIds, id],
    }));
  }
  function updateTrait(idx: number, patch: Partial<TraitDraft>) {
    setForm((f) => ({ ...f, traits: f.traits.map((t, i) => (i === idx ? { ...t, ...patch } : t)) }));
  }
  function addTrait() {
    setForm((f) => ({
      ...f,
      traits: [...f.traits, { label_ar: "", label_sq: "", statement_ar: "", statement_sq: "", color: SWATCHES[f.traits.length % SWATCHES.length] }],
    }));
  }
  function removeTrait(idx: number) {
    setForm((f) => ({ ...f, traits: f.traits.filter((_, i) => i !== idx) }));
  }

  async function submitDialog() {
    if (!form.title.trim()) return;
    if (!editLocked) {
      if (form.groupIds.length === 0) { setDlgError(L === "ar" ? "اختر مجموعة واحدة على الأقل" : "Zgjidh të paktën një grup"); return; }
      const cleanTraits = form.traits.map((t) => ({ ...t, label_ar: t.label_ar.trim(), label_sq: t.label_sq.trim(), statement_ar: t.statement_ar.trim(), statement_sq: t.statement_sq.trim() }));
      if (cleanTraits.length === 0 || cleanTraits.some((t) => !t.label_ar || !t.label_sq || !t.statement_ar || !t.statement_sq)) {
        setDlgError(L === "ar" ? "أكمل اسم وعبارة كل سمة (عربي وألباني) قبل الحفظ" : "Plotëso emrin dhe pohimin e çdo tipari (arabisht dhe shqip) para se të ruash");
        return;
      }
    }
    setDlgError("");
    setSaving(true);
    try {
      if (dlg?.mode === "create") {
        const r = await fetch(`/api/school-admin/assessments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: form.title, group_ids: form.groupIds, traits: form.traits }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { setDlgError(d.error ?? ""); return; }
        setDlg(null);
        await loadList();
        setSelectedId(d?.assessment?.id ?? null);
      } else if (dlg?.mode === "edit" && selectedId) {
        const payload: Record<string, unknown> = { title: form.title };
        if (!editLocked) {
          payload.group_ids = form.groupIds;
          payload.traits = form.traits;
        }
        const r = await fetch(`/api/school-admin/assessments/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { setDlgError(d.error ?? ""); return; }
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
      arr.push(r.scores);
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
          <div className="am-createbar-copy">
            <span><Sparkles size={13} />{T.createHelpTitle}</span>
            <p>{T.createHelpSub}</p>
          </div>
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
                      {a.groups.length <= 1 ? (a.groups[0]?.name ?? "—") : T.groupsOf(a.groups.length)}
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
                      <button className="am-icon-btn" onClick={openEditDialog} title={T.editBtn} data-write="true">
                        <Pencil size={13} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                  <span className="am-detail-meta">
                    <Users2 size={12} strokeWidth={2} />
                    {detail.groups.map((g) => g.name).join(" · ")} · {T.matrixOf(detail.members.length)}
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
                  {detail.traits.map((tr, i) => (
                    <button
                      key={tr.id}
                      className={`am-trait-chip ${traitFilter === i ? "active" : ""}`}
                      style={traitFilter === i ? { background: tr.color, borderColor: tr.color, color: "#FFFBF5" } : undefined}
                      onClick={() => setTraitFilter(i)}
                    >
                      {traitLabel(tr, L)}
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
                      {visibleAggregation.map(({ member, count, avg }) => (
                        <div key={member.teacher_id} className="am-agg">
                          <div className="am-agg-watermark" aria-hidden="true">
                            <IdentityMandala size={80} stroke="#4A0E1C" opacity={0.05} />
                          </div>
                          <div className="am-agg-head">
                            <div className="am-agg-head-main">
                              <div className="am-agg-name">{member.profile.full_name}</div>
                            </div>
                            <span className="am-agg-count">{count}</span>
                          </div>
                          {!avg ? (
                            <div className="am-agg-empty">{T.noRating}</div>
                          ) : (
                            <>
                              <div className="am-agg-spectrum-row">
                                <TraitSpectrumPanel
                                  traits={detail.traits.map((tr, i) => ({ label: traitLabel(tr, L), color: tr.color, pct: avg[i] ?? 0 }))}
                                  seed={seedFromString(member.teacher_id)}
                                  lang={L}
                                  compact
                                />
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
                            {detail.traits.map((tr) => <th key={tr.id}>{traitLabel(tr, L)}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {visibleAggregation.map(({ member, avg }) => (
                            <tr key={member.teacher_id}>
                              <td className="am-name-cell">{member.profile.full_name}</td>
                              {detail.traits.map((_, i) => (
                                <td key={i}>{avg ? (avg[i] ?? 0).toFixed(1) : T.noRating}</td>
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
                                    const d = derive(r.scores);
                                    return (
                                      <td key={target.teacher_id} className={rater.teacher_id === target.teacher_id ? "am-self-cell" : ""}>
                                        <div className="am-cell-scores">
                                          {r.scores.map((v, i) => {
                                            const isCore = d.coreIdx === i && d.hasCore;
                                            const isColl = d.collectiveIdx === i;
                                            return (
                                              <span key={i} className={`am-score ${isCore ? "am-score-core" : isColl ? "am-score-coll" : ""}`} title={detail.traits[i] ? traitLabel(detail.traits[i], L) : ""}>
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
            <header className="am-dlg-head">
              <div>
                <span><Layers3 size={14} />{T.setupTitle}</span>
                <h3 className="am-dlg-title">{dlg.mode === "create" ? T.dlgCreateTitle : T.dlgEditTitle}</h3>
                <p>{T.selectedGroups(form.groupIds.length)} · {T.traitsCount(form.traits.length)}</p>
              </div>
              <button type="button" onClick={() => !saving && setDlg(null)} aria-label={T.cancel}><X size={18} /></button>
            </header>

            <div className="am-dlg-body">
              <section className="am-form-section">
                <div className="am-form-number">1</div>
                <div className="am-form-content">
                  <label className="am-dlg-lbl">{T.titleLbl}</label>
                  <input className="am-dlg-input" placeholder={T.titlePh} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} autoFocus />
                </div>
              </section>

              {editLocked ? (
                <p className="am-dlg-note">{T.lockedEditNote}</p>
              ) : (
                <>
                  <section className="am-form-section">
                    <div className="am-form-number">2</div>
                    <div className="am-form-content">
                      <label className="am-dlg-lbl">{T.groupsPickLbl}</label>
                      <p className="am-dlg-hint">{T.groupsPickSub}</p>
                      <span className="am-scope-label">{T.scopeLbl}</span>
                      <div className="am-scope-grid">
                        <button
                          type="button"
                          className={form.groupIds.length === groups.length ? "active" : ""}
                          onClick={() => setForm((current) => ({ ...current, groupIds: groups.map((group) => group.id) }))}
                        >
                          <CheckSquare size={18} />
                          <span><strong>{T.scopeAll}</strong><small>{T.scopeAllSub}</small></span>
                        </button>
                        <button
                          type="button"
                          className={form.groupIds.length !== groups.length ? "active" : ""}
                          onClick={() => setForm((current) => ({ ...current, groupIds: current.groupIds.length === groups.length ? groups.slice(0, 1).map((group) => group.id) : current.groupIds }))}
                        >
                          <Users2 size={18} />
                          <span><strong>{T.scopeSpecific}</strong><small>{T.scopeSpecificSub}</small></span>
                        </button>
                      </div>

                      {form.groupIds.length !== groups.length && (
                        <div className="am-group-grid">
                          {groups.map((g) => {
                            const checked = form.groupIds.includes(g.id);
                            return (
                              <label key={g.id} className={`am-group-chk ${checked ? "checked" : ""}`}>
                                <input type="checkbox" checked={checked} onChange={() => toggleGroup(g.id)} />
                                <span>{g.name}</span>
                                <em>{g._count?.members ?? 0}</em>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="am-form-section">
                    <div className="am-form-number">3</div>
                    <div className="am-form-content">
                      <div className="am-dlg-section-head">
                        <div>
                          <label className="am-dlg-lbl" style={{ margin: 0 }}>{T.traitsLbl}</label>
                          <p className="am-dlg-hint">{T.traitsSub}</p>
                        </div>
                        <span className="am-trait-total">{T.traitsCount(form.traits.length)}</span>
                      </div>
                      <div className="am-trait-editor">
                        {form.traits.map((t, i) => (
                          <div key={i} className="am-trait-row">
                            <div className="am-trait-row-head">
                              <GripVertical size={14} strokeWidth={2} className="am-trait-grip" />
                              <input
                                type="color"
                                className="am-trait-color"
                                value={t.color}
                                onChange={(e) => updateTrait(i, { color: e.target.value })}
                              />
                              <input
                                className="am-trait-input am-trait-label"
                                placeholder={T.traitLabelAr}
                                value={t.label_ar}
                                onChange={(e) => updateTrait(i, { label_ar: e.target.value })}
                                dir="rtl"
                              />
                              <input
                                className="am-trait-input am-trait-label"
                                placeholder={T.traitLabelSq}
                                value={t.label_sq}
                                onChange={(e) => updateTrait(i, { label_sq: e.target.value })}
                              />
                              <button type="button" className="am-trait-remove" onClick={() => removeTrait(i)} title={T.removeTrait}>
                                <Trash2 size={13} strokeWidth={2} />
                              </button>
                            </div>
                            <div className="am-trait-statements">
                              <textarea
                                className="am-trait-input am-trait-statement"
                                placeholder={T.traitStatementAr}
                                value={t.statement_ar}
                                onChange={(e) => updateTrait(i, { statement_ar: e.target.value })}
                                dir="rtl"
                                rows={2}
                              />
                              <textarea
                                className="am-trait-input am-trait-statement"
                                placeholder={T.traitStatementSq}
                                value={t.statement_sq}
                                onChange={(e) => updateTrait(i, { statement_sq: e.target.value })}
                                rows={2}
                              />
                            </div>
                          </div>
                        ))}
                        <button type="button" className="am-add-trait" onClick={addTrait}>
                          <Plus size={14} strokeWidth={2.4} />
                          {T.addTrait}
                        </button>
                        {form.traits.length === 0 && <p className="am-dlg-warn">{T.minTraitsWarn}</p>}
                      </div>
                    </div>
                  </section>
                </>
              )}

              {dlgError && <p className="am-dlg-err">{dlgError}</p>}
            </div>

            <div className="am-dlg-actions">
              <button className="am-btn" onClick={() => setDlg(null)} disabled={saving}>{T.cancel}</button>
              <button
                className="am-btn am-btn-primary"
                onClick={submitDialog}
                disabled={saving || !form.title.trim()}
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
                <div className="am-export-sub">{detail.groups.map((g) => g.name).join(" · ")} · {T.matrixOf(detail.members.length)}</div>
              </div>
              <span className={`am-export-status am-export-status-${detail.status}`}>
                {detail.status === "OPEN" ? T.statusOPEN : T.statusCLOSED}
              </span>
            </div>
            <div className="am-export-grid">
              {aggregation.map(({ member, count, avg, derive: d }) => (
                <div key={member.teacher_id} className="am-export-card">
                  <div className="am-export-card-head">
                    <div className="am-export-card-head-main">
                      {avg && (
                        <span
                          className="am-export-swatch"
                          style={{ background: blendCmykWeighted(detail.traits.map((tr, i) => ({ color: tr.color, pct: avg[i] ?? 0 }))) }}
                        />
                      )}
                      <strong>{member.profile.full_name}</strong>
                    </div>
                    <span>{count} {T.ratingsCount}</span>
                  </div>
                  {!avg || !d ? (
                    <div className="am-export-noresult">{T.noRating}</div>
                  ) : (
                    <>
                      {detail.traits.map((tr, i) => {
                        const isCore = d.coreIdx === i && d.hasCore;
                        return (
                          <div key={tr.id} className="am-export-row">
                            <span className={isCore ? "am-export-trait-core" : ""}>{traitLabel(tr, L)}</span>
                            <div className="am-export-track"><div className="am-export-fill" style={{ width: `${Math.min(100, avg[i] ?? 0)}%`, background: tr.color }} /></div>
                            <b>{(avg[i] ?? 0).toFixed(1)}</b>
                          </div>
                        );
                      })}
                      <div className="am-export-footer">
                        {d.hasCore && d.coreIdx !== null ? `${AT.coreLabel}: ${traitLabel(detail.traits[d.coreIdx], L)}` : AT.noCore}
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

  .am-createbar { display:flex; align-items:center; justify-content:space-between; gap:18px; padding:16px 18px; border:1px solid rgba(184,160,130,.28); border-radius:18px; background:linear-gradient(115deg,#FFFBF5,#F1E9DE); box-shadow:0 10px 26px rgba(50,16,26,.055); }
  .am-createbar-copy { min-width:0; }
  .am-createbar-copy span { display:flex; align-items:center; gap:7px; color:#4A0E1C; font-size:13px; font-weight:900; }
  .am-createbar-copy span svg { color:#B8A082; }
  .am-createbar-copy p { margin:4px 0 0; color:#796A62; font-size:11.5px; line-height:1.6; font-weight:700; }
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
  @media (max-width:1000px) { .am-layout { grid-template-columns:minmax(0,1fr); } .am-filters-row { grid-template-columns:1fr; } }

  .am-side { min-width:0; background:linear-gradient(180deg,#FFFBF5,#F7F3EB); border:1px solid rgba(184,160,130,.22); border-radius:20px; padding:10px; min-height:220px; box-shadow:0 10px 26px rgba(50,16,26,.045); }
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

  .am-detail { min-width:0; background:linear-gradient(180deg,#FFFBF5,#F7F3EB); border:1px solid rgba(184,160,130,.22); border-radius:20px; padding:20px; min-height:320px; box-shadow:0 10px 26px rgba(50,16,26,.045); }
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

  .am-agg-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(440px,1fr)); gap:14px; }
  .am-agg { position:relative; min-width:0; overflow:hidden; background:linear-gradient(165deg,#FFFBF5,#F7F3EB); border:1px solid rgba(184,160,130,.28); border-radius:16px; padding:14px; box-shadow:0 8px 20px rgba(50,16,26,.045); transition:transform .18s ease, border-color .18s ease; }
  .am-agg:hover { transform:translateY(-2px); border-color:rgba(184,160,130,.5); }
  .am-agg-watermark { position:absolute; inset-inline-end:-16px; bottom:-16px; pointer-events:none; z-index:0; }
  .am-agg-head { position:relative; z-index:1; display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:9px; }
  .am-agg-head-main { display:flex; align-items:center; gap:8px; min-width:0; }
  .am-agg-spectrum-row { position:relative; z-index:1; margin-bottom:14px; }
  .am-agg-name { font-family:var(--font-head); font-size:13px; font-weight:700; color:#1A1A1A; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
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
  .am-cell-scores { display:flex; gap:3px; justify-content:center; flex-wrap:wrap; }
  .am-score { padding:1px 5px; border-radius:5px; background:rgba(26,26,26,.05); color:#4A0E1C; font-size:10.5px; min-width:22px; }
  .am-score-core { background:rgba(107,30,45,.18); color:#6B1E2D; }
  .am-score-coll { background:rgba(184,160,130,.28); color:#8F765B; }

  .am-overlay { position:fixed; inset:0; background:rgba(26,17,14,.68); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px; backdrop-filter:blur(9px); }
  .am-dlg { display:flex; flex-direction:column; background:linear-gradient(165deg,#FFFBF5,#F7F3EB); border:1.5px solid rgba(184,160,130,.4); border-radius:24px; max-width:920px; width:100%; max-height:calc(100dvh - 32px); overflow:hidden; box-shadow:0 32px 90px rgba(50,16,26,.38); }
  .am-dlg-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; padding:20px 24px; color:#FFFBF5; background:radial-gradient(circle at 85% 0%,rgba(184,160,130,.2),transparent 34%),linear-gradient(130deg,#250B12,#5B1526); }
  .am-dlg-head>div>span { display:flex; align-items:center; gap:7px; color:#D9C9B0; font-size:10px; font-weight:900; letter-spacing:.12em; text-transform:uppercase; }
  .am-dlg-head p { margin:5px 0 0; color:rgba(255,251,245,.66); font-size:10.5px; font-weight:700; }
  .am-dlg-head>button { width:38px; height:38px; display:grid; place-items:center; flex:none; border:1px solid rgba(255,255,255,.16); border-radius:12px; background:rgba(255,255,255,.07); color:#fff; cursor:pointer; }
  .am-dlg-body { min-height:0; overflow-y:auto; padding:20px 24px; }
  .am-dlg-title { font-family:var(--font-head); font-size:18px; font-weight:700; color:#FFFBF5; margin:5px 0 0; }
  .am-form-section { display:grid; grid-template-columns:34px minmax(0,1fr); gap:12px; align-items:start; padding:16px; border:1px solid rgba(184,160,130,.22); border-radius:17px; background:rgba(255,255,255,.64); }
  .am-form-section+.am-form-section { margin-top:12px; }
  .am-form-number { width:30px; height:30px; display:grid; place-items:center; border-radius:10px; background:#32101A; color:#D9C9B0; font:900 12px ui-monospace,monospace; }
  .am-form-content { min-width:0; }
  .am-dlg-lbl { display:block; font-size:11.5px; font-weight:800; color:#6B1E2D; margin:10px 0 5px; }
  .am-dlg-hint { margin:2px 0 0; font-size:11px; color:#8F765B; font-weight:600; line-height:1.6; max-width:440px; }
  .am-dlg-input { width:100%; padding:10px 13px; border:1.5px solid rgba(184,160,130,.32); border-radius:11px; font-family:inherit; font-size:13px; background:#FFF; outline:none; }
  .am-dlg-input:focus { border-color:#B8A082; }
  .am-dlg-note { margin:12px 0 0; padding:12px 14px; border-radius:12px; background:rgba(184,160,130,.10); border:1px dashed rgba(184,160,130,.35); color:#4A0E1C; font-size:12.5px; font-weight:600; line-height:1.75; }
  .am-dlg-section-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-top:16px; }
  .am-dlg-linkbtn { display:inline-flex; align-items:center; gap:5px; background:none; border:1px solid rgba(184,160,130,.30); border-radius:999px; padding:5px 12px; color:#6B1E2D; font:700 11px 'Cairo',sans-serif; cursor:pointer; white-space:nowrap; transition:background .16s ease; }
  .am-dlg-linkbtn:hover { background:rgba(184,160,130,.10); }
  .am-dlg-err { margin:12px 0 0; padding:10px 13px; border-radius:11px; background:rgba(107,30,45,.08); border:1px solid rgba(107,30,45,.24); color:#6B1E2D; font-size:12.5px; font-weight:700; }
  .am-dlg-warn { margin:8px 0 0; font-size:12px; font-weight:700; color:#8F765B; }
  .am-dlg-actions { display:flex; gap:9px; justify-content:flex-end; padding:14px 24px; border-top:1px solid rgba(184,160,130,.22); background:#FFFBF5; }
  .am-scope-label { display:block; margin:14px 0 7px; color:#6B1E2D; font-size:10px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
  .am-scope-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
  .am-scope-grid>button { display:flex; align-items:flex-start; gap:10px; border:1.5px solid rgba(184,160,130,.26); border-radius:14px; background:#FFF; padding:12px; color:#796A62; text-align:start; font-family:inherit; cursor:pointer; transition:.16s ease; }
  .am-scope-grid>button.active { border-color:#6B1E2D; background:rgba(107,30,45,.055); color:#6B1E2D; box-shadow:0 0 0 3px rgba(107,30,45,.06); }
  .am-scope-grid>button svg { flex:none; margin-top:2px; }
  .am-scope-grid>button span { min-width:0; }
  .am-scope-grid strong,.am-scope-grid small { display:block; }
  .am-scope-grid strong { color:#32101A; font-size:12px; }
  .am-scope-grid small { margin-top:3px; color:#796A62; font-size:10px; line-height:1.55; font-weight:700; }
  .am-trait-total { flex:none; border-radius:999px; background:rgba(107,30,45,.08); padding:5px 9px; color:#6B1E2D; font-size:10px; font-weight:900; }

  .am-group-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-top:8px; }
  .am-group-chk { display:flex; align-items:center; gap:8px; padding:9px 12px; border-radius:12px; border:1.5px solid rgba(184,160,130,.26); background:#FFF; cursor:pointer; transition:all .16s ease; }
  .am-group-chk.checked { border-color:rgba(107,30,45,.4); background:rgba(107,30,45,.05); }
  .am-group-chk input { accent-color:#6B1E2D; }
  .am-group-chk span { flex:1; font-size:12.5px; font-weight:700; color:#1A1A1A; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .am-group-chk em { font-style:normal; font-size:10.5px; color:#8F765B; font-weight:700; }

  .am-trait-editor { display:flex; flex-direction:column; gap:10px; margin-top:8px; }
  .am-trait-row { border:1.5px solid rgba(184,160,130,.26); border-radius:14px; padding:11px; background:#FFF; display:flex; flex-direction:column; gap:8px; box-shadow:0 5px 15px rgba(50,16,26,.03); }
  .am-trait-row-head { display:flex; align-items:center; gap:8px; }
  .am-trait-grip { color:#C9BFAF; flex-shrink:0; }
  .am-trait-color { width:30px; height:30px; border-radius:8px; border:1.5px solid rgba(184,160,130,.3); padding:2px; cursor:pointer; flex-shrink:0; }
  .am-trait-input { border:1.5px solid rgba(184,160,130,.26); border-radius:9px; padding:7px 10px; font-family:'Cairo',sans-serif; font-size:12.5px; background:#FBF8F1; outline:none; transition:border-color .16s ease; }
  .am-trait-input:focus { border-color:#B8A082; background:#FFF; }
  .am-trait-label { flex:1; min-width:0; }
  .am-trait-statement { resize:vertical; min-height:44px; line-height:1.5; }
  .am-trait-statements { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
  .am-trait-remove { display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:8px; background:rgba(107,30,45,.06); border:1px solid rgba(107,30,45,.20); color:#6B1E2D; cursor:pointer; flex-shrink:0; transition:background .16s ease; }
  .am-trait-remove:hover { background:rgba(107,30,45,.14); }
  .am-add-trait { align-self:flex-start; display:inline-flex; align-items:center; gap:6px; background:rgba(184,160,130,.10); border:1px dashed rgba(184,160,130,.4); border-radius:11px; padding:8px 16px; color:#6B1E2D; font:700 12px 'Cairo',sans-serif; cursor:pointer; transition:background .16s ease; }
  .am-add-trait:hover { background:rgba(184,160,130,.18); }

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
  .am-export-card-head-main { display:flex; align-items:center; gap:6px; min-width:0; }
  .am-export-swatch { width:12px; height:12px; border-radius:4px; flex-shrink:0; border:1px solid rgba(26,26,26,0.15); }
  .am-export-card-head strong { font-family:'Noto Kufi Arabic','Cairo',sans-serif; font-size:13px; font-weight:700; color:#1A1A1A; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .am-export-card-head span { font-size:10.5px; color:#8F765B; font-weight:700; }
  .am-export-noresult { font-size:11.5px; color:#8C8274; font-weight:700; padding:8px 0; }
  .am-export-row { display:grid; grid-template-columns:58px 1fr 30px; align-items:center; gap:6px; margin-bottom:4px; }
  .am-export-row span { font-size:10px; font-weight:700; color:#4A0E1C; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .am-export-trait-core { color:#6B1E2D !important; font-weight:800 !important; }
  .am-export-track { height:6px; background:rgba(184,160,130,.18); border-radius:99px; overflow:hidden; }
  .am-export-fill { height:100%; border-radius:99px; }
  .am-export-row b { font-size:10.5px; color:#1A1A1A; text-align:center; }
  .am-export-footer { margin-top:8px; padding-top:7px; border-top:1px dashed rgba(184,160,130,.35); font-size:10.5px; font-weight:700; color:#6B1E2D; }

  @media (max-width:700px) {
    .am-hero { grid-template-columns:1fr; padding:20px; border-radius:20px; }
    .am-hero h1 { font-size:23px; }
    .am-hero-metrics { width:100%; grid-template-columns:repeat(2,minmax(0,1fr)); }
    .am-detail { padding:16px; }
    .am-createbar { align-items:stretch; flex-direction:column; }
    .am-create { justify-content:center; }
    .am-agg-grid { grid-template-columns:minmax(0,1fr); }
    .am-group-grid { grid-template-columns:1fr; }
    .am-overlay { padding:0; }
    .am-dlg { max-height:100dvh; height:100dvh; border:0; border-radius:0; }
    .am-dlg-head,.am-dlg-body,.am-dlg-actions { padding-inline:15px; }
    .am-form-section { grid-template-columns:1fr; padding:13px; }
    .am-scope-grid,.am-trait-statements { grid-template-columns:1fr; }
    .am-trait-row-head { flex-wrap:wrap; }
    .am-trait-label { flex-basis:calc(50% - 38px); }
  }
`;
