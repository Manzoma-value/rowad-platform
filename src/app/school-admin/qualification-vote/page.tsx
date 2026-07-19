"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  BarChart3,
  CheckCircle2,
  Download,
  LoaderCircle,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";

type Frequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";
type FrequencyCount = Record<Frequency, number>;
type Vote = {
  id: string;
  coaching_frequency: Frequency;
  consultation_frequency: Frequency;
  evaluation_frequency: Frequency;
  field_support_frequency: Frequency;
  needs_group_leader: boolean;
  notes: string | null;
  submitted_at: string;
  teacher: { id: string; profile: { full_name: string; email: string | null } | null };
};
type ResponseData = {
  votes: Vote[];
  summary: {
    coaching: FrequencyCount;
    consultation: FrequencyCount;
    evaluation: FrequencyCount;
    support: FrequencyCount;
    leader: { yes: number; no: number };
  };
  meta: {
    filtered: number;
    total_responses: number;
    eligible_teachers: number;
    response_rate: number;
    capped: boolean;
  };
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
  WEEKLY: "أسبوعياً",
  BIWEEKLY: "كل أسبوعين",
  MONTHLY: "شهرياً",
};

const EMPTY_DATA: ResponseData = {
  votes: [],
  summary: {
    coaching: { WEEKLY: 0, BIWEEKLY: 0, MONTHLY: 0 },
    consultation: { WEEKLY: 0, BIWEEKLY: 0, MONTHLY: 0 },
    evaluation: { WEEKLY: 0, BIWEEKLY: 0, MONTHLY: 0 },
    support: { WEEKLY: 0, BIWEEKLY: 0, MONTHLY: 0 },
    leader: { yes: 0, no: 0 },
  },
  meta: { filtered: 0, total_responses: 0, eligible_teachers: 0, response_rate: 0, capped: false },
};

