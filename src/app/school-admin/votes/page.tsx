"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useViewOnly } from "@/lib/view-only-context";
import { useConfirm } from "@/lib/confirm-dialog";
import MandalaLoader from "@/components/MandalaLoader";
import {
  ListChecks, Plus, X, Search, SlidersHorizontal, Trash2, Pencil,
  Lock, Unlock, Users, CheckCircle2, Download, LoaderCircle, Sparkles,
  MessageSquareText, GripVertical,
} from "lucide-react";

// ── Types ──
type VoteOption = { value: string; label: string };
type VoteQuestion = { id: string; position: number; prompt: string; options: VoteOption[] };
type Answer = { question_id: string; value: string };
type VoteResponseRow = {
  id: string;
  submitted_at: string;
  notes: string | null;
  answers: Answer[];
  teacher: { id: string; profile: { full_name: string; email: string | null } | null };
};
type VoteRow = {
  id: string;
  title: string;
  description: string | null;
  status: "OPEN" | "CLOSED";
  allow_notes: boolean;
  created_at: string;
  closed_at: string | null;
  questions: VoteQuestion[];
  _count: { responses: number };
};
type VoteDetail = VoteRow & { responses: VoteResponseRow[] };

type DraftOption = { label: string };
type DraftQuestion = { prompt: string; options: DraftOption[] };
type Draft = { title: string; description: string; allow_notes: boolean; questions: DraftQuestion[] };

const EMPTY_DRAFT: Draft = {
  title: "", description: "", allow_notes: true,
  questions: [{ prompt: "", options: [{ label: "" }, { label: "" }] }],
};

function emptyQuestion(): DraftQuestion {
  return { prompt: "", options: [{ label: "" }, { label: "" }] };
}

