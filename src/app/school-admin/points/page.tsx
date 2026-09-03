"use client";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────
// النقاط — مسابقة "أفضل 10 مشرفين".
//
// Arabic-only by design: the competition guide, its wording and its five
// scoring areas exist in Arabic, and the jury reads this page in Arabic.
// The rest of the admin area stays bilingual; this screen deliberately
// does not follow the language toggle.
//
// Scores are never fetched pre-computed. The API hands over each
// supervisor's raw measurements plus the school's distribution, and the
// page runs the very same scoring engine the server would — so dragging a
// weight in the distribution editor re-ranks the leaderboard instantly,
// before anything is saved.
// ─────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import MandalaLoader from "@/components/MandalaLoader";
import { useViewOnly } from "@/lib/view-only-context";
import {
  CATEGORY_DEFS,
  CATEGORY_BY_KEY,
  DEFAULT_RULES,
  METRIC_DEFS,
  METRIC_BY_KEY,
  OVERALL_KEY,
  rankTier,
  resolvePointsRules,
  rulesTotal,
  scoreTeacher,
  type CategoryKey,
  type MetricAdjustment,
  type MetricKey,
  type MetricRaw,
  type PointsRule,
  type ScoredTeacher,
} from "@/lib/teacher-points";
import {
  ArrowDownUp,
  Award,
  Check,
  ChevronDown,
  Copy,
  Crown,
  Download,
  Medal,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";

/* ─── Types coming off the API ─── */

type ApiTeacher = {
  teacher_id: string;
  profile_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  onboarding_status: string;
  created_at: string;
  groups: { id: string; name: string }[];
  workshops: { id: string; title: string }[];
  raws: Record<MetricKey, MetricRaw>;
};

type ApiAdjustment = {
  teacher_id: string;
  metric_key: string;
  override_points: number | null;
  bonus_points: number;
  note: string | null;
};

// A saved template has a real `id`; a school with none yet gets a single
// virtual "التوزيع الافتراضي" entry with `id: null` — it becomes a real row
// the moment the admin edits and saves it (see `saveTemplate`).
type ApiTemplate = {
  id: string | null;
  name: string;
  is_active: boolean;
  rules: PointsRule[];
  updated_at: string | null;
  created_at: string | null;
};

type ApiPayload = {
  templates: ApiTemplate[];
  teachers: ApiTeacher[];
  groups: { id: string; name: string }[];
  workshops: { id: string; title: string }[];
  adjustments: ApiAdjustment[];
  generated_at: string;
};

type Ranked = ApiTeacher & { score: ScoredTeacher; rank: number };

type SortKey = "total" | "students" | "name" | CategoryKey;

const PRIZE_WINNERS = 10;

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "مُعتمد",
  UNDER_REVIEW: "قيد المراجعة",
  PENDING_APPLICATION: "لم يُكمل الطلب",
  WAITING_LIST: "قائمة الانتظار",
  REJECTED: "مرفوض",
};

const fmt = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("") || "؟";

/* ─────────────────────────── Page ─────────────────────────── */