function Distribution({ counts, allowed = ["WEEKLY", "BIWEEKLY", "MONTHLY"] }: { counts: FrequencyCount; allowed?: Frequency[] }) {
  const total = allowed.reduce((sum, key) => sum + counts[key], 0);
  return (
    <div className="qv-bars">
      {allowed.map((key) => {
        const percentage = total ? Math.round((counts[key] / total) * 100) : 0;
        return (
          <div className="qv-bar-row" key={key}>
            <div><span>{FREQUENCY_LABELS[key]}</span><strong>{counts[key]} <small>({percentage}%)</small></strong></div>
            <div className="qv-track"><span style={{ width: `${percentage}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

export default function QualificationVotePage() {
  const [data, setData] = useState<ResponseData>(EMPTY_DATA);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [dateScope, setDateScope] = useState("all");
  const [sort, setSort] = useState("newest");
  const [coaching, setCoaching] = useState("all");
  const [consultation, setConsultation] = useState("all");
  const [evaluation, setEvaluation] = useState("all");
  const [support, setSupport] = useState("all");
  const [leader, setLeader] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const params = useMemo(() => {
    const value = new URLSearchParams({
      sort,
      date_scope: dateScope,
      coaching,
      consultation,
      evaluation,
      support,
      leader,
      tz_offset: String(new Date().getTimezoneOffset()),
    });
    if (debouncedQuery) value.set("q", debouncedQuery);
    return value.toString();
  }, [coaching, consultation, dateScope, debouncedQuery, evaluation, leader, sort, support]);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/school-admin/future-qualification-vote?${params}`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("request_failed");
      setData(await response.json() as ResponseData);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setError("تعذر تحميل نتائج التصويت. تحقق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const resetFilters = () => {
    setQuery(""); setDebouncedQuery(""); setDateScope("all"); setSort("newest");
    setCoaching("all"); setConsultation("all"); setEvaluation("all"); setSupport("all"); setLeader("all");
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const rows = data.votes.map((vote) => ({
        "اسم المعلم": vote.teacher.profile?.full_name || "-",
        "البريد الإلكتروني": vote.teacher.profile?.email || "-",
        "جلسة الكوتشينج الفردية": FREQUENCY_LABELS[vote.coaching_frequency],
        "الاستشارة الجماعية": FREQUENCY_LABELS[vote.consultation_frequency],
        "التقييم التطويري": FREQUENCY_LABELS[vote.evaluation_frequency],
        "الدعم الميداني": FREQUENCY_LABELS[vote.field_support_frequency],
        "يحتاج قائد مجموعة": vote.needs_group_leader ? "نعم" : "لا",
        "ملاحظات": vote.notes || "-",
        "تاريخ الإرسال": formatDate(vote.submitted_at),
      }));
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 24 }, { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 40 }, { wch: 24 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "نتائج التصويت");
      XLSX.writeFile(workbook, `نتائج-تصويت-التأهيل-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const leaderTotal = data.summary.leader.yes + data.summary.leader.no;
  const leaderYesPercent = leaderTotal ? Math.round((data.summary.leader.yes / leaderTotal) * 100) : 0;

  return (
    <div className="qv-page" dir="rtl">
      <section className="qv-hero">
        <div>
          <span className="qv-kicker"><BarChart3 size={15} /> صوت المعلمين</span>
          <h1>نتائج تصويت عمليات التأهيل المستقبلية</h1>
          <p>قراءة منظمة لاختيارات المعلمين حول وتيرة الدعم والتطوير في المرحلة القادمة.</p>
        </div>
        <button type="button" className="qv-export" onClick={() => void exportExcel()} disabled={exporting || data.votes.length === 0}>
          {exporting ? <LoaderCircle className="qv-spin" size={17} /> : <Download size={17} />}
          {exporting ? "جاري التصدير..." : "تصدير النتائج Excel"}
        </button>
      </section>

      <section className="qv-stats" aria-label="ملخص المشاركة">
        <article><CheckCircle2 size={20} /><div><strong>{data.meta.total_responses}</strong><span>إجمالي المشاركات</span></div></article>
        <article><Users size={20} /><div><strong>{data.meta.eligible_teachers}</strong><span>المعلمون المؤهلون</span></div></article>
        <article><BarChart3 size={20} /><div><strong>{data.meta.response_rate}%</strong><span>نسبة الاستجابة</span></div></article>
        <article><Search size={20} /><div><strong>{data.meta.filtered}</strong><span>النتائج المطابقة</span></div></article>
      </section>

      <section className="qv-insights">
        <article><header><span>01</span><h2>جلسة الكوتشينج الفردية</h2></header><Distribution counts={data.summary.coaching} allowed={["WEEKLY", "BIWEEKLY"]} /></article>
        <article><header><span>02</span><h2>جلسة الاستشارة الجماعية</h2></header><Distribution counts={data.summary.consultation} allowed={["BIWEEKLY", "MONTHLY"]} /></article>
        <article><header><span>03</span><h2>جلسات التقييم التطويري</h2></header><Distribution counts={data.summary.evaluation} /></article>
        <article><header><span>04</span><h2>نظام الدعم الميداني</h2></header><Distribution counts={data.summary.support} /></article>
        <article className="qv-leader"><header><span>05</span><h2>الحاجة إلى قائد للمجموعة</h2></header><div className="qv-leader-result"><strong>{leaderYesPercent}%</strong><span>اختاروا نعم</span></div><div className="qv-track"><span style={{ width: `${leaderYesPercent}%` }} /></div><footer><span>نعم: {data.summary.leader.yes}</span><span>لا: {data.summary.leader.no}</span></footer></article>
      </section>

      <section className="qv-results">
        <div className="qv-results-head"><div><h2>الإجابات التفصيلية</h2><p>كل صف يعرض النموذج الكامل الذي أرسله المعلم.</p></div></div>
        <div className="qv-filters">
          <label className="qv-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو البريد الإلكتروني" /></label>
          <FilterSelect label="التاريخ" value={dateScope} onChange={setDateScope} options={[["all", "كل التواريخ"], ["today", "أرسلوا اليوم"], ["week", "آخر 7 أيام"]]} />
          <FilterSelect label="الترتيب" value={sort} onChange={setSort} icon={<ArrowDownUp size={14} />} options={[["newest", "الأحدث أولاً"], ["oldest", "الأقدم أولاً"]]} />
          <FilterSelect label="الكوتشينج" value={coaching} onChange={setCoaching} options={frequencyOptions(["WEEKLY", "BIWEEKLY"])} />
          <FilterSelect label="الاستشارة" value={consultation} onChange={setConsultation} options={frequencyOptions(["BIWEEKLY", "MONTHLY"])} />
          <FilterSelect label="التقييم" value={evaluation} onChange={setEvaluation} options={frequencyOptions()} />
          <FilterSelect label="الدعم" value={support} onChange={setSupport} options={frequencyOptions()} />
          <FilterSelect label="قائد المجموعة" value={leader} onChange={setLeader} options={[["all", "الكل"], ["yes", "نعم"], ["no", "لا"]]} />
          <button type="button" className="qv-reset" onClick={resetFilters} title="إعادة ضبط الفلاتر"><RotateCcw size={16} /><span>إعادة ضبط</span></button>
        </div>

        {error ? <div className="qv-message"><p>{error}</p><button type="button" onClick={() => void load()}>إعادة المحاولة</button></div> : (
          <div className="qv-table-wrap" aria-busy={loading}>
            {loading && <div className="qv-loading"><LoaderCircle className="qv-spin" size={25} /><span>جاري تحديث النتائج...</span></div>}
            <table>
              <thead><tr><th>المعلم</th><th>الكوتشينج الفردي</th><th>الاستشارة الجماعية</th><th>التقييم التطويري</th><th>الدعم الميداني</th><th>قائد للمجموعة</th><th>ملاحظات</th><th>تاريخ الإرسال</th></tr></thead>
              <tbody>
                {!loading && data.votes.length === 0 ? <tr><td colSpan={8} className="qv-empty">لا توجد إجابات مطابقة للفلاتر الحالية.</td></tr> : data.votes.map((vote) => (
                  <tr key={vote.id}>
                    <td><strong>{vote.teacher.profile?.full_name || "-"}</strong><small>{vote.teacher.profile?.email || "-"}</small></td>
                    <td><Answer value={vote.coaching_frequency} /></td><td><Answer value={vote.consultation_frequency} /></td><td><Answer value={vote.evaluation_frequency} /></td><td><Answer value={vote.field_support_frequency} /></td>
                    <td><span className={vote.needs_group_leader ? "qv-yes" : "qv-no"}>{vote.needs_group_leader ? "نعم" : "لا"}</span></td>
                    <td className="qv-notes-cell">{vote.notes ? <span title={vote.notes}>{vote.notes}</span> : <span className="qv-notes-empty">—</span>}</td>
                    <td className="qv-date">{formatDate(vote.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.meta.capped && <p className="qv-cap">يتم عرض أول 500 نتيجة مطابقة. استخدم الفلاتر لتضييق النتائج.</p>}
      </section>

      <style>{`
        .qv-page{--ink:#32101A;--wine:#6B1E2D;--wine-deep:#4A0E1C;--gold:#B8A082;--cream:#FFFBF5;--soft:#F7F3EB;--line:#E5E0D5;min-height:100%;padding:28px;color:var(--ink);font-family:'Cairo',sans-serif;background:var(--soft)}
        .qv-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:30px 32px;background:var(--wine-deep);color:var(--cream);border-bottom:4px solid var(--gold)}.qv-kicker{display:inline-flex;align-items:center;gap:7px;color:#D9C9B0;font-size:11px;font-weight:800}.qv-hero h1{margin:8px 0 4px;font-size:30px;line-height:1.35;letter-spacing:0}.qv-hero p{margin:0;color:#D9C9B0;font-size:12px}.qv-export{min-height:43px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:9px 16px;border:1px solid #D9C9B0;background:#FFFBF5;color:var(--wine-deep);font:800 12px 'Cairo';cursor:pointer}.qv-export:disabled{opacity:.55;cursor:not-allowed}
        .qv-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--line);border-top:0;background:#FFFBF5}.qv-stats article{min-height:94px;display:flex;align-items:center;gap:13px;padding:18px 22px;border-inline-start:1px solid var(--line)}.qv-stats article:first-child{border-inline-start:0}.qv-stats svg{color:var(--wine)}.qv-stats strong,.qv-stats span{display:block}.qv-stats strong{font-size:25px}.qv-stats span{color:#796A62;font-size:10px}
        .qv-insights{display:grid;grid-template-columns:repeat(5,minmax(190px,1fr));gap:12px;margin:22px 0}.qv-insights article{min-height:228px;padding:18px;border:1px solid var(--line);border-radius:6px;background:#FFFBF5;box-shadow:0 8px 24px rgba(50,16,26,.045)}.qv-insights header{display:flex;align-items:flex-start;gap:9px;min-height:48px}.qv-insights header>span{flex:none;width:26px;height:26px;display:grid;place-items:center;border-radius:50%;background:var(--wine);color:#FFFBF5;font:700 9px 'Cairo'}.qv-insights h2{margin:2px 0 0;font-size:13px;line-height:1.55}.qv-bars{display:grid;gap:15px;margin-top:15px}.qv-bar-row>div:first-child{display:flex;justify-content:space-between;gap:7px;margin-bottom:6px;font-size:10px}.qv-bar-row strong{font-size:10px}.qv-bar-row small{color:#796A62;font-weight:500}.qv-track{height:6px;overflow:hidden;background:#EFEAE0}.qv-track>span{display:block;height:100%;background:var(--wine);transition:width .25s ease}.qv-leader-result{margin-top:17px}.qv-leader-result strong,.qv-leader-result span{display:block}.qv-leader-result strong{font-size:33px}.qv-leader-result span{color:#796A62;font-size:10px}.qv-leader>.qv-track{margin-top:13px}.qv-leader footer{display:flex;justify-content:space-between;margin-top:8px;color:#655B53;font-size:9px}
        .qv-results{border:1px solid var(--line);background:#FFFBF5}.qv-results-head{display:flex;justify-content:space-between;padding:22px 24px 14px}.qv-results-head h2{margin:0;font-size:20px}.qv-results-head p{margin:3px 0 0;color:#796A62;font-size:10px}.qv-filters{display:grid;grid-template-columns:minmax(240px,1.7fr) repeat(7,minmax(118px,1fr)) auto;gap:8px;padding:0 24px 18px}.qv-search{min-height:43px;display:flex;align-items:center;gap:8px;padding:0 12px;border:1px solid var(--line);background:#FFFFFF}.qv-search svg{flex:none;color:#8F765B}.qv-search input{width:100%;border:0;outline:0;background:transparent;color:var(--ink);font:600 11px 'Cairo'}.qv-select{display:grid;gap:3px}.qv-select span{color:#8C8274;font-size:8px;font-weight:800}.qv-select-box{height:29px;display:flex;align-items:center;border:1px solid var(--line);background:#FFFFFF}.qv-select-box svg{margin-inline-start:7px;color:#8F765B}.qv-select select{width:100%;height:100%;border:0;outline:0;padding:0 7px;background:transparent;color:var(--ink);font:700 9px 'Cairo'}.qv-reset{align-self:end;height:29px;display:flex;align-items:center;justify-content:center;gap:5px;padding:0 10px;border:1px solid #D9C9B0;background:var(--soft);color:var(--wine);font:800 9px 'Cairo';cursor:pointer}
        .qv-table-wrap{position:relative;min-height:160px;overflow:auto;border-top:1px solid var(--line)}.qv-loading{position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;gap:9px;background:rgba(255,251,245,.84);color:var(--wine);font-size:11px;font-weight:800}.qv-table-wrap table{width:100%;min-width:1300px;border-collapse:collapse}.qv-table-wrap th{position:sticky;top:0;z-index:1;padding:12px 14px;background:#EFEAE0;color:#655B53;text-align:right;font-size:9px;white-space:nowrap}.qv-table-wrap td{padding:14px;border-top:1px solid var(--line);font-size:10.5px;vertical-align:middle}.qv-table-wrap td:first-child{min-width:210px}.qv-table-wrap td strong,.qv-table-wrap td small{display:block}.qv-table-wrap td small{margin-top:2px;color:#8C8274;font-size:9px}.qv-answer{display:inline-flex;padding:4px 8px;border:1px solid #D9C9B0;background:var(--soft);font-weight:700;white-space:nowrap}.qv-yes,.qv-no{display:inline-flex;min-width:45px;justify-content:center;padding:4px 8px;font-weight:800}.qv-yes{background:#1B5E20;color:#FFFFFF}.qv-no{border:1px solid #D9C9B0;color:#655B53}.qv-notes-cell{max-width:220px}.qv-notes-cell>span:not(.qv-notes-empty){display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.5;color:#4A0E1C;cursor:help}.qv-notes-empty{color:#B3A99C}.qv-date{color:#655B53;white-space:nowrap}.qv-empty{height:160px;text-align:center!important;color:#796A62}.qv-message{display:grid;place-items:center;gap:10px;min-height:170px;border-top:1px solid var(--line);color:var(--wine);font-size:12px}.qv-message button{padding:8px 15px;border:0;background:var(--wine);color:#FFFFFF;font:700 10px 'Cairo';cursor:pointer}.qv-cap{margin:0;padding:10px 24px;background:#EFEAE0;color:#655B53;font-size:9px}.qv-spin{animation:qv-spin .8s linear infinite}@keyframes qv-spin{to{transform:rotate(360deg)}}
        @media(max-width:1280px){.qv-insights{grid-template-columns:repeat(3,minmax(210px,1fr))}.qv-filters{grid-template-columns:minmax(260px,2fr) repeat(4,minmax(125px,1fr))}.qv-search{grid-row:span 2}}
        @media(max-width:760px){.qv-page{padding:12px}.qv-hero{align-items:stretch;flex-direction:column;padding:22px 18px}.qv-hero h1{font-size:23px}.qv-export{width:100%}.qv-stats{grid-template-columns:repeat(2,1fr)}.qv-stats article{min-height:78px;padding:14px}.qv-stats article:nth-child(3){border-top:1px solid var(--line);border-inline-start:0}.qv-stats article:nth-child(4){border-top:1px solid var(--line)}.qv-insights{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:5px}.qv-insights article{min-width:min(82vw,310px);scroll-snap-align:start}.qv-results-head{padding:18px 15px 12px}.qv-filters{display:flex;overflow-x:auto;padding:0 15px 15px}.qv-search{flex:0 0 240px;min-height:46px}.qv-select{flex:0 0 132px}.qv-reset{flex:0 0 auto}.qv-table-wrap th,.qv-table-wrap td{padding:12px 10px}}
      `}</style>
    </div>
  );
}

function frequencyOptions(values: Frequency[] = ["WEEKLY", "BIWEEKLY", "MONTHLY"]): Array<[string, string]> {
  return [["all", "الكل"], ...values.map((value) => [value, FREQUENCY_LABELS[value]] as [string, string])];
}

function FilterSelect({ label, value, onChange, options, icon }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]>; icon?: React.ReactNode }) {
  return <label className="qv-select"><span>{label}</span><div className="qv-select-box">{icon}<select value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></div></label>;
}

function Answer({ value }: { value: Frequency }) {
  return <span className="qv-answer">{FREQUENCY_LABELS[value]}</span>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