export default function VotesPage() {
  const viewOnly = useViewOnly();
  const confirm = useConfirm();

  const [list, setList] = useState<VoteRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<VoteDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [eligibleTeachers, setEligibleTeachers] = useState(0);

  const [query, setQuery] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [responseSearch, setResponseSearch] = useState("");

  const [dlg, setDlg] = useState<{ mode: "create" | "edit" } | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [dlgError, setDlgError] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await fetch("/api/school-admin/votes", { cache: "no-store" });
      const d = await r.json();
      const votes: VoteRow[] = d?.votes ?? [];
      setList(votes);
      setEligibleTeachers(d?.eligible_teachers ?? 0);
      setSelectedId((current) => current ?? votes[0]?.id ?? null);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const r = await fetch(`/api/school-admin/votes/${id}`, { cache: "no-store" });
      if (!r.ok) { setDetail(null); return; }
      const d = await r.json();
      setDetail(d?.vote ?? null);
      setEligibleTeachers(d?.eligible_teachers ?? 0);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => { void loadList(); }, [loadList]);
  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
    setResponseSearch("");
  }, [selectedId, loadDetail]);
  useEffect(() => {
    if (!dlg) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [dlg]);

  const filteredList = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return list.filter((v) => {
      if (fStatus && v.status !== fStatus) return false;
      if (!needle) return true;
      return v.title.toLowerCase().includes(needle);
    });
  }, [list, query, fStatus]);

  const totals = useMemo(() => ({
    votes: list.length,
    open: list.filter((v) => v.status === "OPEN").length,
    closed: list.filter((v) => v.status === "CLOSED").length,
    responses: list.reduce((sum, v) => sum + v._count.responses, 0),
  }), [list]);

  const hasActiveFilters = Boolean(query.trim() || fStatus);
  const resetFilters = () => { setQuery(""); setFStatus(""); };

  function openCreateDialog() {
    setDraft(EMPTY_DRAFT);
    setDlgError("");
    setDlg({ mode: "create" });
  }
  function openEditDialog() {
    if (!detail) return;
    setDraft({
      title: detail.title,
      description: detail.description ?? "",
      allow_notes: detail.allow_notes,
      questions: detail.questions.length
        ? detail.questions.map((q) => ({ prompt: q.prompt, options: q.options.map((o) => ({ label: o.label })) }))
        : [emptyQuestion()],
    });
    setDlgError("");
    setDlg({ mode: "edit" });
  }
  const editLocked = dlg?.mode === "edit" && (detail?._count.responses ?? 0) > 0;

  function updateQuestion(idx: number, patch: Partial<DraftQuestion>) {
    setDraft((d) => ({ ...d, questions: d.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)) }));
  }
  function addQuestion() {
    setDraft((d) => ({ ...d, questions: [...d.questions, emptyQuestion()] }));
  }
  function removeQuestion(idx: number) {
    setDraft((d) => ({ ...d, questions: d.questions.filter((_, i) => i !== idx) }));
  }
  function updateOption(qIdx: number, oIdx: number, label: string) {
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === oIdx ? { label } : o) } : q),
    }));
  }
  function addOption(qIdx: number) {
    setDraft((d) => ({ ...d, questions: d.questions.map((q, i) => i === qIdx ? { ...q, options: [...q.options, { label: "" }] } : q) }));
  }
  function removeOption(qIdx: number, oIdx: number) {
    setDraft((d) => ({ ...d, questions: d.questions.map((q, i) => i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== oIdx) } : q) }));
  }

  async function submitDialog() {
    const title = draft.title.trim();
    if (!title) { setDlgError("اكتب عنوان التصويت أولاً."); return; }
    let payload: Record<string, unknown> = { title, description: draft.description.trim() || null };
    if (!editLocked) {
      const questions = draft.questions.map((q) => ({ prompt: q.prompt.trim(), options: q.options.map((o) => ({ label: o.label.trim() })).filter((o) => o.label) }));
      if (questions.length === 0 || questions.some((q) => !q.prompt)) { setDlgError("أكمل نص كل سؤال قبل الحفظ."); return; }
      if (questions.some((q) => q.options.length < 2)) { setDlgError("كل سؤال يحتاج خيارين على الأقل."); return; }
      payload = { ...payload, allow_notes: draft.allow_notes, questions };
    }
    setDlgError("");
    setSaving(true);
    try {
      if (dlg?.mode === "create") {
        const r = await fetch("/api/school-admin/votes", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { setDlgError(errorText(d?.error)); return; }
        setDlg(null);
        await loadList();
        setSelectedId(d?.vote?.id ?? null);
      } else if (dlg?.mode === "edit" && selectedId) {
        const r = await fetch(`/api/school-admin/votes/${selectedId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { setDlgError(errorText(d?.error)); return; }
        setDlg(null);
        await loadList();
        await loadDetail(selectedId);
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!detail) return;
    const opening = detail.status === "CLOSED";
    const ok = await confirm({
      title: opening ? "فتح التصويت" : "إغلاق التصويت",
      message: opening
        ? "بعد إعادة الفتح سيظهر التصويت من جديد للمشرفين الذين لم يجيبوا بعد. متابعة؟"
        : "بعد الإغلاق لن يتمكن أي مشرف من إرسال إجابته على هذا التصويت. يمكنك إعادة فتحه لاحقاً في أي وقت.",
      confirmText: opening ? "فتح التصويت" : "إغلاق التصويت",
      cancelText: "إلغاء",
      variant: "normal",
    });
    if (!ok) return;
    await fetch(`/api/school-admin/votes/${detail.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: opening ? "OPEN" : "CLOSED" }),
    });
    await loadList();
    await loadDetail(detail.id);
  }

  async function deleteVote() {
    if (!detail) return;
    const ok = await confirm({
      title: "حذف التصويت نهائياً",
      message: `سيتم حذف تصويت "${detail.title}" مع كل إجاباته نهائياً. هذا الإجراء لا يمكن التراجع عنه.`,
      confirmText: "حذف نهائياً",
      cancelText: "إلغاء",
      variant: "danger",
    });
    if (!ok) return;
    await fetch(`/api/school-admin/votes/${detail.id}`, { method: "DELETE" });
    setSelectedId(null);
    setDetail(null);
    await loadList();
  }

  const visibleResponses = useMemo(() => {
    const needle = responseSearch.trim().toLowerCase();
    if (!needle || !detail) return detail?.responses ?? [];
    return detail.responses.filter((r) =>
      (r.teacher.profile?.full_name ?? "").toLowerCase().includes(needle) ||
      (r.teacher.profile?.email ?? "").toLowerCase().includes(needle));
  }, [detail, responseSearch]);

  const distributions = useMemo(() => {
    if (!detail) return [];
    return detail.questions.map((q) => {
      const counts = new Map<string, number>();
      for (const opt of q.options) counts.set(opt.value, 0);
      for (const response of detail.responses) {
        const answer = response.answers.find((a) => a.question_id === q.id);
        if (answer && counts.has(answer.value)) counts.set(answer.value, (counts.get(answer.value) ?? 0) + 1);
      }
      const total = detail.responses.length;
      return {
        question: q,
        rows: q.options.map((opt) => ({ option: opt, count: counts.get(opt.value) ?? 0, pct: total ? Math.round(((counts.get(opt.value) ?? 0) / total) * 100) : 0 })),
      };
    });
  }, [detail]);

  function answerLabel(question: VoteQuestion, response: VoteResponseRow) {
    const answer = response.answers.find((a) => a.question_id === question.id);
    if (!answer) return "—";
    return question.options.find((o) => o.value === answer.value)?.label ?? answer.value;
  }

  async function exportExcel() {
    if (!detail) return;
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const rows = detail.responses.map((r) => {
        const row: Record<string, string> = {
          "اسم المشرف": r.teacher.profile?.full_name || "-",
          "البريد الإلكتروني": r.teacher.profile?.email || "-",
        };
        for (const q of detail.questions) row[q.prompt] = answerLabel(q, r);
        row["ملاحظات"] = r.notes || "-";
        row["تاريخ الإرسال"] = formatDate(r.submitted_at);
        return row;
      });
      const sheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "نتائج التصويت");
      XLSX.writeFile(workbook, `نتائج-${detail.title.replace(/[^\p{L}\p{N}\- ]/gu, "").trim() || "تصويت"}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  const responseRate = eligibleTeachers ? Math.round(((detail?._count.responses ?? 0) / eligibleTeachers) * 100) : 0;

  return (
    <div className="vt-page" dir="rtl">
      <section className="vt-hero">
        <div>
          <span className="vt-kicker"><ListChecks size={15} /> إدارة التصويتات</span>
          <h1>التصويتات</h1>
          <p>أنشئ تصويتات لأخذ رأي المشرفين، تابع النتائج لحظياً، وأغلق أو أعد فتح أي تصويت وقتما تشاء.</p>
        </div>
        <div className="vt-hero-metrics">
          <Metric value={totals.votes} label="تصويت" />
          <Metric value={totals.open} label="مفتوح" />
          <Metric value={totals.closed} label="مغلق" />
          <Metric value={totals.responses} label="إجابة" />
        </div>
      </section>

      {!viewOnly && (
        <div className="vt-createbar">
          <div className="vt-createbar-copy">
            <span><Sparkles size={13} />أنشئ تصويتاً جديداً في أي وقت</span>
            <p>عرّف الأسئلة وخيارات كل سؤال، ثم افتحه للمشرفين. أغلقه أو احذفه أو أعد فتحه لاحقاً كما تشاء.</p>
          </div>
          <button className="vt-create" onClick={openCreateDialog} data-write="true">
            <Plus size={15} strokeWidth={2.4} />
            تصويت جديد
          </button>
        </div>
      )}

      <section className="vt-filters">
        <div className="vt-filters-head">
          <SlidersHorizontal size={14} strokeWidth={2} />
          <span>تصفية النتائج</span>
          <em className="vt-filters-count">{filteredList.length} نتيجة</em>
          {hasActiveFilters && (
            <button type="button" className="vt-filters-reset" onClick={resetFilters}>
              <X size={12} strokeWidth={2.4} />مسح التصفية
            </button>
          )}
        </div>
        <div className="vt-filters-row">
          <label className="vt-filter vt-filter-search">
            <span>البحث</span>
            <div className="vt-search-box">
              <Search size={14} strokeWidth={2} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بعنوان التصويت…" />
            </div>
          </label>
          <label className="vt-filter">
            <span>الحالة</span>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">كل الحالات</option>
              <option value="OPEN">مفتوح</option>
              <option value="CLOSED">مغلق</option>
            </select>
          </label>
        </div>
      </section>

      <div className="vt-layout">
        <aside className="vt-side">
          {loadingList ? <MandalaLoader compact /> : filteredList.length === 0 ? (
            <div className="vt-empty">{hasActiveFilters ? "لا يوجد تصويت مطابق لخيارات التصفية." : "لا توجد تصويتات بعد. أنشئ أول تصويت من الزر أعلاه."}</div>
          ) : (
            <ul className="vt-list">
              {filteredList.map((v) => (
                <li key={v.id}>
                  <button type="button" className={`vt-list-item ${selectedId === v.id ? "active" : ""}`} onClick={() => setSelectedId(v.id)}>
                    <span className={`vt-status-dot ${v.status === "OPEN" ? "open" : "closed"}`} />
                    <span className="vt-list-body">
                      <strong>{v.title}</strong>
                      <small>{v.questions.length} أسئلة · {v._count.responses} إجابة</small>
                    </span>
                    <span className={`vt-pill ${v.status === "OPEN" ? "open" : "closed"}`}>{v.status === "OPEN" ? "مفتوح" : "مغلق"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="vt-detail">
          {loadingDetail ? <MandalaLoader compact /> : !detail ? (
            <div className="vt-detail-empty">
              <ListChecks size={34} />
              <h2>اختر تصويتاً لعرض تفاصيله</h2>
              <p>من القائمة على اليمين، اختر أي تصويت لرؤية أسئلته ونتائجه الكاملة.</p>
            </div>
          ) : (
            <>
              <header className="vt-detail-head">
                <div>
                  <span className={`vt-pill ${detail.status === "OPEN" ? "open" : "closed"}`}>{detail.status === "OPEN" ? "مفتوح" : "مغلق"}</span>
                  <h2>{detail.title}</h2>
                  {detail.description && <p>{detail.description}</p>}
                  <div className="vt-detail-meta">
                    <span><Users size={13} />{detail._count.responses} إجابة من {eligibleTeachers} مشرف مؤهل ({responseRate}%)</span>
                    <span><CheckCircle2 size={13} />{detail.questions.length} أسئلة</span>
                  </div>
                </div>
                {!viewOnly && (
                  <div className="vt-detail-actions">
                    <button type="button" className="vt-btn" onClick={openEditDialog} data-write="true"><Pencil size={14} />تعديل</button>
                    <button type="button" className="vt-btn" onClick={() => void toggleStatus()} data-write="true">
                      {detail.status === "OPEN" ? <><Lock size={14} />إغلاق</> : <><Unlock size={14} />فتح</>}
                    </button>
                    <button type="button" className="vt-btn danger" onClick={() => void deleteVote()} data-write="true"><Trash2 size={14} />حذف</button>
                  </div>
                )}
              </header>

              {detail.questions.length === 0 ? (
                <div className="vt-empty">لا توجد أسئلة في هذا التصويت.</div>
              ) : detail._count.responses === 0 ? (
                <div className="vt-noresults">
                  <ListChecks size={28} />
                  <p>لا توجد إجابات بعد. ستظهر هنا الرسوم البيانية والنتائج التفصيلية فور استلام أول إجابة.</p>
                </div>
              ) : (
                <section className="vt-insights">
                  {distributions.map(({ question, rows }, idx) => (
                    <article key={question.id}>
                      <header><span>{String(idx + 1).padStart(2, "0")}</span><h3>{question.prompt}</h3></header>
                      <div className="vt-bars">
                        {rows.map((row) => (
                          <div className="vt-bar-row" key={row.option.value}>
                            <div><span>{row.option.label}</span><strong>{row.count} <small>({row.pct}%)</small></strong></div>
                            <div className="vt-track"><span style={{ width: `${row.pct}%` }} /></div>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </section>
              )}

              <section className="vt-results">
                <div className="vt-results-head">
                  <div><h2>الإجابات التفصيلية</h2><p>كل صف يعرض إجابة مشرف واحد على جميع أسئلة هذا التصويت.</p></div>
                  <button type="button" className="vt-export" onClick={() => void exportExcel()} disabled={exporting || detail.responses.length === 0}>
                    {exporting ? <LoaderCircle className="vt-spin" size={16} /> : <Download size={16} />}
                    {exporting ? "جاري التصدير..." : "تصدير Excel"}
                  </button>
                </div>
                <label className="vt-search vt-response-search">
                  <Search size={16} />
                  <input value={responseSearch} onChange={(e) => setResponseSearch(e.target.value)} placeholder="ابحث بالاسم أو البريد الإلكتروني" />
                </label>
                <div className="vt-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>المشرف</th>
                        {detail.questions.map((q) => <th key={q.id}>{q.prompt}</th>)}
                        {detail.allow_notes && <th>ملاحظات</th>}
                        <th>تاريخ الإرسال</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleResponses.length === 0 ? (
                        <tr><td colSpan={detail.questions.length + (detail.allow_notes ? 3 : 2)} className="vt-td-empty">لا توجد إجابات مطابقة.</td></tr>
                      ) : visibleResponses.map((r) => (
                        <tr key={r.id}>
                          <td><strong>{r.teacher.profile?.full_name || "-"}</strong><small>{r.teacher.profile?.email || "-"}</small></td>
                          {detail.questions.map((q) => <td key={q.id}><span className="vt-answer">{answerLabel(q, r)}</span></td>)}
                          {detail.allow_notes && <td className="vt-notes-cell">{r.notes ? <span title={r.notes}>{r.notes}</span> : <span className="vt-notes-empty">—</span>}</td>}
                          <td className="vt-date">{formatDate(r.submitted_at)}</td>
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

      {dlg && (
        <div className="vt-overlay" role="dialog" aria-modal="true" onClick={() => !saving && setDlg(null)}>
          <div className="vt-dialog" onClick={(e) => e.stopPropagation()}>
            <header className="vt-dialog-head">
              <h2>{dlg.mode === "create" ? "إنشاء تصويت جديد" : "تعديل التصويت"}</h2>
              <button type="button" className="vt-dialog-close" onClick={() => setDlg(null)} disabled={saving}><X size={18} /></button>
            </header>
            <div className="vt-dialog-body">
              <label className="vt-field">
                <span>عنوان التصويت</span>
                <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="مثال: تصويت وتيرة اللقاءات الإشرافية — الفصل الثاني" />
              </label>
              <label className="vt-field">
                <span>وصف مختصر (اختياري)</span>
                <textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="اشرح للمشرفين الهدف من هذا التصويت…" rows={2} />
              </label>

              {editLocked && (
                <p className="vt-locked-note">
                  <Lock size={13} />
                  بدأ المشرفون بالإجابة على هذا التصويت، لذا لا يمكن تعديل الأسئلة أو الخيارات بعد الآن — يمكنك تغيير العنوان والوصف فقط. أنشئ تصويتاً جديداً لأسئلة مختلفة.
                </p>
              )}

              {!editLocked && (
                <>
                  <label className="vt-toggle">
                    <input type="checkbox" checked={draft.allow_notes} onChange={(e) => setDraft((d) => ({ ...d, allow_notes: e.target.checked }))} />
                    <span><MessageSquareText size={14} />إضافة خطوة تعليق نصي اختياري في نهاية النموذج</span>
                  </label>

                  <div className="vt-questions">
                    {draft.questions.map((q, qIdx) => (
                      <div className="vt-question-card" key={qIdx}>
                        <div className="vt-question-head">
                          <GripVertical size={15} className="vt-drag-hint" />
                          <input
                            className="vt-question-prompt"
                            value={q.prompt}
                            onChange={(e) => updateQuestion(qIdx, { prompt: e.target.value })}
                            placeholder={`نص السؤال ${qIdx + 1}`}
                          />
                          {draft.questions.length > 1 && (
                            <button type="button" className="vt-icon-btn" onClick={() => removeQuestion(qIdx)} title="حذف السؤال"><Trash2 size={14} /></button>
                          )}
                        </div>
                        <div className="vt-options-edit">
                          {q.options.map((o, oIdx) => (
                            <div className="vt-option-row" key={oIdx}>
                              <input value={o.label} onChange={(e) => updateOption(qIdx, oIdx, e.target.value)} placeholder={`خيار ${oIdx + 1}`} />
                              {q.options.length > 2 && (
                                <button type="button" className="vt-icon-btn" onClick={() => removeOption(qIdx, oIdx)} title="حذف الخيار"><X size={13} /></button>
                              )}
                            </div>
                          ))}
                          <button type="button" className="vt-add-option" onClick={() => addOption(qIdx)}>+ إضافة خيار</button>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="vt-add-question" onClick={addQuestion}>+ إضافة سؤال جديد</button>
                  </div>
                </>
              )}

              {dlgError && <p className="vt-dlg-error">{dlgError}</p>}
            </div>
            <footer className="vt-dialog-actions">
              <button type="button" className="vt-btn" onClick={() => setDlg(null)} disabled={saving}>إلغاء</button>
              <button type="button" className="vt-btn primary" onClick={() => void submitDialog()} disabled={saving}>
                {saving ? <LoaderCircle className="vt-spin" size={15} /> : null}
                {dlg.mode === "create" ? "إنشاء التصويت" : "حفظ التعديلات"}
              </button>
            </footer>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

function errorText(code?: string) {
  switch (code) {
    case "title_required": return "اكتب عنوان التصويت أولاً.";
    case "at_least_one_question": return "أضف سؤالاً واحداً على الأقل.";
    case "question_prompt_required": return "أكمل نص كل سؤال قبل الحفظ.";
    case "at_least_two_options": return "كل سؤال يحتاج خيارين على الأقل.";
    case "locked": return "بدأت الإجابات على هذا التصويت — لا يمكن تعديل الأسئلة الآن.";
    default: return "تعذر حفظ التصويت. حاول مرة أخرى.";
  }
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="vt-metric"><strong>{value}</strong><span>{label}</span></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const styles = `
.vt-page{--ink:#32101A;--wine:#6B1E2D;--wine-deep:#4A0E1C;--gold:#B8A082;--cream:#FFFBF5;--soft:#F7F3EB;--line:#E5E0D5;min-height:100%;padding:28px;color:var(--ink);font-family:'Cairo',sans-serif;background:var(--soft);display:flex;flex-direction:column;gap:22px}

.vt-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:30px 32px;background:linear-gradient(125deg,var(--wine-deep),var(--wine));color:var(--cream);border-radius:18px;box-shadow:0 20px 50px rgba(74,14,28,.22)}
.vt-kicker{display:inline-flex;align-items:center;gap:7px;color:#D9C9B0;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
.vt-hero h1{margin:8px 0 4px;font-family:'El Messiri','Cairo',serif;font-size:30px;line-height:1.3}
.vt-hero p{margin:0;max-width:520px;color:#EADFCB;font-size:12.5px;line-height:1.8}
.vt-hero-metrics{display:flex;gap:10px;flex-shrink:0}
.vt-metric{min-width:82px;padding:12px 16px;border-radius:12px;background:rgba(255,255,255,.08);border:1px solid rgba(217,201,176,.28);text-align:center}
.vt-metric strong{display:block;font-size:24px;font-weight:900}
.vt-metric span{display:block;margin-top:2px;font-size:10px;color:#D9C9B0;font-weight:700}

.vt-createbar{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:16px 22px;border-radius:14px;background:#fff;border:1px solid var(--line);box-shadow:0 6px 20px rgba(50,16,26,.05)}
.vt-createbar-copy span{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:800;color:var(--wine)}
.vt-createbar-copy p{margin:4px 0 0;color:#796A62;font-size:11px}
.vt-create{flex-shrink:0;display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border:0;border-radius:11px;background:var(--wine);color:#fff;font:800 12.5px 'Cairo';cursor:pointer;box-shadow:0 8px 20px rgba(107,30,45,.28);transition:.16s ease}
.vt-create:hover{background:var(--wine-deep);transform:translateY(-1px)}

.vt-filters{padding:16px 20px;border-radius:14px;background:#fff;border:1px solid var(--line)}
.vt-filters-head{display:flex;align-items:center;gap:8px;margin-bottom:12px;color:#655B53;font-size:11.5px;font-weight:800}
.vt-filters-count{margin-inline-start:auto;color:#B3A99C;font-weight:700}
.vt-filters-reset{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border:1px solid var(--line);border-radius:999px;background:var(--soft);color:var(--wine);font:800 10px 'Cairo';cursor:pointer}
.vt-filters-row{display:grid;grid-template-columns:minmax(220px,1.6fr) minmax(140px,1fr);gap:10px}
.vt-filter{display:grid;gap:5px}
.vt-filter>span{color:#8C8274;font-size:9.5px;font-weight:800}
.vt-search-box{display:flex;align-items:center;gap:8px;height:40px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:var(--soft)}
.vt-search-box svg{color:#8F765B;flex-shrink:0}
.vt-search-box input{width:100%;border:0;outline:0;background:transparent;font:600 12px 'Cairo';color:var(--ink)}
.vt-filter select{height:40px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:var(--soft);font:700 11px 'Cairo';color:var(--ink)}

.vt-layout{display:grid;grid-template-columns:320px minmax(0,1fr);gap:18px;align-items:start}
.vt-side{border:1px solid var(--line);border-radius:14px;background:#fff;overflow:hidden;min-height:200px}
.vt-list{display:flex;flex-direction:column}
.vt-list li{border-bottom:1px solid var(--line)}
.vt-list li:last-child{border-bottom:0}
.vt-list-item{width:100%;display:flex;align-items:center;gap:11px;padding:14px 16px;border:0;background:transparent;cursor:pointer;text-align:right;transition:background .15s}
.vt-list-item:hover{background:var(--soft)}
.vt-list-item.active{background:rgba(107,30,45,.06);box-shadow:inset 3px 0 0 var(--wine)}
.vt-status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.vt-status-dot.open{background:#1B5E20;box-shadow:0 0 0 3px rgba(27,94,32,.15)}
.vt-status-dot.closed{background:#B3A99C}
.vt-list-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.vt-list-body strong{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vt-list-body small{color:#8C8274;font-size:9.5px}
.vt-pill{flex-shrink:0;padding:3px 10px;border-radius:999px;font-size:9px;font-weight:800}
.vt-pill.open{background:rgba(27,94,32,.1);color:#1B5E20}
.vt-pill.closed{background:rgba(140,130,116,.14);color:#655B53}

.vt-empty,.vt-detail-empty,.vt-noresults{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:48px 24px;color:#8C8274;text-align:center;font-size:12px}
.vt-detail-empty svg,.vt-noresults svg{color:var(--gold)}
.vt-detail-empty h2{margin:0;color:var(--ink);font-size:16px}
.vt-detail-empty p{margin:0;max-width:320px;line-height:1.7}
.vt-noresults{background:var(--soft);border-radius:12px;padding:28px}
.vt-noresults p{max-width:420px;line-height:1.7}

.vt-detail{display:flex;flex-direction:column;gap:20px;border:1px solid var(--line);border-radius:14px;background:#fff;padding:22px;min-height:200px}
.vt-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.vt-detail-head h2{margin:8px 0 4px;font-family:'El Messiri','Cairo',serif;font-size:21px}
.vt-detail-head p{margin:0 0 8px;color:#796A62;font-size:12px;max-width:520px;line-height:1.7}
.vt-detail-meta{display:flex;gap:14px;flex-wrap:wrap}
.vt-detail-meta span{display:flex;align-items:center;gap:5px;color:#655B53;font-size:11px;font-weight:700}
.vt-detail-actions{display:flex;gap:8px;flex-shrink:0}
.vt-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--line);border-radius:9px;background:#fff;color:var(--ink);font:800 11.5px 'Cairo';cursor:pointer;transition:.15s}
.vt-btn:hover{border-color:var(--gold);background:var(--soft)}
.vt-btn.danger{color:#8E2424;border-color:rgba(163,51,51,.28)}
.vt-btn.danger:hover{background:rgba(163,51,51,.06)}
.vt-btn.primary{background:var(--wine);color:#fff;border-color:var(--wine)}
.vt-btn.primary:hover{background:var(--wine-deep)}
.vt-btn:disabled{opacity:.5;cursor:not-allowed}

.vt-insights{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.vt-insights article{padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--soft)}
.vt-insights header{display:flex;align-items:flex-start;gap:9px;margin-bottom:12px}
.vt-insights header>span{flex:none;width:24px;height:24px;display:grid;place-items:center;border-radius:50%;background:var(--wine);color:#fff;font:700 9px 'Cairo'}
.vt-insights h3{margin:1px 0 0;font-size:12.5px;line-height:1.55;font-weight:800}
.vt-bars{display:grid;gap:12px}
.vt-bar-row>div:first-child{display:flex;justify-content:space-between;gap:7px;margin-bottom:5px;font-size:10.5px}
.vt-bar-row strong{font-size:10.5px}
.vt-bar-row small{color:#796A62;font-weight:500}
.vt-track{height:6px;overflow:hidden;border-radius:4px;background:#EFEAE0}
.vt-track>span{display:block;height:100%;border-radius:4px;background:var(--wine);transition:width .3s ease}

.vt-results{border-top:1px solid var(--line);padding-top:18px;display:flex;flex-direction:column;gap:12px}
.vt-results-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}
.vt-results-head h2{margin:0;font-size:16px}
.vt-results-head p{margin:3px 0 0;color:#796A62;font-size:10.5px}
.vt-export{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border:1px solid var(--gold);border-radius:9px;background:var(--cream);color:var(--wine-deep);font:800 11px 'Cairo';cursor:pointer}
.vt-export:disabled{opacity:.5;cursor:not-allowed}
.vt-search{display:flex;align-items:center;gap:8px;height:38px;padding:0 12px;border:1px solid var(--line);border-radius:9px;background:var(--soft);max-width:320px}
.vt-search svg{color:#8F765B;flex-shrink:0}
.vt-search input{width:100%;border:0;outline:0;background:transparent;font:600 11px 'Cairo';color:var(--ink)}

.vt-table-wrap{overflow:auto;border:1px solid var(--line);border-radius:10px}
.vt-table-wrap table{width:100%;min-width:640px;border-collapse:collapse}
.vt-table-wrap th{position:sticky;top:0;padding:11px 13px;background:#EFEAE0;color:#655B53;text-align:right;font-size:9px;font-weight:800;white-space:nowrap}
.vt-table-wrap td{padding:12px 13px;border-top:1px solid var(--line);font-size:10.5px;vertical-align:middle}
.vt-table-wrap td:first-child{min-width:190px}
.vt-table-wrap td strong,.vt-table-wrap td small{display:block}
.vt-table-wrap td small{margin-top:2px;color:#8C8274;font-size:9px}
.vt-answer{display:inline-flex;padding:4px 9px;border:1px solid #D9C9B0;border-radius:999px;background:var(--soft);font-weight:700;white-space:nowrap;font-size:9.5px}
.vt-notes-cell{max-width:200px}
.vt-notes-cell>span:not(.vt-notes-empty){display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.5;color:#4A0E1C;cursor:help}
.vt-notes-empty{color:#B3A99C}
.vt-date{color:#655B53;white-space:nowrap}
.vt-td-empty{text-align:center!important;padding:32px!important;color:#796A62}
.vt-spin{animation:vt-spin .8s linear infinite}
@keyframes vt-spin{to{transform:rotate(360deg)}}

.vt-overlay{position:fixed;inset:0;z-index:2000;display:grid;place-items:center;padding:18px;background:rgba(26,26,26,.6);backdrop-filter:blur(6px)}
.vt-dialog{width:min(640px,100%);max-height:calc(100dvh - 40px);display:flex;flex-direction:column;overflow:hidden;border-radius:16px;background:#fff;box-shadow:0 30px 90px rgba(26,26,26,.4)}
.vt-dialog-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--line)}
.vt-dialog-head h2{margin:0;font-size:17px}
.vt-dialog-close{width:30px;height:30px;display:grid;place-items:center;border:0;border-radius:8px;background:var(--soft);color:var(--wine);cursor:pointer}
.vt-dialog-body{flex:1;min-height:0;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:14px}
.vt-field{display:grid;gap:6px}
.vt-field>span{font-size:10.5px;font-weight:800;color:#655B53}
.vt-field input,.vt-field textarea{padding:10px 12px;border:1px solid var(--line);border-radius:9px;font:600 12.5px 'Cairo';color:var(--ink);outline:0;resize:vertical}
.vt-field input:focus,.vt-field textarea:focus{border-color:var(--wine)}
.vt-toggle{display:flex;align-items:center;gap:9px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--soft);cursor:pointer}
.vt-toggle span{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:#5A4A30}
.vt-locked-note{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border-radius:10px;background:rgba(184,160,130,.12);border:1px solid rgba(184,160,130,.3);color:#7A5A2E;font-size:11px;line-height:1.7}
.vt-questions{display:flex;flex-direction:column;gap:12px}
.vt-question-card{border:1px solid var(--line);border-radius:12px;padding:12px;background:var(--soft)}
.vt-question-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.vt-drag-hint{color:#B3A99C;flex-shrink:0}
.vt-question-prompt{flex:1;padding:9px 11px;border:1px solid var(--line);border-radius:8px;font:700 12px 'Cairo';outline:0;background:#fff}
.vt-question-prompt:focus{border-color:var(--wine)}
.vt-options-edit{display:flex;flex-direction:column;gap:7px;padding-inline-start:23px}
.vt-option-row{display:flex;align-items:center;gap:7px}
.vt-option-row input{flex:1;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font:600 11.5px 'Cairo';outline:0;background:#fff}
.vt-option-row input:focus{border-color:var(--gold)}
.vt-icon-btn{flex-shrink:0;width:26px;height:26px;display:grid;place-items:center;border:0;border-radius:7px;background:transparent;color:#B3A99C;cursor:pointer}
.vt-icon-btn:hover{background:rgba(163,51,51,.08);color:#8E2424}
.vt-add-option{align-self:flex-start;padding:5px 10px;border:1px dashed var(--gold);border-radius:999px;background:transparent;color:var(--wine);font:800 10px 'Cairo';cursor:pointer}
.vt-add-question{align-self:flex-start;padding:8px 16px;border:1.5px dashed var(--wine);border-radius:10px;background:transparent;color:var(--wine);font:800 11.5px 'Cairo';cursor:pointer}
.vt-dlg-error{margin:0;padding:9px 12px;border-radius:9px;background:rgba(163,51,51,.08);color:#6B1E2D;font-size:11px;font-weight:800}
.vt-dialog-actions{display:flex;justify-content:flex-end;gap:9px;padding:16px 22px;border-top:1px solid var(--line);background:var(--soft)}

@media(max-width:1080px){.vt-layout{grid-template-columns:1fr}}
@media(max-width:640px){.vt-page{padding:14px}.vt-hero{flex-direction:column;align-items:stretch;padding:22px 18px}.vt-hero-metrics{justify-content:space-between}.vt-metric{flex:1;min-width:0}.vt-filters-row{grid-template-columns:1fr}.vt-createbar{flex-direction:column;align-items:stretch}.vt-create{justify-content:center}}
`;