export default function PointsPage() {
  const viewOnly = useViewOnly();
  // A small local confirm modal, hardcoded Arabic — this page never follows
  // the site-wide language toggle, so it can't reuse the shared confirm
  // dialog (that one renders its Cancel/Confirm chrome in whatever language
  // the admin's toggle happens to be set to).
  const [confirmState, setConfirmState] = useState<{ title: string; message: string } | null>(null);
  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);
  const confirmDanger = useCallback((opts: { title: string; message: string }) => {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState(opts);
    });
  }, []);
  const settleConfirm = (result: boolean) => {
    const resolve = confirmResolveRef.current;
    confirmResolveRef.current = null;
    setConfirmState(null);
    resolve?.(result);
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<ApiPayload | null>(null);

  const [tab, setTab] = useState<"board" | "rules">("board");

  // Templates: the school's saved point distributions. One is always
  // `is_active` — that is the one the real leaderboard scores with. The
  // template picked in `selectedTemplateId` is only what the editor shows;
  // it does not have to be the active one.
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [draftRules, setDraftRules] = useState<PointsRule[]>(DEFAULT_RULES);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSavedAt, setTemplateSavedAt] = useState<number | null>(null);
  const [templateBusy, setTemplateBusy] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  const [adjustments, setAdjustments] = useState<Record<string, MetricAdjustment>>({});

  // Filters
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [workshopFilter, setWorkshopFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [topOnly, setTopOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDesc, setSortDesc] = useState(true);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ teacher: string; metric: string } | null>(null);

  const applyTemplateSelection = useCallback((list: ApiTemplate[], preferId?: string | null) => {
    const chosen = (preferId ? list.find((t) => t.id === preferId) : null)
      ?? list.find((t) => t.is_active)
      ?? list[0]
      ?? null;
    setSelectedTemplateId(chosen?.id ?? null);
    setDraftRules(chosen ? resolvePointsRules(chosen.rules) : DEFAULT_RULES);
  }, []);

  const load = useCallback(async (preferTemplateId?: string | null) => {
    try {
      const response = await fetch("/api/school-admin/points", { cache: "no-store" });
      if (!response.ok) throw new Error("failed");
      const payload: ApiPayload = await response.json();
      setData(payload);
      setTemplates(payload.templates);
      applyTemplateSelection(payload.templates, preferTemplateId);
      setAdjustments(
        Object.fromEntries(
          payload.adjustments.map((entry) => [
            `${entry.teacher_id}:${entry.metric_key}`,
            {
              override_points: entry.override_points,
              bonus_points: entry.bonus_points,
              note: entry.note,
            },
          ]),
        ),
      );
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [applyTemplateSelection]);

  useEffect(() => { void load(); }, [load]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? templates[0] ?? null,
    [templates, selectedTemplateId],
  );
  const activeTemplate = useMemo(() => templates.find((t) => t.is_active) ?? templates[0] ?? null, [templates]);

  // The real leaderboard — the one that decides the $200 — always scores
  // with the school's ACTIVE, saved template. Unsaved edits in the template
  // editor never move it; that only happens once a template is activated.
  const activeRules = useMemo(
    () => (activeTemplate ? resolvePointsRules(activeTemplate.rules) : DEFAULT_RULES),
    [activeTemplate],
  );

  const ranked: Ranked[] = useMemo(() => {
    if (!data) return [];
    const scored = data.teachers.map((teacher) => {
      const own: Record<string, MetricAdjustment> = {};
      for (const metric of METRIC_DEFS) {
        const found = adjustments[`${teacher.teacher_id}:${metric.key}`];
        if (found) own[metric.key] = found;
      }
      const overall = adjustments[`${teacher.teacher_id}:${OVERALL_KEY}`];
      if (overall) own[OVERALL_KEY] = overall;
      return { ...teacher, score: scoreTeacher(activeRules, teacher.raws, own), rank: 0 };
    });
    scored.sort((left, right) =>
      right.score.total - left.score.total ||
      left.full_name.localeCompare(right.full_name, "ar"),
    );
    scored.forEach((row, index) => { row.rank = index + 1; });
    return scored;
  }, [data, activeRules, adjustments]);

  // The template editor's own live preview — scores the DRAFT rules being
  // edited (which may not be the active template) against the same real
  // activity, purely so the admin sees the effect before saving/activating.
  const previewRanked: Ranked[] = useMemo(() => {
    if (!data) return [];
    const scored = data.teachers.map((teacher) => ({
      ...teacher, score: scoreTeacher(draftRules, teacher.raws, {}), rank: 0,
    }));
    scored.sort((left, right) => right.score.total - left.score.total || left.full_name.localeCompare(right.full_name, "ar"));
    scored.forEach((row, index) => { row.rank = index + 1; });
    return scored;
  }, [data, draftRules]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = ranked.filter((row) => {
      if (topOnly && row.rank > PRIZE_WINNERS) return false;
      if (groupFilter !== "all" && !row.groups.some((group) => group.id === groupFilter)) return false;
      if (workshopFilter !== "all" && !row.workshops.some((shop) => shop.id === workshopFilter)) return false;
      if (statusFilter !== "all" && row.onboarding_status !== statusFilter) return false;
      if (needle) {
        const haystack = `${row.full_name} ${row.email ?? ""} ${row.phone ?? ""}`.toLowerCase();
        const digits = needle.replace(/[^\d+]/g, "");
        const matchesPhone = digits.length >= 3 && (row.phone ?? "").replace(/[^\d+]/g, "").includes(digits);
        if (!haystack.includes(needle) && !matchesPhone) return false;
      }
      return true;
    });

    const value = (row: Ranked): number | string => {
      if (sortKey === "total") return row.score.total;
      if (sortKey === "students") return row.score.metrics.find((m) => m.key === "STUDENTS_REGISTERED")?.value ?? 0;
      if (sortKey === "name") return row.full_name;
      return row.score.categories.find((category) => category.key === sortKey)?.points ?? 0;
    };

    return [...rows].sort((left, right) => {
      const a = value(left);
      const b = value(right);
      const cmp = typeof a === "string" && typeof b === "string"
        ? a.localeCompare(b as string, "ar")
        : (a as number) - (b as number);
      return sortDesc ? -cmp : cmp;
    });
  }, [ranked, query, groupFilter, workshopFilter, statusFilter, topOnly, sortKey, sortDesc]);

  const stats = useMemo(() => {
    const attainable = rulesTotal(activeRules);
    if (ranked.length === 0) {
      return { count: 0, average: 0, best: 0, cutoff: 0, attainable, active: 0 };
    }
    const totals = ranked.map((row) => row.score.total);
    const cutoff = ranked[Math.min(PRIZE_WINNERS, ranked.length) - 1]?.score.total ?? 0;
    return {
      count: ranked.length,
      average: totals.reduce((sum, value) => sum + value, 0) / totals.length,
      best: totals[0] ?? 0,
      cutoff,
      attainable,
      active: ranked.filter((row) => row.score.total > 0).length,
    };
  }, [ranked, activeRules]);

  const draftTotal = rulesTotal(draftRules);
  const rulesDirty = useMemo(
    () => JSON.stringify(draftRules) !== JSON.stringify(selectedTemplate ? resolvePointsRules(selectedTemplate.rules) : DEFAULT_RULES),
    [draftRules, selectedTemplate],
  );

  /* ── Template mutations ── */

  function selectTemplate(id: string | null) {
    applyTemplateSelection(templates, id);
  }

  // Persist the currently-edited rules onto the selected template. A brand
  // new school has no real row yet (`selectedTemplate.id === null`) — the
  // very first save materialises it via the create endpoint instead.
  async function saveTemplateRules() {
    if (viewOnly || !selectedTemplate) return;
    setSavingTemplate(true);
    try {
      let response: Response;
      if (selectedTemplate.id) {
        response = await fetch(`/api/school-admin/points/templates/${selectedTemplate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rules: draftRules }),
        });
      } else {
        response = await fetch("/api/school-admin/points/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: selectedTemplate.name }),
        });
      }
      if (!response.ok) throw new Error("failed");
      const payload = await response.json();
      const saved: ApiTemplate = payload.template;
      // Persisting a virtual default needs a second call to write its rules.
      if (!selectedTemplate.id) {
        const second = await fetch(`/api/school-admin/points/templates/${saved.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rules: draftRules }),
        });
        if (!second.ok) throw new Error("failed");
        const secondPayload = await second.json();
        Object.assign(saved, secondPayload.template);
      }
      setTemplates((current) => {
        const withoutOld = current.filter((t) => t.id !== selectedTemplate.id && t.id !== null);
        return [...withoutOld, saved];
      });
      setSelectedTemplateId(saved.id);
      setDraftRules(resolvePointsRules(saved.rules));
      setTemplateSavedAt(Date.now());
    } catch {
      setError(true);
    } finally {
      setSavingTemplate(false);
    }
  }

  async function createTemplate(duplicateFrom?: string | null) {
    if (viewOnly) return;
    const name = newTemplateName.trim() || (duplicateFrom
      ? `${templates.find((t) => t.id === duplicateFrom)?.name ?? "توزيع"} (نسخة)`
      : "توزيع جديد");
    setTemplateBusy(duplicateFrom ? `duplicate:${duplicateFrom}` : "create");
    try {
      const response = await fetch("/api/school-admin/points/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, duplicate_from: duplicateFrom ?? undefined }),
      });
      if (!response.ok) throw new Error("failed");
      const payload = await response.json();
      const created: ApiTemplate = payload.template;
      setTemplates((current) => [...current.filter((t) => t.id !== null), created]);
      setSelectedTemplateId(created.id);
      setDraftRules(resolvePointsRules(created.rules));
      setNewTemplateName("");
      setCreatingNew(false);
    } catch {
      setError(true);
    } finally {
      setTemplateBusy(null);
    }
  }

  async function renameTemplate() {
    if (viewOnly || !selectedTemplate) return;
    const name = renameValue.trim();
    if (!name || name === selectedTemplate.name) { setRenaming(false); return; }
    if (!selectedTemplate.id) {
      // Not saved yet — just rename it locally, the next save persists it.
      setTemplates((current) => current.map((t) => (t === selectedTemplate ? { ...t, name } : t)));
      setRenaming(false);
      return;
    }
    setTemplateBusy(`rename:${selectedTemplate.id}`);
    try {
      const response = await fetch(`/api/school-admin/points/templates/${selectedTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("failed");
      const payload = await response.json();
      const saved: ApiTemplate = payload.template;
      setTemplates((current) => current.map((t) => (t.id === saved.id ? { ...t, name: saved.name, updated_at: saved.updated_at } : t)));
      setRenaming(false);
    } catch {
      setError(true);
    } finally {
      setTemplateBusy(null);
    }
  }

  async function activateTemplate(id: string) {
    if (viewOnly) return;
    setTemplateBusy(`activate:${id}`);
    try {
      const response = await fetch(`/api/school-admin/points/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activate: true }),
      });
      if (!response.ok) throw new Error("failed");
      setTemplates((current) => current.map((t) => ({ ...t, is_active: t.id === id })));
    } catch {
      setError(true);
    } finally {
      setTemplateBusy(null);
    }
  }

  async function deleteTemplate(id: string) {
    if (viewOnly) return;
    const target = templates.find((t) => t.id === id);
    if (!target) return;
    const ok = await confirmDanger({
      title: "حذف التوزيع",
      message: `سيتم حذف توزيع "${target.name}" نهائيًا. هذا لا يؤثر على النقاط المحفوظة يدويًا لأي مشرف.`,
    });
    if (!ok) return;
    setTemplateBusy(`delete:${id}`);
    try {
      const response = await fetch(`/api/school-admin/points/templates/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("failed");
      const next = templates.filter((t) => t.id !== id);
      setTemplates(next);
      applyTemplateSelection(next);
    } catch {
      setError(true);
    } finally {
      setTemplateBusy(null);
    }
  }

  async function saveAdjustment(
    teacherId: string,
    metricKey: string,
    next: MetricAdjustment | null,
  ) {
    if (viewOnly) return;
    const cacheKey = `${teacherId}:${metricKey}`;
    setAdjustments((current) => {
      const copy = { ...current };
      if (next) copy[cacheKey] = next;
      else delete copy[cacheKey];
      return copy;
    });
    setEditing(null);
    try {
      if (next) {
        await fetch("/api/school-admin/points/adjustments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacher_id: teacherId, metric_key: metricKey, ...next }),
        });
      } else {
        await fetch(
          `/api/school-admin/points/adjustments?teacher_id=${teacherId}&metric_key=${metricKey}`,
          { method: "DELETE" },
        );
      }
    } catch {
      setError(true);
    }
  }

  function exportCsv() {
    const header = [
      "الترتيب", "الاسم", "البريد", "الهاتف", "المجموعة", "الحالة",
      ...CATEGORY_DEFS.map((category) => category.labelAr),
      "المجموع", "النسبة",
    ];
    const lines = visible.map((row) => [
      row.rank,
      row.full_name,
      row.email ?? "",
      row.phone ?? "",
      row.groups.map((group) => group.name).join(" / "),
      STATUS_LABELS[row.onboarding_status] ?? row.onboarding_status,
      ...row.score.categories.map((category) => fmt(category.points)),
      fmt(row.score.total),
      `${row.score.percent}%`,
    ]);
    const csv = [header, ...lines]
      .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `نقاط-المشرفين-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <MandalaLoader />;

  const podium = ranked.slice(0, 3);

  return (
    <div className="pts-page" dir="rtl">
      {/* ── Hero ── */}
      <header className="pts-hero">
        <div className="pts-hero-glow" aria-hidden="true" />
        <div className="pts-hero-copy">
          <span className="pts-eyebrow"><Sparkles size={13} /> رحلة المشرف المتميز</span>
          <h1 className="pts-title">النقاط</h1>
          <p className="pts-sub">
            من الالتزام إلى الأثر — رصيد كل مشرف من {fmt(stats.attainable)} نقطة، مبنيّ على نشاطه الفعلي
            داخل المنصة. المنافسة ليست سباقًا لإنجاز أكبر عدد من المهام؛ إنها رحلة لإظهار أفضل قيادة وأفضل أثر.
          </p>
        </div>
        <div className="pts-prize">
          <Trophy size={20} />
          <strong>أفضل {PRIZE_WINNERS} مشرفين</strong>
          <span>جائزة 200$</span>
        </div>
      </header>

      {error && (
        <div className="pts-error">
          تعذّر تحميل بعض البيانات أو حفظها. حاول تحديث الصفحة.
          <button onClick={() => { setError(false); void load(); }}>إعادة المحاولة</button>
        </div>
      )}

      {/* ── Headline numbers ── */}
      <section className="pts-stats">
        <StatCard icon={<Users size={16} />} value={String(stats.count)} label="مشرف في المنافسة" />
        <StatCard icon={<Award size={16} />} value={fmt(stats.average)} label="متوسط النقاط" />
        <StatCard icon={<Crown size={16} />} value={fmt(stats.best)} label="أعلى رصيد" highlight />
        <StatCard
          icon={<Medal size={16} />}
          value={fmt(stats.cutoff)}
          label={`حدّ التأهل لأفضل ${PRIZE_WINNERS}`}
        />
      </section>

      {/* ── Tabs ── */}
      <nav className="pts-tabs">
        <button className={tab === "board" ? "active" : ""} onClick={() => setTab("board")}>
          <Trophy size={14} /> لوحة الصدارة
        </button>
        <button className={tab === "rules" ? "active" : ""} onClick={() => setTab("rules")}>
          <SlidersHorizontal size={14} /> قوالب التوزيع
        </button>
        {rulesDirty && <span className="pts-tabs-flag">تعديلات غير محفوظة على القالب</span>}
      </nav>

      {tab === "board" ? (
        <>
          {podium.length > 0 && (
            <section className="pts-podium">
              {[podium[1], podium[0], podium[2]].map((row, index) =>
                row ? <PodiumCard key={row.teacher_id} row={row} place={[2, 1, 3][index]} /> : (
                  <div key={`empty-${index}`} className="pts-podium-empty" />
                ),
              )}
            </section>
          )}

          {/* ── Filters ── */}
          <section className="pts-toolbar">
            <div className="pts-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث بالاسم أو البريد أو رقم الهاتف"
              />
              {query && <button onClick={() => setQuery("")} aria-label="مسح"><X size={13} /></button>}
            </div>

            <div className="pts-selects">
              <label>
                <span>المجموعة</span>
                <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
                  <option value="all">كل المجموعات</option>
                  {data?.groups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>الورشة</span>
                <select value={workshopFilter} onChange={(event) => setWorkshopFilter(event.target.value)}>
                  <option value="all">كل الورش</option>
                  {data?.workshops.map((workshop) => (
                    <option key={workshop.id} value={workshop.id}>{workshop.title}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>الحالة</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">كل الحالات</option>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>الترتيب حسب</span>
                <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                  <option value="total">المجموع الكلي</option>
                  <option value="students">عدد المستفيدين</option>
                  <option value="name">الاسم</option>
                  {CATEGORY_DEFS.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.index} · {category.labelAr}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="pts-toolbar-actions">
              <button
                className="pts-chip"
                onClick={() => setSortDesc((value) => !value)}
                title="عكس اتجاه الترتيب"
              >
                <ArrowDownUp size={13} /> {sortDesc ? "تنازلي" : "تصاعدي"}
              </button>
              <button
                className={`pts-chip${topOnly ? " on" : ""}`}
                onClick={() => setTopOnly((value) => !value)}
              >
                <Crown size={13} /> أفضل {PRIZE_WINNERS} فقط
              </button>
              <button className="pts-chip" onClick={exportCsv}>
                <Download size={13} /> تصدير CSV
              </button>
              <span className="pts-count">{visible.length} من {ranked.length}</span>
            </div>

            <div className="pts-legend">
              {CATEGORY_DEFS.map((category) => {
                const rule = activeRules.filter((entry) => METRIC_BY_KEY[entry.key].category === category.key);
                const weight = rule.reduce((sum, entry) => sum + (entry.enabled ? entry.max_points : 0), 0);
                return (
                  <span key={category.key} className="pts-legend-item" title={category.descAr}>
                    <i style={{ background: category.color }} />
                    {category.labelAr}
                    <b>{fmt(weight)}</b>
                  </span>
                );
              })}
            </div>
          </section>

          {/* ── Leaderboard ── */}
          {visible.length === 0 ? (
            <div className="pts-empty">لا يوجد مشرفون مطابقون لهذه الفلاتر.</div>
          ) : (
            <div className="pts-board">
              <div className="pts-board-head">
                <span>#</span>
                <span>المشرف</span>
                <span>المحاور السبعة</span>
                <span>الرصيد</span>
                <span />
              </div>
              {visible.map((row) => (
                <LeaderRow
                  key={row.teacher_id}
                  row={row}
                  rules={activeRules}
                  open={expanded === row.teacher_id}
                  onToggle={() => setExpanded(expanded === row.teacher_id ? null : row.teacher_id)}
                  viewOnly={viewOnly}
                  editing={editing?.teacher === row.teacher_id ? editing.metric : null}
                  onEdit={(metric) => setEditing(metric ? { teacher: row.teacher_id, metric } : null)}
                  onSaveAdjustment={(metric, next) => void saveAdjustment(row.teacher_id, metric, next)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <TemplatesEditor
          templates={templates}
          selected={selectedTemplate}
          onSelect={selectTemplate}
          rules={draftRules}
          onChangeRules={setDraftRules}
          onSave={() => void saveTemplateRules()}
          dirty={rulesDirty}
          saving={savingTemplate}
          savedAt={templateSavedAt}
          total={draftTotal}
          viewOnly={viewOnly}
          preview={previewRanked.slice(0, 5)}
          busy={templateBusy}
          renaming={renaming}
          renameValue={renameValue}
          onStartRename={() => { setRenameValue(selectedTemplate?.name ?? ""); setRenaming(true); }}
          onCancelRename={() => setRenaming(false)}
          onRenameValueChange={setRenameValue}
          onCommitRename={() => void renameTemplate()}
          creatingNew={creatingNew}
          newTemplateName={newTemplateName}
          onStartCreate={() => { setNewTemplateName(""); setCreatingNew(true); }}
          onCancelCreate={() => setCreatingNew(false)}
          onNewTemplateNameChange={setNewTemplateName}
          onCommitCreate={() => void createTemplate(null)}
          onDuplicate={(id) => void createTemplate(id)}
          onActivate={(id) => void activateTemplate(id)}
          onDelete={(id) => void deleteTemplate(id)}
        />
      )}

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          onCancel={() => settleConfirm(false)}
          onConfirm={() => settleConfirm(true)}
        />
      )}

      <Styles />
    </div>
  );
}

/* ─────────────────────── Confirm modal (Arabic-only) ─────────────────────── */

function ConfirmModal({
  title, message, onCancel, onConfirm,
}: { title: string; message: string; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); onCancel(); }
      if (event.key === "Enter") { event.preventDefault(); onConfirm(); }
    }
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onCancel, onConfirm]);

  return (
    <div className="pts-confirm-overlay" role="dialog" aria-modal="true" onClick={onCancel} dir="rtl">
      <div className="pts-confirm-card" onClick={(event) => event.stopPropagation()}>
        <span className="pts-confirm-icon"><Trash2 size={24} /></span>
        <h3>{title}</h3>
        <p>{message}</p>
        <p className="pts-confirm-irrev">هذه العملية لا يمكن التراجع عنها.</p>
        <div className="pts-confirm-actions">
          <button className="pts-btn ghost" onClick={onCancel} autoFocus>إلغاء</button>
          <button className="pts-confirm-danger" onClick={onConfirm}>حذف نهائيًا</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Small pieces ─────────────────────── */

function StatCard({
  icon, value, label, highlight,
}: { icon: React.ReactNode; value: string; label: string; highlight?: boolean }) {
  return (
    <div className={`pts-stat${highlight ? " highlight" : ""}`}>
      <span className="pts-stat-icon">{icon}</span>
      <strong>{value}</strong>
      <span className="pts-stat-label">{label}</span>
    </div>
  );
}

function ScoreRing({ percent, size = 74 }: { percent: number; size?: number }) {
  const stroke = size >= 70 ? 7 : 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(100, percent)) / 100;
  return (
    <svg className="pts-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(184,160,130,0.22)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="url(#ptsRingGradient)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${circumference * filled} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <defs>
        <linearGradient id="ptsRingGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D9C9B0" />
          <stop offset="100%" stopColor="#6B1E2D" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Avatar({ row, size = 40 }: { row: { full_name: string; avatar_url: string | null }; size?: number }) {
  if (row.avatar_url) {
    return (
      <Image
        className="pts-avatar"
        src={row.avatar_url}
        alt={row.full_name}
        width={size}
        height={size}
        unoptimized
      />
    );
  }
  return (
    <span className="pts-avatar pts-avatar-text" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initialsOf(row.full_name)}
    </span>
  );
}

function PodiumCard({ row, place }: { row: Ranked; place: number }) {
  const tier = rankTier(place);
  return (
    <article className={`pts-podium-card tier-${tier} place-${place}`}>
      <span className="pts-podium-medal">
        {place === 1 ? <Crown size={16} /> : <Medal size={15} />}
        {place}
      </span>
      <div className="pts-podium-ring">
        <ScoreRing percent={row.score.percent} size={86} />
        <span className="pts-podium-score">{fmt(row.score.total)}</span>
      </div>
      <Avatar row={row} size={44} />
      <h3>{row.full_name}</h3>
      <p>{row.groups[0]?.name ?? "بلا مجموعة"}</p>
      <div className="pts-podium-bars">
        {row.score.categories.slice(0, 7).map((category) => (
          <span
            key={category.key}
            className="pts-podium-bar"
            title={`${CATEGORY_BY_KEY[category.key].labelAr}: ${fmt(category.points)}/${fmt(category.max_points)}`}
          >
            <i style={{ height: `${category.percent}%`, background: CATEGORY_BY_KEY[category.key].color }} />
          </span>
        ))}
      </div>
    </article>
  );
}

/* ─────────────────────── Leaderboard row ─────────────────────── */

function LeaderRow({
  row, rules, open, onToggle, viewOnly, editing, onEdit, onSaveAdjustment,
}: {
  row: Ranked;
  rules: PointsRule[];
  open: boolean;
  onToggle: () => void;
  viewOnly: boolean;
  editing: string | null;
  onEdit: (metric: string | null) => void;
  onSaveAdjustment: (metric: string, next: MetricAdjustment | null) => void;
}) {
  const tier = rankTier(row.rank);
  const students = row.score.metrics.find((metric) => metric.key === "STUDENTS_REGISTERED")?.value ?? 0;

  return (
    <div className={`pts-row-wrap${open ? " open" : ""}`}>
      <div className={`pts-row tier-${tier}`} onClick={onToggle} role="button" tabIndex={0}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onToggle(); } }}
      >
        <span className={`pts-rank tier-${tier}`}>
          {row.rank <= 3 ? <Crown size={13} /> : null}
          {row.rank}
        </span>

        <div className="pts-who">
          <Avatar row={row} />
          <div>
            <strong>{row.full_name}</strong>
            <span className="pts-who-meta">
              {row.groups.map((group) => group.name).join(" · ") || "بلا مجموعة"}
              {" · "}{students} مستفيد
              {row.phone && <><span className="pts-who-phone"><Phone size={10} />{row.phone}</span></>}
            </span>
          </div>
          {row.score.overall_adjustment && <span className="pts-flag" title="عليه تعديل يدوي على المجموع">معدَّل</span>}
        </div>

        <div className="pts-axes">
          {row.score.categories.map((category) => {
            const def = CATEGORY_BY_KEY[category.key];
            return (
              <span
                key={category.key}
                className="pts-axis"
                title={`${def.index} · ${def.labelAr} — ${fmt(category.points)} من ${fmt(category.max_points)}`}
              >
                <i style={{ width: `${category.percent}%`, background: def.color }} />
              </span>
            );
          })}
        </div>

        <div className="pts-total">
          <strong>{fmt(row.score.total)}</strong>
          <small>/ {fmt(row.score.max_total)}</small>
          <span className="pts-total-bar"><i style={{ width: `${row.score.percent}%` }} /></span>
        </div>

        <span className={`pts-caret${open ? " open" : ""}`}><ChevronDown size={16} /></span>
      </div>

      {open && (
        <div className="pts-detail">
          <div className="pts-detail-head">
            <div>
              <h4>تفصيل الرصيد</h4>
              <p>كل بند يعرض القياس الفعلي من المنصة والنقاط المستحقة — ويمكن تعديل أي بند يدويًا.</p>
            </div>
            <OverallEditor
              row={row}
              viewOnly={viewOnly}
              editing={editing === OVERALL_KEY}
              onEdit={(on) => onEdit(on ? OVERALL_KEY : null)}
              onSave={(next) => onSaveAdjustment(OVERALL_KEY, next)}
            />
          </div>

          <div className="pts-cats">
            {CATEGORY_DEFS.map((category) => {
              const summary = row.score.categories.find((entry) => entry.key === category.key)!;
              const metrics = row.score.metrics.filter((metric) => metric.category === category.key);
              return (
                <section key={category.key} className="pts-cat">
                  <header className="pts-cat-head" style={{ borderColor: category.color }}>
                    <span className="pts-cat-index" style={{ background: category.color }}>{category.index}</span>
                    <div>
                      <h5>{category.labelAr}</h5>
                      <p>{category.descAr}</p>
                    </div>
                    <span className="pts-cat-score">
                      <strong>{fmt(summary.points)}</strong>
                      <small>/ {fmt(summary.max_points)}</small>
                    </span>
                  </header>

                  <div className="pts-metrics">
                    {metrics.map((metric) => {
                      const def = METRIC_BY_KEY[metric.key];
                      const rule = rules.find((entry) => entry.key === metric.key);
                      const isEditing = editing === metric.key;
                      return (
                        <div key={metric.key} className={`pts-metric${metric.enabled ? "" : " off"}`}>
                          <div className="pts-metric-main">
                            <div className="pts-metric-copy">
                              <strong>{def.labelAr}</strong>
                              <span>{def.sourceAr}</span>
                            </div>
                            <span className="pts-metric-raw">{rawLabel(metric.kind, metric.value, metric.total, def.unitAr)}</span>
                            <span className="pts-metric-bar"><i style={{ width: `${Math.round(metric.progress * 100)}%`, background: category.color }} /></span>
                            <span className={`pts-metric-points${metric.adjusted ? " tweaked" : ""}`}>
                              {fmt(metric.points)}<small>/{fmt(rule?.max_points ?? metric.max_points)}</small>
                            </span>
                            {!viewOnly && (
                              <button
                                className="pts-metric-edit"
                                onClick={() => onEdit(isEditing ? null : metric.key)}
                                title="تعديل نقاط هذا البند"
                              >
                                <Pencil size={12} />
                              </button>
                            )}
                          </div>

                          {metric.adjusted && !isEditing && (
                            <p className="pts-metric-note">
                              تعديل يدوي — المحتسب آليًا {fmt(metric.computed_points)}
                              {metric.adjustment?.note ? ` · ${metric.adjustment.note}` : ""}
                            </p>
                          )}

                          {isEditing && (
                            <AdjustEditor
                              max={rule?.max_points ?? metric.max_points}
                              computed={metric.computed_points}
                              current={metric.adjustment}
                              onCancel={() => onEdit(null)}
                              onSave={(next) => onSaveAdjustment(metric.key, next)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function rawLabel(kind: string, value: number, total: number, unit: string) {
  if (kind === "FLAG") return value > 0 ? "مُستوفى" : "غير مُستوفى";
  if (kind === "RATIO") {
    if (total <= 0) return "لا يوجد نشاط متاح";
    return `${fmt(value)} من ${fmt(total)} ${unit}`.trim();
  }
  return `${fmt(value)} ${unit}`.trim();
}

/* ─────────────────────── Manual corrections ─────────────────────── */

function AdjustEditor({
  max, computed, current, onCancel, onSave,
}: {
  max: number;
  computed: number;
  current: MetricAdjustment | null;
  onCancel: () => void;
  onSave: (next: MetricAdjustment | null) => void;
}) {
  const [override, setOverride] = useState(
    current?.override_points === null || current?.override_points === undefined
      ? ""
      : String(current.override_points),
  );
  const [bonus, setBonus] = useState(String(current?.bonus_points ?? 0));
  const [note, setNote] = useState(current?.note ?? "");

  return (
    <div className="pts-editor" onClick={(event) => event.stopPropagation()}>
      <label>
        <span>استبدال النقاط</span>
        <input
          type="number" step="0.5" min={0} max={max}
          value={override}
          placeholder={`آليًا ${fmt(computed)}`}
          onChange={(event) => setOverride(event.target.value)}
        />
      </label>
      <label>
        <span>إضافة / خصم</span>
        <input type="number" step="0.5" value={bonus} onChange={(event) => setBonus(event.target.value)} />
      </label>
      <label className="pts-editor-note">
        <span>السبب</span>
        <input value={note} maxLength={200} placeholder="سبب التعديل (يظهر في التفصيل)" onChange={(event) => setNote(event.target.value)} />
      </label>
      <div className="pts-editor-actions">
        <button
          className="pts-btn primary"
          onClick={() => onSave({
            override_points: override.trim() === "" ? null : Number(override),
            bonus_points: Number(bonus) || 0,
            note: note.trim() || null,
          })}
        >
          <Check size={13} /> حفظ
        </button>
        {current && (
          <button className="pts-btn ghost" onClick={() => onSave(null)}>
            <RotateCcw size={13} /> إلغاء التعديل
          </button>
        )}
        <button className="pts-btn ghost" onClick={onCancel}>تراجع</button>
        <span className="pts-editor-hint">الحد الأقصى لهذا البند {fmt(max)} نقطة.</span>
      </div>
    </div>
  );
}

function OverallEditor({
  row, viewOnly, editing, onEdit, onSave,
}: {
  row: Ranked;
  viewOnly: boolean;
  editing: boolean;
  onEdit: (on: boolean) => void;
  onSave: (next: MetricAdjustment | null) => void;
}) {
  return (
    <div className="pts-overall">
      <div className="pts-overall-figure">
        <span>مجموع البنود</span>
        <strong>{fmt(row.score.subtotal)}</strong>
      </div>
      <div className="pts-overall-figure final">
        <span>الرصيد النهائي</span>
        <strong>{fmt(row.score.total)}</strong>
      </div>
      {!viewOnly && (
        <button className="pts-btn ghost" onClick={() => onEdit(!editing)}>
          <Pencil size={12} /> تعديل المجموع
        </button>
      )}
      {editing && (
        <AdjustEditor
          max={row.score.max_total}
          computed={row.score.subtotal}
          current={row.score.overall_adjustment}
          onCancel={() => onEdit(false)}
          onSave={onSave}
        />
      )}
    </div>
  );
}

/* ─────────────────────── Distribution editor ─────────────────────── */

function TemplatesEditor({
  templates, selected, onSelect, rules, onChangeRules, onSave, dirty, saving, savedAt, total, viewOnly, preview, busy,
  renaming, renameValue, onStartRename, onCancelRename, onRenameValueChange, onCommitRename,
  creatingNew, newTemplateName, onStartCreate, onCancelCreate, onNewTemplateNameChange, onCommitCreate,
  onDuplicate, onActivate, onDelete,
}: {
  templates: ApiTemplate[];
  selected: ApiTemplate | null;
  onSelect: (id: string | null) => void;
  rules: PointsRule[];
  onChangeRules: (next: PointsRule[]) => void;
  onSave: () => void;
  dirty: boolean;
  saving: boolean;
  savedAt: number | null;
  total: number;
  viewOnly: boolean;
  preview: Ranked[];
  busy: string | null;
  renaming: boolean;
  renameValue: string;
  onStartRename: () => void;
  onCancelRename: () => void;
  onRenameValueChange: (value: string) => void;
  onCommitRename: () => void;
  creatingNew: boolean;
  newTemplateName: string;
  onStartCreate: () => void;
  onCancelCreate: () => void;
  onNewTemplateNameChange: (value: string) => void;
  onCommitCreate: () => void;
  onDuplicate: (id: string | null) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const patch = (key: MetricKey, changes: Partial<PointsRule>) => {
    onChangeRules(rules.map((rule) => (rule.key === key ? { ...rule, ...changes } : rule)));
  };

  const off = total !== 100;

  return (
    <div className="pts-rules">
      <header className="pts-rules-head">
        <div>
          <h2>قوالب التوزيع</h2>
          <p>
            احتفظ بأكثر من توزيع نقاط — جرّب أوزانًا مختلفة، أو استورد التوزيع الحالي كنسخة وعدّل عليها،
            دون المساس بالتوزيع المُعتمد فعليًا. القالب <b>النشط</b> فقط هو ما يحسم لوحة الصدارة والفائزين.
          </p>
        </div>
        <div className={`pts-rules-total${off ? " off" : ""}`}>
          <strong>{fmt(total)}</strong>
          <span>مجموع القالب</span>
          {off && <em>لا يساوي 100</em>}
        </div>
      </header>

      {/* ── Template switcher ── */}
      <section className="pts-templates">
        <div className="pts-template-list">
          {templates.map((template) => {
            const isSelected = template.id === selected?.id || (template.id === null && selected?.id === null);
            const key = template.id ?? "__default__";
            return (
              <div key={key} className={`pts-template-chip${isSelected ? " selected" : ""}${template.is_active ? " active" : ""}`}>
                <button className="pts-template-chip-main" onClick={() => onSelect(template.id)}>
                  {template.is_active && <Star size={12} className="pts-template-star" />}
                  <span>{template.name}</span>
                  {!template.id && <em>غير محفوظ</em>}
                </button>
                {!viewOnly && (
                  <div className="pts-template-chip-actions">
                    {!template.is_active && template.id && (
                      <button
                        title="اجعله القالب النشط"
                        disabled={busy === `activate:${template.id}`}
                        onClick={() => onActivate(template.id!)}
                      >
                        <Star size={12} />
                      </button>
                    )}
                    <button
                      title="استيراد كنسخة جديدة"
                      disabled={!template.id || busy === `duplicate:${template.id}`}
                      onClick={() => onDuplicate(template.id)}
                    >
                      <Copy size={12} />
                    </button>
                    {!template.is_active && template.id && templates.length > 1 && (
                      <button
                        title="حذف"
                        className="danger"
                        disabled={busy === `delete:${template.id}`}
                        onClick={() => onDelete(template.id!)}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!viewOnly && !creatingNew && (
            <button className="pts-template-add" onClick={onStartCreate}>
              <Plus size={13} /> قالب جديد
            </button>
          )}
          {!viewOnly && creatingNew && (
            <div className="pts-template-new">
              <input
                autoFocus
                value={newTemplateName}
                placeholder="اسم القالب الجديد"
                maxLength={80}
                onChange={(event) => onNewTemplateNameChange(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") onCommitCreate(); if (event.key === "Escape") onCancelCreate(); }}
              />
              <button className="pts-btn primary" onClick={onCommitCreate}><Check size={12} /></button>
              <button className="pts-btn ghost" onClick={onCancelCreate}><X size={12} /></button>
            </div>
          )}
        </div>

        {selected && (
          <div className="pts-template-current">
            {renaming ? (
              <div className="pts-template-rename">
                <input
                  autoFocus
                  value={renameValue}
                  maxLength={80}
                  onChange={(event) => onRenameValueChange(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") onCommitRename(); if (event.key === "Escape") onCancelRename(); }}
                />
                <button className="pts-btn primary" onClick={onCommitRename}><Check size={12} /> حفظ الاسم</button>
                <button className="pts-btn ghost" onClick={onCancelRename}>إلغاء</button>
              </div>
            ) : (
              <>
                <span>القالب الحالي: <strong>{selected.name}</strong>{selected.is_active && <em className="pts-template-active-flag">نشط الآن</em>}</span>
                {!viewOnly && (
                  <button className="pts-btn ghost" onClick={onStartRename}><Pencil size={12} /> إعادة تسمية</button>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <div className="pts-rules-actions">
        {!viewOnly && (
          <>
            <button className="pts-btn primary" onClick={onSave} disabled={!dirty || saving}>
              <Save size={13} /> {saving ? "جارٍ الحفظ…" : "حفظ القالب"}
            </button>
            {selected && !selected.is_active && selected.id && (
              <button
                className="pts-btn ghost"
                disabled={busy === `activate:${selected.id}`}
                onClick={() => onActivate(selected.id!)}
              >
                <Star size={13} /> اجعله النشط
              </button>
            )}
          </>
        )}
        {viewOnly && <span className="pts-editor-hint">حسابك للعرض فقط — التعديل غير متاح.</span>}
        {dirty && <span className="pts-flag">تغييرات غير محفوظة</span>}
        {!dirty && savedAt && <span className="pts-saved"><Check size={12} /> تم الحفظ</span>}
      </div>

      {preview.length > 0 && (
        <section className="pts-preview">
          <h3>معاينة: أثر هذا القالب على المقدمة (لن يُطبَّق إلا إذا كان نشطًا)</h3>
          <div className="pts-preview-list">
            {preview.map((row) => (
              <div key={row.teacher_id} className="pts-preview-row">
                <span className={`pts-rank tier-${rankTier(row.rank)}`}>{row.rank}</span>
                <strong>{row.full_name}</strong>
                <span className="pts-preview-bar"><i style={{ width: `${row.score.percent}%` }} /></span>
                <span className="pts-preview-score">{fmt(row.score.total)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {CATEGORY_DEFS.map((category) => {
        const own = rules.filter((rule) => METRIC_BY_KEY[rule.key].category === category.key);
        const sum = own.reduce((acc, rule) => acc + (rule.enabled ? rule.max_points : 0), 0);
        return (
          <section key={category.key} className="pts-rule-cat">
            <header style={{ borderColor: category.color }}>
              <span className="pts-cat-index" style={{ background: category.color }}>{category.index}</span>
              <div>
                <h3>{category.labelAr}</h3>
                <p>{category.descAr}</p>
              </div>
              <span className="pts-cat-score"><strong>{fmt(sum)}</strong><small>نقطة</small></span>
            </header>

            <div className="pts-rule-list">
              {own.map((rule) => {
                const def = METRIC_BY_KEY[rule.key];
                return (
                  <div key={rule.key} className={`pts-rule${rule.enabled ? "" : " off"}`}>
                    <label className="pts-switch" title={rule.enabled ? "بند مُفعّل" : "بند موقوف"}>
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        disabled={viewOnly}
                        onChange={(event) => patch(rule.key, { enabled: event.target.checked })}
                      />
                      <i />
                    </label>

                    <div className="pts-rule-copy">
                      <strong>{def.labelAr}</strong>
                      <p>{def.descAr}</p>
                      <span className="pts-rule-source">{def.sourceAr}</span>
                    </div>

                    <div className="pts-rule-fields">
                      <label>
                        <span>النقاط القصوى</span>
                        <input
                          type="number" min={0} max={100} step="0.5"
                          value={rule.max_points}
                          disabled={viewOnly}
                          onChange={(event) => patch(rule.key, { max_points: Number(event.target.value) || 0 })}
                        />
                      </label>
                      {def.kind === "UNIT" && (
                        <label>
                          <span>نقطة لكل {def.unitAr || "وحدة"}</span>
                          <input
                            type="number" min={0} max={100} step="0.25"
                            value={rule.points_per_unit}
                            disabled={viewOnly}
                            onChange={(event) => patch(rule.key, { points_per_unit: Number(event.target.value) || 0 })}
                          />
                        </label>
                      )}
                      {def.kind === "RATIO" && (
                        <label>
                          <span>الحد المطلوب</span>
                          <input
                            type="number" min={0} step="1"
                            value={rule.target > 0 ? rule.target : ""}
                            placeholder="تلقائي"
                            disabled={viewOnly}
                            onChange={(event) => patch(rule.key, { target: Number(event.target.value) || 0 })}
                          />
                        </label>
                      )}
                      <span className="pts-rule-kind">
                        {def.kind === "FLAG" ? "بند مُستوفى / غير مُستوفى"
                          : def.kind === "UNIT" ? `يُحتسب بالعدد · حتى ${fmt(rule.max_points)}`
                          : rule.target > 0 ? `نسبة من ${fmt(rule.target)} ${def.unitAr}` : "نسبة تُحسب من بيانات المشرف"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── Styles ─────────────────────────── */

function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');

      .pts-page { font-family: 'Cairo', sans-serif; color: #32101A; padding-bottom: 40px; }
      .pts-page *, .pts-page *::before, .pts-page *::after { box-sizing: border-box; }

      /* ── Hero ── */
      .pts-hero { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between;
        gap: 18px; flex-wrap: wrap; padding: 26px 26px 24px; border-radius: 22px; margin-bottom: 16px;
        background: linear-gradient(135deg,#32101A 0%,#4A0E1C 48%,#6B1E2D 100%); color: #F7F3EB;
        border: 1px solid rgba(184,160,130,0.34); }
      .pts-hero-glow { position: absolute; inset-inline-end: -60px; top: -80px; width: 300px; height: 300px; border-radius: 50%;
        background: radial-gradient(circle, rgba(217,201,176,0.30), transparent 68%); pointer-events: none; }
      .pts-hero-copy { position: relative; max-width: 640px; }
      .pts-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 800; letter-spacing: .04em;
        color: #D9C9B0; background: rgba(217,201,176,0.13); border: 1px solid rgba(217,201,176,0.26);
        padding: 4px 11px; border-radius: 99px; margin-bottom: 10px; }
      .pts-title { font-size: 32px; font-weight: 900; margin: 0 0 8px; letter-spacing: -.01em; }
      .pts-sub { font-size: 13.5px; line-height: 1.95; color: rgba(247,243,235,0.82); margin: 0; }
      .pts-prize { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; text-align: center;
        min-width: 168px; padding: 16px 20px; border-radius: 18px; color: #32101A;
        background: linear-gradient(160deg,#E5E0D5,#B8A082); border: 1px solid rgba(255,251,245,0.4);
        box-shadow: 0 14px 30px rgba(26,26,26,0.28); }
      .pts-prize strong { font-size: 15px; font-weight: 900; }
      .pts-prize span { font-size: 12px; font-weight: 800; color: #6B1E2D; }

      .pts-error { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
        background: rgba(107,30,45,0.08); border: 1px solid rgba(107,30,45,0.24); color: #6B1E2D;
        border-radius: 12px; padding: 11px 15px; font-size: 12.5px; font-weight: 700; margin-bottom: 14px; }
      .pts-error button { background: #6B1E2D; color: #FFFBF5; border: none; border-radius: 8px; padding: 6px 13px;
        font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }

      /* ── Stat strip ── */
      .pts-stats { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin-bottom: 16px; }
      .pts-stat { display: flex; flex-direction: column; align-items: center; gap: 3px; text-align: center;
        background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 15px; padding: 15px 10px; }
      .pts-stat-icon { color: #8F765B; display: inline-flex; }
      .pts-stat strong { font-size: 25px; font-weight: 900; color: #32101A; font-variant-numeric: tabular-nums; line-height: 1.15; }
      .pts-stat-label { font-size: 11px; font-weight: 800; color: #796A62; }
      .pts-stat.highlight { background: linear-gradient(160deg,#FFFBF5,#EFEAE0); border-color: rgba(184,160,130,0.55); }
      .pts-stat.highlight strong { color: #6B1E2D; }

      /* ── Tabs ── */
      .pts-tabs { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
      .pts-tabs button { display: inline-flex; align-items: center; gap: 6px; background: #FFFBF5; color: #6B1E2D;
        border: 1.5px solid rgba(194,160,89,0.32); border-radius: 99px; padding: 8px 17px;
        font-family: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer; transition: .18s; }
      .pts-tabs button:hover { border-color: #B8A082; }
      .pts-tabs button.active { background: linear-gradient(180deg,#5B1526,#32101A); color: #D9C9B0; border-color: transparent; }
      .pts-tabs-flag, .pts-flag { font-size: 10.5px; font-weight: 800; color: #6B1E2D; background: rgba(194,160,89,0.2);
        border-radius: 99px; padding: 4px 10px; }
      .pts-saved { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 800; color: #1B5E20; }

      /* ── Podium ── */
      .pts-podium { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; align-items: end; margin-bottom: 16px; }
      .pts-podium-empty { min-height: 40px; }
      .pts-podium-card { position: relative; display: flex; flex-direction: column; align-items: center; gap: 7px; text-align: center;
        background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 18px; padding: 20px 14px 16px; }
      .pts-podium-card.place-1 { background: linear-gradient(170deg,#FFFBF5,#EFEAE0); border-color: rgba(184,160,130,0.7);
        box-shadow: 0 12px 30px rgba(107,30,45,0.13); padding-top: 26px; }
      .pts-podium-card h3 { margin: 0; font-size: 14px; font-weight: 900; color: #32101A; }
      .pts-podium-card p { margin: 0; font-size: 11px; font-weight: 700; color: #8C8274; }
      .pts-podium-medal { position: absolute; top: -1px; inset-inline-start: 14px; display: inline-flex; align-items: center; gap: 4px;
        font-size: 11.5px; font-weight: 900; padding: 5px 11px; border-radius: 0 0 11px 11px; color: #FFFBF5; background: #8C8274; }
      .pts-podium-card.tier-gold .pts-podium-medal { background: linear-gradient(180deg,#B8A082,#8F765B); color: #32101A; }
      .pts-podium-card.tier-silver .pts-podium-medal { background: linear-gradient(180deg,#E5E0D5,#B8A082); color: #32101A; }
      .pts-podium-card.tier-bronze .pts-podium-medal { background: linear-gradient(180deg,#8F765B,#6B1E2D); }
      .pts-podium-ring { position: relative; display: grid; place-items: center; }
      .pts-podium-score { position: absolute; font-size: 20px; font-weight: 900; color: #6B1E2D; font-variant-numeric: tabular-nums; }
      .pts-podium-bars { display: flex; align-items: flex-end; gap: 4px; height: 30px; margin-top: 4px; }
      .pts-podium-bar { display: flex; align-items: flex-end; width: 8px; height: 100%; border-radius: 4px;
        background: rgba(184,160,130,0.18); overflow: hidden; }
      .pts-podium-bar i { display: block; width: 100%; border-radius: 4px; min-height: 2px; }

      .pts-avatar { border-radius: 50%; object-fit: cover; border: 2px solid rgba(184,160,130,0.5); }
      .pts-avatar-text { display: inline-grid; place-items: center; background: linear-gradient(160deg,#EFEAE0,#D9C9B0);
        color: #6B1E2D; font-weight: 900; flex-shrink: 0; }

      /* ── Toolbar ── */
      .pts-toolbar { background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 16px;
        padding: 14px; display: flex; flex-direction: column; gap: 11px; margin-bottom: 14px; }
      .pts-search { display: flex; align-items: center; gap: 8px; background: #FFF; border: 1.5px solid rgba(194,160,89,0.32);
        border-radius: 11px; padding: 0 12px; color: #8F765B; }
      .pts-search input { flex: 1; border: none; outline: none; background: none; font-family: inherit; font-size: 13.5px;
        padding: 10px 0; color: #32101A; }
      .pts-search button { background: none; border: none; color: #8C8274; cursor: pointer; display: inline-flex; padding: 4px; }
      .pts-selects { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 9px; }
      .pts-selects label { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
      .pts-selects span { font-size: 10.5px; font-weight: 800; color: #796A62; }
      .pts-selects select { width: 100%; background: #FFF; border: 1.5px solid rgba(194,160,89,0.32); border-radius: 10px;
        padding: 8px 10px; font-family: inherit; font-size: 12.5px; font-weight: 700; color: #4A0E1C; outline: none; }
      .pts-toolbar-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .pts-chip { display: inline-flex; align-items: center; gap: 5px; background: #FFF; border: 1.5px solid rgba(194,160,89,0.32);
        color: #6B1E2D; border-radius: 99px; padding: 7px 13px; font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
      .pts-chip.on { background: linear-gradient(180deg,#5B1526,#32101A); color: #D9C9B0; border-color: transparent; }
      .pts-count { margin-inline-start: auto; font-size: 11.5px; font-weight: 800; color: #8C8274; }

      .pts-legend { display: flex; flex-wrap: wrap; gap: 6px; padding-top: 3px; border-top: 1px dashed rgba(184,160,130,0.4); }
      .pts-legend-item { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: #655B53;
        background: rgba(184,160,130,0.1); border-radius: 99px; padding: 4px 9px; cursor: help; }
      .pts-legend-item i { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
      .pts-legend-item b { font-weight: 900; color: #6B1E2D; font-variant-numeric: tabular-nums; }

      .pts-empty { padding: 60px 20px; text-align: center; background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07);
        border-radius: 16px; color: #8C8274; font-weight: 700; }

      /* ── Board ── */
      .pts-board { background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 16px; overflow: hidden; }
      .pts-board-head, .pts-row { display: grid; grid-template-columns: 54px minmax(180px,1.5fr) minmax(140px,1.1fr) 132px 34px;
        gap: 12px; align-items: center; }
      .pts-board-head { padding: 11px 16px; font-size: 10.5px; font-weight: 800; color: #6B1E2D; letter-spacing: .05em;
        text-transform: uppercase; background: rgba(194,160,89,0.07); border-bottom: 1px solid rgba(194,160,89,0.2); }
      .pts-row-wrap { border-bottom: 1px solid rgba(26,26,26,0.06); }
      .pts-row-wrap:last-child { border-bottom: none; }
      .pts-row-wrap.open { background: linear-gradient(180deg,rgba(239,234,224,0.5),rgba(255,251,245,0.4)); }
      .pts-row { padding: 12px 16px; cursor: pointer; transition: background .16s; }
      .pts-row:hover { background: rgba(194,160,89,0.06); }
      .pts-rank { display: inline-flex; align-items: center; justify-content: center; gap: 3px; min-width: 34px; height: 30px;
        padding: 0 8px; border-radius: 9px; font-size: 13px; font-weight: 900; font-variant-numeric: tabular-nums;
        background: rgba(184,160,130,0.16); color: #6B1E2D; }
      .pts-rank.tier-gold { background: linear-gradient(180deg,#D9C9B0,#B8A082); color: #32101A; }
      .pts-rank.tier-silver { background: linear-gradient(180deg,#EFEAE0,#D9C9B0); color: #4A0E1C; }
      .pts-rank.tier-bronze { background: linear-gradient(180deg,#B8A082,#8F765B); color: #FFFBF5; }
      .pts-rank.tier-top10 { background: rgba(107,30,45,0.1); color: #6B1E2D; }

      .pts-who { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .pts-who strong { display: block; font-size: 13.5px; font-weight: 800; color: #32101A; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; }
      .pts-who-meta { display: block; font-size: 11px; color: #8C8274; font-weight: 700; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; }
      .pts-who-phone { display: inline-flex; align-items: center; gap: 3px; margin-inline-start: 8px; direction: ltr; unicode-bidi: embed; }

      .pts-axes { display: flex; gap: 3px; min-width: 0; }
      .pts-axis { flex: 1; height: 22px; border-radius: 5px; background: rgba(184,160,130,0.16); overflow: hidden;
        display: flex; align-items: stretch; }
      .pts-axis i { display: block; border-radius: 5px; min-width: 2px; opacity: .88; transition: width .4s ease; }

      .pts-total { display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; }
      .pts-total strong { font-size: 20px; font-weight: 900; color: #6B1E2D; font-variant-numeric: tabular-nums; }
      .pts-total small { font-size: 11px; color: #8C8274; font-weight: 700; }
      .pts-total-bar { flex-basis: 100%; height: 5px; border-radius: 99px; background: rgba(184,160,130,0.18); overflow: hidden; }
      .pts-total-bar i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg,#B8A082,#6B1E2D);
        transition: width .45s ease; }
      .pts-caret { display: inline-flex; justify-content: center; color: #8F765B; transition: transform .22s; }
      .pts-caret.open { transform: rotate(180deg); }

      /* ── Detail ── */
      .pts-detail { padding: 4px 16px 20px; }
      .pts-detail-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap;
        padding: 0 0 12px; }
      .pts-detail-head h4 { margin: 0 0 3px; font-size: 14px; font-weight: 900; color: #32101A; }
      .pts-detail-head p { margin: 0; font-size: 11.5px; color: #796A62; line-height: 1.7; max-width: 460px; }

      .pts-overall { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #FFFBF5;
        border: 1px solid rgba(184,160,130,0.4); border-radius: 13px; padding: 10px 14px; }
      .pts-overall-figure { display: flex; flex-direction: column; }
      .pts-overall-figure span { font-size: 10px; font-weight: 800; color: #8C8274; }
      .pts-overall-figure strong { font-size: 17px; font-weight: 900; color: #4A0E1C; font-variant-numeric: tabular-nums; }
      .pts-overall-figure.final strong { color: #6B1E2D; font-size: 21px; }

      .pts-cats { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px,1fr)); gap: 11px; }
      .pts-cat { background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 15px; overflow: hidden; }
      .pts-cat-head { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-bottom: 2px solid;
        background: rgba(239,234,224,0.45); }
      .pts-cat-head h5 { margin: 0 0 2px; font-size: 12.5px; font-weight: 900; color: #32101A; }
      .pts-cat-head p { margin: 0; font-size: 10.5px; color: #796A62; line-height: 1.65; }
      .pts-cat-index { display: inline-grid; place-items: center; min-width: 26px; height: 26px; border-radius: 8px;
        color: #FFFBF5; font-size: 11px; font-weight: 900; flex-shrink: 0; }
      .pts-cat-score { margin-inline-start: auto; text-align: center; white-space: nowrap; }
      .pts-cat-score strong { display: block; font-size: 17px; font-weight: 900; color: #6B1E2D; font-variant-numeric: tabular-nums; }
      .pts-cat-score small { font-size: 10px; color: #8C8274; font-weight: 700; }

      .pts-metrics { display: flex; flex-direction: column; }
      .pts-metric { padding: 10px 14px; border-bottom: 1px solid rgba(26,26,26,0.05); }
      .pts-metric:last-child { border-bottom: none; }
      .pts-metric.off { opacity: .45; }
      .pts-metric-main { display: grid; grid-template-columns: minmax(0,1.4fr) auto minmax(52px,0.7fr) auto auto;
        gap: 9px; align-items: center; }
      .pts-metric-copy strong { display: block; font-size: 12px; font-weight: 800; color: #32101A; }
      .pts-metric-copy span { display: block; font-size: 10px; color: #8C8274; line-height: 1.55; }
      .pts-metric-raw { font-size: 10.5px; font-weight: 800; color: #796A62; white-space: nowrap; }
      .pts-metric-bar { height: 7px; border-radius: 99px; background: rgba(184,160,130,0.18); overflow: hidden; }
      .pts-metric-bar i { display: block; height: 100%; border-radius: 99px; min-width: 2px; transition: width .4s ease; }
      .pts-metric-points { font-size: 13px; font-weight: 900; color: #6B1E2D; font-variant-numeric: tabular-nums; white-space: nowrap; }
      .pts-metric-points small { font-size: 10px; color: #8C8274; font-weight: 700; }
      .pts-metric-points.tweaked { color: #8F765B; text-decoration: underline dotted; }
      .pts-metric-edit { background: rgba(184,160,130,0.16); border: none; border-radius: 7px; padding: 5px;
        color: #6B1E2D; cursor: pointer; display: inline-flex; }
      .pts-metric-edit:hover { background: rgba(184,160,130,0.3); }
      .pts-metric-note { margin: 6px 0 0; font-size: 10.5px; font-weight: 700; color: #8F765B; }

      /* ── Inline editor ── */
      .pts-editor { display: flex; align-items: flex-end; gap: 9px; flex-wrap: wrap; margin-top: 9px; padding: 11px;
        background: rgba(239,234,224,0.7); border: 1px solid rgba(184,160,130,0.42); border-radius: 12px; }
      .pts-editor label { display: flex; flex-direction: column; gap: 3px; }
      .pts-editor label span { font-size: 10px; font-weight: 800; color: #796A62; }
      .pts-editor input { width: 108px; background: #FFF; border: 1.5px solid rgba(194,160,89,0.34); border-radius: 9px;
        padding: 7px 9px; font-family: inherit; font-size: 12.5px; font-weight: 700; color: #32101A; outline: none; }
      .pts-editor input:focus { border-color: #B8A082; }
      .pts-editor-note { flex: 1; min-width: 160px; }
      .pts-editor-note input { width: 100%; }
      .pts-editor-actions { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
      .pts-editor-hint { font-size: 10.5px; font-weight: 700; color: #8C8274; }

      .pts-btn { display: inline-flex; align-items: center; gap: 5px; border-radius: 9px; padding: 8px 14px;
        font-family: inherit; font-size: 12px; font-weight: 800; cursor: pointer; border: 1.5px solid transparent; }
      .pts-btn.primary { background: linear-gradient(180deg,#5B1526,#32101A); color: #D9C9B0; }
      .pts-btn.primary:disabled { opacity: .45; cursor: not-allowed; }
      .pts-btn.ghost { background: #FFF; border-color: rgba(194,160,89,0.36); color: #6B1E2D; }
      .pts-btn.ghost:disabled { opacity: .45; cursor: not-allowed; }

      /* ── Distribution editor ── */
      .pts-rules { display: flex; flex-direction: column; gap: 13px; }
      .pts-rules-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
        background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 16px; padding: 17px 18px; }
      .pts-rules-head h2 { margin: 0 0 5px; font-size: 18px; font-weight: 900; color: #32101A; }
      .pts-rules-head p { margin: 0; font-size: 12.5px; color: #796A62; line-height: 1.85; max-width: 620px; }
      .pts-rules-total { text-align: center; min-width: 128px; padding: 12px 16px; border-radius: 14px;
        background: linear-gradient(160deg,#EFEAE0,#D9C9B0); border: 1px solid rgba(184,160,130,0.5); }
      .pts-rules-total strong { display: block; font-size: 27px; font-weight: 900; color: #4A0E1C; font-variant-numeric: tabular-nums; }
      .pts-rules-total span { font-size: 10.5px; font-weight: 800; color: #6B1E2D; }
      .pts-rules-total.off { background: linear-gradient(160deg,#EFEAE0,#B8A082); }
      .pts-rules-total em { display: block; margin-top: 3px; font-size: 10px; font-weight: 800; color: #6B1E2D; font-style: normal; }
      .pts-rules-head p b { color: #6B1E2D; }

      /* ── Template switcher ── */
      .pts-templates { display: flex; flex-direction: column; gap: 10px; background: #FFFBF5;
        border: 1px solid rgba(26,26,26,0.07); border-radius: 16px; padding: 14px 16px; }
      .pts-template-list { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      .pts-template-chip { display: inline-flex; align-items: stretch; border-radius: 11px; overflow: hidden;
        border: 1.5px solid rgba(194,160,89,0.32); background: #FFF; }
      .pts-template-chip.selected { border-color: #6B1E2D; box-shadow: 0 0 0 2px rgba(107,30,45,0.12); }
      .pts-template-chip.active { border-color: #B8A082; }
      .pts-template-chip-main { display: inline-flex; align-items: center; gap: 5px; background: none; border: none;
        padding: 8px 12px; font-family: inherit; font-size: 12.5px; font-weight: 800; color: #4A0E1C; cursor: pointer; }
      .pts-template-chip.selected .pts-template-chip-main { color: #6B1E2D; }
      .pts-template-star { color: #B8892E; fill: #E9C874; }
      .pts-template-chip-main em { font-style: normal; font-size: 10px; font-weight: 700; color: #8C8274;
        background: rgba(140,130,116,0.14); border-radius: 99px; padding: 1px 7px; }
      .pts-template-chip-actions { display: flex; align-items: center; gap: 1px; padding-inline-end: 5px; border-inline-start: 1px solid rgba(26,26,26,0.06); }
      .pts-template-chip-actions button { background: none; border: none; color: #8F765B; cursor: pointer;
        display: inline-flex; padding: 6px; border-radius: 7px; }
      .pts-template-chip-actions button:hover { background: rgba(184,160,130,0.16); }
      .pts-template-chip-actions button:disabled { opacity: .4; cursor: not-allowed; }
      .pts-template-chip-actions button.danger:hover { background: rgba(107,30,45,0.12); color: #6B1E2D; }
      .pts-template-add { display: inline-flex; align-items: center; gap: 5px; background: none; border: 1.5px dashed rgba(184,160,130,0.5);
        color: #6B1E2D; border-radius: 11px; padding: 8px 13px; font-family: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer; }
      .pts-template-add:hover { background: rgba(184,160,130,0.08); }
      .pts-template-new { display: inline-flex; align-items: center; gap: 6px; }
      .pts-template-new input { background: #FFF; border: 1.5px solid rgba(194,160,89,0.34); border-radius: 9px;
        padding: 7px 10px; font-family: inherit; font-size: 12.5px; font-weight: 700; color: #32101A; outline: none; width: 180px; }
      .pts-template-current { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding-top: 9px;
        border-top: 1px dashed rgba(184,160,130,0.35); font-size: 12px; font-weight: 700; color: #655B53; }
      .pts-template-current strong { color: #32101A; }
      .pts-template-active-flag { font-style: normal; margin-inline-start: 7px; font-size: 10px; font-weight: 800; color: #1B5E20;
        background: rgba(27,94,32,0.12); border-radius: 99px; padding: 2px 8px; }
      .pts-template-rename { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
      .pts-template-rename input { background: #FFF; border: 1.5px solid rgba(194,160,89,0.34); border-radius: 9px;
        padding: 7px 10px; font-family: inherit; font-size: 12.5px; font-weight: 700; color: #32101A; outline: none; width: 220px; }

      .pts-rules-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

      .pts-preview { background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 16px; padding: 15px 17px; }
      .pts-preview h3 { margin: 0 0 11px; font-size: 12.5px; font-weight: 900; color: #32101A; }
      .pts-preview-list { display: flex; flex-direction: column; gap: 8px; }
      .pts-preview-row { display: grid; grid-template-columns: 40px minmax(0,1fr) minmax(80px,2fr) 52px; gap: 10px; align-items: center; }
      .pts-preview-row strong { font-size: 12.5px; font-weight: 800; color: #4A0E1C; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; }
      .pts-preview-bar { height: 8px; border-radius: 99px; background: rgba(184,160,130,0.16); overflow: hidden; }
      .pts-preview-bar i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg,#B8A082,#6B1E2D);
        transition: width .45s ease; }
      .pts-preview-score { font-size: 13.5px; font-weight: 900; color: #6B1E2D; text-align: center; font-variant-numeric: tabular-nums; }

      .pts-rule-cat { background: #FFFBF5; border: 1px solid rgba(26,26,26,0.07); border-radius: 16px; overflow: hidden; }
      .pts-rule-cat > header { display: flex; align-items: flex-start; gap: 11px; padding: 14px 16px; border-bottom: 2px solid;
        background: rgba(239,234,224,0.45); }
      .pts-rule-cat h3 { margin: 0 0 3px; font-size: 13.5px; font-weight: 900; color: #32101A; }
      .pts-rule-cat header p { margin: 0; font-size: 11px; color: #796A62; line-height: 1.7; max-width: 620px; }
      .pts-rule-list { display: flex; flex-direction: column; }
      .pts-rule { display: grid; grid-template-columns: 42px minmax(0,1.35fr) minmax(0,1fr); gap: 12px; align-items: start;
        padding: 14px 16px; border-bottom: 1px solid rgba(26,26,26,0.05); }
      .pts-rule:last-child { border-bottom: none; }
      .pts-rule.off { opacity: .5; }
      .pts-rule-copy strong { display: block; font-size: 12.5px; font-weight: 800; color: #32101A; margin-bottom: 3px; }
      .pts-rule-copy p { margin: 0 0 4px; font-size: 11px; color: #655B53; line-height: 1.7; }
      .pts-rule-source { font-size: 10px; font-weight: 700; color: #8C8274; background: rgba(184,160,130,0.14);
        border-radius: 6px; padding: 3px 7px; display: inline-block; }
      .pts-rule-fields { display: flex; align-items: flex-end; gap: 9px; flex-wrap: wrap; }
      .pts-rule-fields label { display: flex; flex-direction: column; gap: 3px; }
      .pts-rule-fields span { font-size: 10px; font-weight: 800; color: #796A62; }
      .pts-rule-fields input { width: 96px; background: #FFF; border: 1.5px solid rgba(194,160,89,0.32); border-radius: 9px;
        padding: 7px 9px; font-family: inherit; font-size: 12.5px; font-weight: 800; color: #32101A; outline: none;
        font-variant-numeric: tabular-nums; }
      .pts-rule-fields input:focus { border-color: #B8A082; }
      .pts-rule-kind { flex-basis: 100%; font-size: 10px; font-weight: 700; color: #8C8274; }

      .pts-switch { position: relative; display: inline-flex; width: 38px; height: 21px; cursor: pointer; }
      .pts-switch input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
      .pts-switch i { position: absolute; inset: 0; border-radius: 99px; background: rgba(140,130,116,0.3); transition: .2s; }
      .pts-switch i::before { content: ""; position: absolute; top: 3px; inset-inline-start: 3px; width: 15px; height: 15px;
        border-radius: 50%; background: #FFFBF5; transition: .2s; }
      .pts-switch input:checked + i { background: #6B1E2D; }
      .pts-switch input:checked + i::before { transform: translateX(-17px); }
      .pts-switch input:disabled + i { opacity: .5; cursor: not-allowed; }

      /* ── Responsive ── */
      @media (max-width: 1024px) {
        .pts-cats { grid-template-columns: 1fr; }
        .pts-rule { grid-template-columns: 42px minmax(0,1fr); }
        .pts-rule-fields { grid-column: 1 / -1; }
      }
      @media (max-width: 860px) {
        .pts-stats { grid-template-columns: 1fr 1fr; }
        .pts-selects { grid-template-columns: 1fr 1fr; }
        .pts-board-head { display: none; }
        .pts-row { grid-template-columns: 44px minmax(0,1fr) auto; grid-template-areas: "rank who caret" "axes axes axes" "total total total";
          row-gap: 9px; }
        .pts-rank { grid-area: rank; }
        .pts-who { grid-area: who; }
        .pts-axes { grid-area: axes; }
        .pts-total { grid-area: total; }
        .pts-caret { grid-area: caret; }
        .pts-metric-main { grid-template-columns: minmax(0,1fr) auto auto; }
        .pts-metric-bar { grid-column: 1 / -1; }
      }
      @media (max-width: 560px) {
        .pts-title { font-size: 25px; }
        .pts-hero { padding: 20px 18px; }
        .pts-podium { grid-template-columns: 1fr; }
        .pts-selects { grid-template-columns: 1fr; }
        .pts-editor input { width: 100%; }
        .pts-editor label { flex: 1; min-width: 120px; }
      }

      /* ── Confirm modal ── */
      .pts-confirm-overlay { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center;
        justify-content: center; padding: 18px; background: rgba(11,11,12,0.55);
        backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
      .pts-confirm-card { max-width: 420px; width: 100%; background: linear-gradient(160deg,#FFFBF5,#F7F3EB);
        border: 1.5px solid rgba(107,30,45,0.4); border-radius: 20px; padding: 26px 24px 20px; text-align: center;
        display: flex; flex-direction: column; align-items: center; gap: 7px;
        box-shadow: 0 28px 72px rgba(80,60,20,0.32); }
      .pts-confirm-icon { width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center;
        justify-content: center; margin-bottom: 4px; color: #6B1E2D; background: rgba(107,30,45,0.1); }
      .pts-confirm-card h3 { margin: 0; font-size: 19px; font-weight: 900; color: #6B1E2D; }
      .pts-confirm-card p { margin: 4px 0 0; font-size: 13px; font-weight: 600; color: #5A4A30; line-height: 1.75; max-width: 340px; }
      .pts-confirm-irrev { font-size: 11.5px !important; font-weight: 800 !important; margin-top: 4px !important;
        padding: 5px 12px; border-radius: 99px; background: rgba(107,30,45,0.1); color: #6B1E2D !important; }
      .pts-confirm-actions { display: flex; gap: 9px; margin-top: 14px; width: 100%; }
      .pts-confirm-actions .pts-btn { flex: 1; justify-content: center; min-height: 42px; }
      .pts-confirm-danger { flex: 1; min-height: 42px; border: 1px solid rgba(255,200,170,0.45); border-radius: 9px;
        background: linear-gradient(135deg,#8E2424,#6B1E2D); color: #FFE9D6; font-family: inherit; font-size: 12.5px;
        font-weight: 800; cursor: pointer; }
      .pts-confirm-danger:hover { background: linear-gradient(135deg,#9C2A2A,#882323); }
    `}</style>
  );
}
