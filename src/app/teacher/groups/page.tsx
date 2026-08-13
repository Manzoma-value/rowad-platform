"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Crown,
  DoorOpen,
  LockKeyhole,
  LogOut,
  Network,
  Search,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useLang } from "@/lib/language-context";
import { useConfirm } from "@/lib/confirm-dialog";
import MandalaLoader from "@/components/MandalaLoader";
import TeacherLoadError from "@/components/TeacherLoadError";

type TeacherGroup = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  joined_at: string | null;
  member_count: number;
  max_members: number;
  available_seats: number;
  is_full: boolean;
  is_member: boolean;
  request_status: "PENDING" | null;
  leader: { id: string | null; name: string } | null;
};

type PendingRequest = { id: string; group_id: string; group_name: string; requested_at: string };

const UI = {
  ar: {
    eyebrow: "مجتمع المشرفين",
    title: "كل مجموعات المنصة",
    sub: "شاهد جميع المجموعات، افتح مجموعاتك الحالية، أو أرسل طلباً جديداً للانضمام إلى أي مجموعة مناسبة.",
    groups: "إجمالي المجموعات",
    memberships: "مجموعاتي",
    guideTitle: "كيف تعمل المجموعات؟",
    guide: "يمكنك الانضمام إلى أكثر من مجموعة. أرسل طلباً واحداً في كل مرة، وبعد موافقة مدير المنصة ستظهر المجموعة ضمن مجموعاتك.",
    search: "ابحث باسم المجموعة أو وصفها...",
    all: "الكل",
    mine: "مجموعاتي",
    available: "متاحة للانضمام",
    member: "أنت عضو",
    members: "عضواً",
    open: "فتح المجموعة",
    join: "طلب الانضمام",
    joining: "جارٍ إرسال الطلب…",
    pendingLabel: "بانتظار الموافقة",
    full: "المجموعة مكتملة",
    seats: (available: number, total: number) => `${available} مقعد متاح من ${total}`,
    leader: "قائد المجموعة",
    noLeader: "سيُحدد لاحقاً",
    requestTitle: "طلب انضمام جديد",
    requestConfirm: (name: string) => `هل تريد إرسال طلب الانضمام إلى «${name}»؟ سيراجعه مدير المنصة قبل إضافتك.`,
    requestSent: "تم إرسال طلبك إلى مدير المنصة بنجاح.",
    requestError: "تعذر إرسال الطلب الآن. حدّث الصفحة وحاول مرة أخرى.",
    seatChanged: "اكتملت مقاعد هذه المجموعة للتو. اختر مجموعة أخرى.",
    pendingTitle: "طلبك قيد المراجعة",
    pendingSub: (name: string) => `طلب الانضمام إلى «${name}» وصل إلى مدير المنصة. يمكنك متابعة مجموعاتك الحالية أثناء الانتظار.`,
    cancelRequest: "سحب الطلب",
    cancelConfirm: "هل تريد سحب طلب الانضمام؟ يمكنك إرسال طلب إلى مجموعة أخرى بعد ذلك.",
    pendingOther: "لديك طلب آخر قيد المراجعة. اسحبه أولاً لإرسال طلب جديد.",
    leave: "مغادرة المجموعة",
    leaveTitle: (name: string) => `مغادرة «${name}»`,
    leaveWarning: "ستفقد الوصول إلى محتوى المجموعة وإعلاناتها ونماذج القياس. للعودة لاحقاً ستحتاج إلى إرسال طلب انضمام جديد وموافقة مدير المنصة.",
    leaderWarning: "أنت قائد هذه المجموعة؛ ستنتهي قيادتك فور المغادرة وسيتمكن مدير المنصة من تعيين قائد آخر.",
    reasonLabel: "لماذا تريد مغادرة المجموعة؟",
    reasonHelp: "السبب مطلوب وسيظهر لمدير المنصة للمراجعة.",
    reasonPlaceholder: "اكتب سبباً واضحاً يساعد مدير المنصة على فهم قرارك...",
    reasonShort: "اكتب 10 أحرف على الأقل.",
    reasonLong: "يجب ألا يتجاوز السبب 1000 حرف.",
    leaveConfirm: "تأكيد المغادرة",
    leaving: "جارٍ المغادرة…",
    leaveSuccess: (name: string) => `غادرت «${name}» بنجاح. يمكنك طلب الانضمام إليها مرة أخرى لاحقاً.`,
    leaveError: "تعذرت المغادرة الآن. حدّث الصفحة وحاول مرة أخرى.",
    cancel: "إلغاء",
    emptyTitle: "لا توجد مجموعات بعد",
    emptySub: "عندما ينشئ مدير المنصة مجموعات جديدة ستظهر هنا.",
    noResults: "لا توجد مجموعات مطابقة للبحث أو الفلتر.",
  },
  sq: {
    eyebrow: "Komuniteti i edukatorëve",
    title: "Të gjitha grupet e platformës",
    sub: "Shiko çdo grup, hap grupet e tua ose dërgo një kërkesë të re për t'iu bashkuar një grupi tjetër.",
    groups: "Gjithsej grupe",
    memberships: "Grupet e mia",
    guideTitle: "Si funksionojnë grupet?",
    guide: "Mund të jesh anëtar në disa grupe. Dërgo një kërkesë në një kohë; pas miratimit nga administratori, grupi shfaqet te grupet e tua.",
    search: "Kërko sipas emrit ose përshkrimit...",
    all: "Të gjitha",
    mine: "Grupet e mia",
    available: "Të disponueshme",
    member: "Je anëtar",
    members: "anëtarë",
    open: "Hap grupin",
    join: "Kërko anëtarësim",
    joining: "Po dërgojmë kërkesën…",
    pendingLabel: "Në pritje të miratimit",
    full: "Grupi është plot",
    seats: (available: number, total: number) => `${available} vende të lira nga ${total}`,
    leader: "Drejtuesi i grupit",
    noLeader: "Do të caktohet më vonë",
    requestTitle: "Kërkesë e re anëtarësimi",
    requestConfirm: (name: string) => `Të dërgojmë kërkesën për “${name}”? Administratori do ta shqyrtojë para se të të shtojë.`,
    requestSent: "Kërkesa iu dërgua administratorit me sukses.",
    requestError: "Kërkesa nuk u dërgua. Rifresko faqen dhe provo përsëri.",
    seatChanged: "Vendi i fundit sapo u rezervua. Zgjidh një grup tjetër.",
    pendingTitle: "Kërkesa po shqyrtohet",
    pendingSub: (name: string) => `Kërkesa për “${name}” ka mbërritur te administratori. Mund të vazhdosh të përdorësh grupet e tua ndërkohë.`,
    cancelRequest: "Tërhiq kërkesën",
    cancelConfirm: "Ta tërheqim kërkesën? Më pas mund të kërkosh anëtarësim në një grup tjetër.",
    pendingOther: "Ke një kërkesë tjetër aktive. Tërhiqe para se të dërgosh një kërkesë të re.",
    leave: "Largohu nga grupi",
    leaveTitle: (name: string) => `Largohu nga “${name}”`,
    leaveWarning: "Do të humbasësh qasjen te përmbajtja, njoftimet dhe vlerësimet e grupit. Për t'u kthyer, duhet të dërgosh një kërkesë të re dhe të presësh miratimin.",
    leaderWarning: "Je drejtuesi i këtij grupi; drejtimi yt përfundon menjëherë dhe administratori mund të caktojë një drejtues tjetër.",
    reasonLabel: "Pse dëshiron të largohesh?",
    reasonHelp: "Arsyeja është e detyrueshme dhe do të jetë e dukshme për administratorin.",
    reasonPlaceholder: "Shkruaj një arsye të qartë që e ndihmon administratorin ta kuptojë vendimin...",
    reasonShort: "Shkruaj të paktën 10 karaktere.",
    reasonLong: "Arsyeja nuk mund të kalojë 1000 karaktere.",
    leaveConfirm: "Konfirmo largimin",
    leaving: "Po largohemi…",
    leaveSuccess: (name: string) => `U largove me sukses nga “${name}”. Mund të kërkosh të hysh përsëri më vonë.`,
    leaveError: "Nuk mund të largohesh tani. Rifresko faqen dhe provo përsëri.",
    cancel: "Anulo",
    emptyTitle: "Nuk ka grupe ende",
    emptySub: "Grupet e reja do të shfaqen këtu pasi t'i krijojë administratori.",
    noResults: "Nuk ka grupe që përputhen me kërkimin ose filtrin.",
  },
} as const;

type Filter = "all" | "mine" | "available";

export default function TeacherGroupsPage() {
  const confirm = useConfirm();
  const { lang } = useLang();
  const L = lang === "sq" ? "sq" : "ar";
  const T = UI[L];
  const dir = L === "ar" ? "rtl" : "ltr";

  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [viewerId, setViewerId] = useState("");
  const [membershipCount, setMembershipCount] = useState(0);
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [leaveGroup, setLeaveGroup] = useState<TeacherGroup | null>(null);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveError, setLeaveError] = useState("");
  const [leaving, setLeaving] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/teacher/groups", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setGroups(Array.isArray(data?.groups) ? data.groups : []);
      setViewerId(typeof data?.viewer_teacher_id === "string" ? data.viewer_teacher_id : "");
      setMembershipCount(Number(data?.membership_count) || 0);
      setPendingRequest(data?.pending_request ?? null);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => void loadGroups());
    return () => cancelAnimationFrame(frame);
  }, [loadGroups]);

  async function joinGroup(group: TeacherGroup) {
    if (group.is_full || joiningId || pendingRequest) return;
    const approved = await confirm({
      title: T.requestTitle,
      message: T.requestConfirm(group.name),
      confirmText: T.join,
      cancelText: T.cancel,
      variant: "normal",
    });
    if (!approved) return;
    setJoiningId(group.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/teacher/groups/${group.id}/join`, { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice({ tone: "error", text: result?.error === "group_full" ? T.seatChanged : result?.error === "pending_other_group" ? T.pendingOther : T.requestError });
      } else {
        setNotice({ tone: "success", text: T.requestSent });
      }
      await loadGroups();
    } catch {
      setNotice({ tone: "error", text: T.requestError });
    } finally {
      setJoiningId(null);
    }
  }

  async function cancelRequest() {
    if (!pendingRequest || joiningId) return;
    const approved = await confirm({
      title: T.pendingTitle,
      message: T.cancelConfirm,
      confirmText: T.cancelRequest,
      cancelText: T.cancel,
      variant: "danger",
    });
    if (!approved) return;
    setJoiningId(pendingRequest.group_id);
    setNotice(null);
    try {
      const response = await fetch(`/api/teacher/groups/${pendingRequest.group_id}/join`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      await loadGroups();
    } catch {
      setNotice({ tone: "error", text: T.requestError });
    } finally {
      setJoiningId(null);
    }
  }

  function openLeave(group: TeacherGroup) {
    setLeaveGroup(group);
    setLeaveReason("");
    setLeaveError("");
  }

  function closeLeave() {
    if (leaving) return;
    setLeaveGroup(null);
    setLeaveReason("");
    setLeaveError("");
  }

  async function submitLeave() {
    if (!leaveGroup || leaving) return;
    const reason = leaveReason.trim();
    if (reason.length < 10) return setLeaveError(T.reasonShort);
    if (reason.length > 1000) return setLeaveError(T.reasonLong);
    const groupName = leaveGroup.name;
    setLeaving(true);
    setLeaveError("");
    setNotice(null);
    try {
      const response = await fetch(`/api/teacher/groups/${leaveGroup.id}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setLeaveError(result?.error === "reason_too_short" ? T.reasonShort : result?.error === "reason_too_long" ? T.reasonLong : T.leaveError);
        return;
      }
      setLeaveGroup(null);
      setLeaveReason("");
      setNotice({ tone: "success", text: T.leaveSuccess(groupName) });
      await loadGroups();
    } catch {
      setLeaveError(T.leaveError);
    } finally {
      setLeaving(false);
    }
  }

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return groups.filter((group) => {
      const matchesFilter = filter === "all" || (filter === "mine" ? group.is_member : !group.is_member);
      const matchesQuery = !q || `${group.name} ${group.description ?? ""}`.toLocaleLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [filter, groups, query]);

  if (loading) return <div className="tg-page" dir={dir}><div className="tg-loading"><MandalaLoader /></div><style>{styles}</style></div>;
  if (loadError) return <TeacherLoadError onRetry={() => void loadGroups()} />;

  return (
    <div className="tg-page" dir={dir}>
      <header className="tg-hero">
        <div className="tg-hero-copy">
          <span className="tg-eyebrow"><Network size={15} />{T.eyebrow}</span>
          <h1>{T.title}</h1>
          <p>{T.sub}</p>
        </div>
        <div className="tg-stats">
          <div><strong>{groups.length}</strong><span>{T.groups}</span></div>
          <div className="accent"><strong>{membershipCount}</strong><span>{T.memberships}</span></div>
        </div>
      </header>

      <section className="tg-guide">
        <span><Sparkles size={19} /></span>
        <div><strong>{T.guideTitle}</strong><p>{T.guide}</p></div>
      </section>

      {pendingRequest && (
        <section className="tg-pending">
          <span className="tg-pending-icon"><Clock3 size={22} /></span>
          <div><strong>{T.pendingTitle}</strong><p>{T.pendingSub(pendingRequest.group_name)}</p></div>
          <button type="button" onClick={() => void cancelRequest()} disabled={joiningId !== null}><X size={15} />{T.cancelRequest}</button>
        </section>
      )}
      {notice && <div className={`tg-notice ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.tone === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}<span>{notice.text}</span></div>}

      {groups.length > 0 && (
        <section className="tg-toolbar" aria-label={T.search}>
          <label className="tg-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={T.search} /></label>
          <div className="tg-filters">
            {(["all", "mine", "available"] as const).map((value) => (
              <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>
                {value === "all" ? T.all : value === "mine" ? T.mine : T.available}
              </button>
            ))}
          </div>
        </section>
      )}

      {groups.length === 0 || visibleGroups.length === 0 ? (
        <section className="tg-empty"><Network size={38} /><h2>{groups.length === 0 ? T.emptyTitle : T.noResults}</h2>{groups.length === 0 && <p>{T.emptySub}</p>}</section>
      ) : (
        <section className="tg-grid">
          {visibleGroups.map((group) => {
            const pending = group.request_status === "PENDING";
            return (
              <article key={group.id} className={`tg-card${group.is_member ? " joined" : ""}${pending ? " pending" : ""}`}>
                <div className="tg-card-top">
                  <span className="tg-card-icon"><Users size={19} /></span>
                  {group.is_member ? <span className="tg-state joined"><CheckCircle2 size={14} />{T.member}</span> : pending ? <span className="tg-state pending"><Clock3 size={14} />{T.pendingLabel}</span> : <span className={`tg-state${group.is_full ? " full" : " seats"}`}>{group.is_full ? <LockKeyhole size={14} /> : <DoorOpen size={14} />}{group.is_full ? T.full : T.seats(group.available_seats, group.max_members)}</span>}
                </div>
                <h2>{group.name}</h2>
                <p className="tg-description">{group.description || " "}</p>
                <div className="tg-leader"><Crown size={15} /><span><small>{T.leader}</small><strong>{group.leader?.name || T.noLeader}</strong></span></div>
                <div className="tg-capacity"><span>{group.member_count} {T.members}</span><div><i style={{ width: `${Math.min(100, (group.member_count / Math.max(1, group.max_members)) * 100)}%` }} /></div><span>{group.max_members}</span></div>
                {group.is_member ? (
                  <div className="tg-card-actions">
                    <Link href={`/teacher/groups/${group.id}`}><ArrowUpRight size={17} />{T.open}</Link>
                    <button type="button" className="leave" onClick={() => openLeave(group)}><LogOut size={16} />{T.leave}</button>
                  </div>
                ) : (
                  <button type="button" className="tg-join" onClick={() => void joinGroup(group)} disabled={group.is_full || joiningId !== null || pendingRequest !== null}>
                    {joiningId === group.id ? <Clock3 size={17} /> : pending ? <Clock3 size={17} /> : <Send size={17} />}
                    {joiningId === group.id ? T.joining : pending ? T.pendingLabel : group.is_full ? T.full : T.join}
                  </button>
                )}
              </article>
            );
          })}
        </section>
      )}

      {leaveGroup && (
        <div className="tg-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeLeave(); }}>
          <section className="tg-modal" role="dialog" aria-modal="true" aria-labelledby="leave-title">
            <button type="button" className="tg-modal-close" onClick={closeLeave} disabled={leaving} aria-label={T.cancel}><X size={19} /></button>
            <span className="tg-modal-icon"><LogOut size={24} /></span>
            <h2 id="leave-title">{T.leaveTitle(leaveGroup.name)}</h2>
            <div className="tg-warning"><AlertTriangle size={20} /><p>{T.leaveWarning}</p></div>
            {leaveGroup.leader?.id === viewerId && <div className="tg-warning leader"><Crown size={20} /><p>{T.leaderWarning}</p></div>}
            <label className="tg-reason">
              <span><strong>{T.reasonLabel}</strong><small>{T.reasonHelp}</small></span>
              <textarea autoFocus value={leaveReason} maxLength={1000} onChange={(event) => { setLeaveReason(event.target.value); setLeaveError(""); }} placeholder={T.reasonPlaceholder} />
              <em>{leaveReason.trim().length} / 1000</em>
            </label>
            {leaveError && <div className="tg-modal-error" role="alert">{leaveError}</div>}
            <div className="tg-modal-actions">
              <button type="button" onClick={closeLeave} disabled={leaving}>{T.cancel}</button>
              <button type="button" className="danger" onClick={() => void submitLeave()} disabled={leaving || leaveReason.trim().length < 10}>{leaving ? <Clock3 size={17} /> : <LogOut size={17} />}{leaving ? T.leaving : T.leaveConfirm}</button>
            </div>
          </section>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
  .tg-page { min-height:100%; padding:clamp(16px,3vw,32px); background:#EFEAE0; color:#1A1A1A; font-family:'Cairo',sans-serif; }
  .tg-loading { min-height:60vh; display:grid; place-items:center; }
  .tg-hero { position:relative; overflow:hidden; display:flex; align-items:center; justify-content:space-between; gap:24px; padding:clamp(22px,4vw,38px); border:1px solid rgba(184,160,130,.17); border-radius:24px; background:radial-gradient(circle at 12% 0%,rgba(184,160,130,.17),transparent 34%),linear-gradient(135deg,#6B1E2D,#6B1E2D 62%,#6B1E2D); color:#fff; box-shadow:0 18px 45px rgba(107,30,45,.16); }
  .tg-hero::after { content:''; position:absolute; width:260px; height:260px; inset-inline-end:-90px; bottom:-160px; border:1px solid rgba(217,201,176,.16); border-radius:50%; box-shadow:0 0 0 32px rgba(217,201,176,.035),0 0 0 64px rgba(217,201,176,.025); pointer-events:none; }
  .tg-hero-copy { position:relative; z-index:1; max-width:720px; }
  .tg-eyebrow { display:inline-flex; align-items:center; gap:7px; margin-bottom:10px; color:#D9C9B0; font-size:12px; font-weight:900; }
  .tg-hero h1 { margin:0 0 7px; color:#FFF; font-size:clamp(25px,3vw,36px); font-weight:900; letter-spacing:-.5px; }
  .tg-hero p { margin:0; color:rgba(255,255,255,.7); font-size:13.5px; line-height:1.85; }
  .tg-stats { position:relative; z-index:1; display:grid; grid-template-columns:repeat(2,minmax(110px,1fr)); gap:10px; flex:none; }
  .tg-stats>div { display:flex; min-width:116px; flex-direction:column; align-items:center; gap:4px; padding:16px; border:1px solid rgba(255,255,255,.11); border-radius:16px; background:rgba(255,255,255,.07); backdrop-filter:blur(8px); }
  .tg-stats>div.accent { border-color:rgba(217,201,176,.25); background:rgba(217,201,176,.12); }
  .tg-stats strong { color:#EFEAE0; font-size:28px; line-height:1; }
  .tg-stats span { color:rgba(255,255,255,.65); font-size:10px; font-weight:800; }
  .tg-guide { display:flex; align-items:center; gap:12px; margin:16px 0; padding:14px 16px; border:1px solid rgba(107,30,45,.1); border-radius:16px; background:#FFFBF5; box-shadow:0 8px 24px rgba(26,26,26,.035); }
  .tg-guide>span { display:grid; width:38px; height:38px; flex:none; place-items:center; border-radius:11px; background:rgba(107,30,45,.08); color:#6B1E2D; }
  .tg-guide strong { color:#32101A; font-size:12.5px; font-weight:900; }
  .tg-guide p { margin:2px 0 0; color:#796A62; font-size:11.5px; line-height:1.7; }
  .tg-pending { display:grid; grid-template-columns:48px minmax(0,1fr) auto; align-items:center; gap:14px; margin-bottom:16px; padding:15px; border:1px solid rgba(217,201,176,.25); border-radius:17px; background:linear-gradient(135deg,#6B1E2D,#6B1E2D); color:#fff; box-shadow:0 12px 28px rgba(26,26,26,.1); }
  .tg-pending-icon { display:grid; width:48px; height:48px; place-items:center; border-radius:14px; background:rgba(217,201,176,.12); color:#D9C9B0; }
  .tg-pending strong { color:#E5E0D5; font-size:14px; font-weight:900; }
  .tg-pending p { margin:3px 0 0; color:rgba(255,255,255,.68); font-size:11.5px; line-height:1.7; }
  .tg-pending button { display:flex; align-items:center; gap:6px; padding:9px 12px; border:1px solid rgba(255,255,255,.16); border-radius:10px; background:rgba(255,255,255,.07); color:#fff; font:800 10.5px 'Cairo',sans-serif; cursor:pointer; }
  .tg-notice { display:flex; align-items:center; gap:9px; margin:0 0 16px; padding:11px 14px; border-radius:13px; font-size:12px; font-weight:800; }
  .tg-notice.success { border:1px solid rgba(27,94,32,.2); background:#F7F3EB; color:#1B5E20; }
  .tg-notice.error { border:1px solid rgba(107,30,45,.22); background:#F7F3EB; color:#6B1E2D; }
  .tg-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 0 17px; }
  .tg-search { display:flex; width:min(480px,100%); align-items:center; gap:9px; padding:0 14px; border:1px solid rgba(107,30,45,.12); border-radius:14px; background:#FFFBF5; color:#8F765B; box-shadow:0 8px 20px rgba(26,26,26,.035); }
  .tg-search:focus-within { border-color:rgba(107,30,45,.45); box-shadow:0 0 0 4px rgba(107,30,45,.07); }
  .tg-search input { width:100%; border:0; outline:0; background:transparent; padding:12px 0; color:#32101A; font:600 12.5px 'Cairo',sans-serif; }
  .tg-filters { display:flex; gap:5px; padding:4px; border:1px solid rgba(107,30,45,.09); border-radius:13px; background:rgba(255,251,245,.72); }
  .tg-filters button { border:0; border-radius:9px; background:transparent; padding:8px 11px; color:#796A62; font:800 10.5px 'Cairo',sans-serif; cursor:pointer; white-space:nowrap; }
  .tg-filters button.active { background:#32101A; color:#FFF; box-shadow:0 4px 12px rgba(107,30,45,.16); }
  .tg-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(285px,1fr)); gap:15px; }
  .tg-card { display:flex; min-height:330px; flex-direction:column; padding:18px; border:1px solid rgba(107,30,45,.09); border-radius:18px; background:#FFFBF5; box-shadow:0 10px 28px rgba(26,26,26,.045); transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease; }
  .tg-card:hover { transform:translateY(-3px); border-color:rgba(107,30,45,.3); box-shadow:0 16px 34px rgba(26,26,26,.08); }
  .tg-card.joined { border-color:rgba(27,94,32,.2); background:linear-gradient(180deg,#FFFBF5,#FFFBF5 45%); }
  .tg-card.pending { border-color:rgba(184,160,130,.6); box-shadow:0 0 0 3px rgba(184,160,130,.09),0 10px 28px rgba(26,26,26,.045); }
  .tg-card-top { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:16px; }
  .tg-card-icon { display:grid; width:38px; height:38px; flex:none; place-items:center; border-radius:11px; background:#1A1A1A; color:#B8A082; }
  .tg-state { display:inline-flex; align-items:center; gap:5px; min-width:0; padding:6px 8px; border-radius:999px; font-size:9.5px; font-weight:900; }
  .tg-state.joined { background:#EFEAE0; color:#1B5E20; }
  .tg-state.pending { background:#EFEAE0; color:#6B1E2D; }
  .tg-state.seats { background:#F7F3EB; color:#1B5E20; }
  .tg-state.full { background:#EFEAE0; color:#6B1E2D; }
  .tg-card h2 { margin:0 0 7px; color:#32101A; font-size:17px; font-weight:900; }
  .tg-description { flex:1; min-height:44px; margin:0; color:#796A62; font-size:12px; line-height:1.75; }
  .tg-leader { display:flex; align-items:center; gap:9px; margin-top:14px; padding:9px 10px; border-radius:11px; background:#F7F3EB; color:#6B1E2D; }
  .tg-leader>span { display:flex; min-width:0; flex-direction:column; }
  .tg-leader small { color:#8F765B; font-size:8.5px; font-weight:900; }
  .tg-leader strong { overflow:hidden; color:#32101A; font-size:10.5px; font-weight:900; text-overflow:ellipsis; white-space:nowrap; }
  .tg-capacity { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:8px; margin:14px 1px; color:#8F765B; font-size:9.5px; font-weight:800; }
  .tg-capacity>div { overflow:hidden; height:5px; border-radius:999px; background:#E5E0D5; }
  .tg-capacity i { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#6B1E2D,#B8A082); }
  .tg-card-actions { display:grid; grid-template-columns:1.25fr 1fr; gap:8px; }
  .tg-card-actions a,.tg-card-actions button,.tg-join { display:flex; align-items:center; justify-content:center; gap:7px; min-height:42px; border-radius:11px; font:900 10.5px 'Cairo',sans-serif; cursor:pointer; }
  .tg-card-actions a { background:#32101A; color:#FFF; text-decoration:none; }
  .tg-card-actions button { border:1px solid rgba(107,30,45,.18); background:transparent; color:#6B1E2D; }
  .tg-card-actions button:hover { background:#F7F3EB; }
  .tg-join { width:100%; border:0; background:#6B1E2D; color:#FFF; }
  .tg-join:disabled { cursor:not-allowed; opacity:.48; }
  .tg-empty { min-height:330px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:32px; border:1px dashed rgba(107,30,45,.28); border-radius:18px; background:#FFFBF5; color:#8C8274; text-align:center; }
  .tg-empty h2 { margin:0; color:#32101A; font-size:17px; font-weight:900; }
  .tg-empty p { max-width:390px; margin:0; color:#796A62; font-size:12px; line-height:1.8; }
  .tg-modal-backdrop { position:fixed; z-index:1000; inset:0; display:grid; place-items:center; padding:18px; background:rgba(107,30,45,.62); backdrop-filter:blur(6px); animation:tg-fade .16s ease; }
  .tg-modal { position:relative; width:min(560px,100%); max-height:calc(100vh - 36px); overflow:auto; padding:26px; border:1px solid rgba(184,160,130,.28); border-radius:22px; background:#FFFBF5; box-shadow:0 28px 80px rgba(26,26,26,.3); animation:tg-up .2s ease; }
  .tg-modal-close { position:absolute; inset-inline-end:17px; top:17px; display:grid; width:34px; height:34px; place-items:center; border:1px solid #E5E0D5; border-radius:10px; background:#FFF; color:#655B53; cursor:pointer; }
  .tg-modal-icon { display:grid; width:50px; height:50px; place-items:center; margin-bottom:13px; border-radius:15px; background:#EFEAE0; color:#6B1E2D; }
  .tg-modal h2 { margin:0 0 15px; padding-inline-end:38px; color:#32101A; font-size:21px; font-weight:900; }
  .tg-warning { display:flex; align-items:flex-start; gap:10px; margin-bottom:10px; padding:12px; border:1px solid #E5E0D5; border-radius:12px; background:#F7F3EB; color:#6B1E2D; }
  .tg-warning.leader { border-color:#E5E0D5; background:#F7F3EB; color:#6B1E2D; }
  .tg-warning svg { flex:none; margin-top:2px; }
  .tg-warning p { margin:0; font-size:11px; font-weight:700; line-height:1.8; }
  .tg-reason { display:block; margin-top:16px; }
  .tg-reason>span { display:flex; flex-direction:column; margin-bottom:8px; }
  .tg-reason strong { color:#32101A; font-size:12.5px; font-weight:900; }
  .tg-reason small { color:#8C8274; font-size:9.5px; }
  .tg-reason textarea { width:100%; min-height:118px; resize:vertical; border:1.5px solid #E5E0D5; border-radius:13px; outline:0; background:#FFF; padding:12px; color:#32101A; font:600 12px/1.8 'Cairo',sans-serif; }
  .tg-reason textarea:focus { border-color:#6B1E2D; box-shadow:0 0 0 4px rgba(107,30,45,.07); }
  .tg-reason em { display:block; margin-top:4px; color:#8C8274; font-size:9px; font-style:normal; text-align:end; }
  .tg-modal-error { margin-top:8px; color:#6B1E2D; font-size:10.5px; font-weight:800; }
  .tg-modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:19px; }
  .tg-modal-actions button { display:flex; align-items:center; justify-content:center; gap:7px; min-width:110px; border:1px solid #E5E0D5; border-radius:11px; background:#FFF; padding:10px 14px; color:#655B53; font:900 10.5px 'Cairo',sans-serif; cursor:pointer; }
  .tg-modal-actions button.danger { border-color:#6B1E2D; background:#6B1E2D; color:#FFF; }
  .tg-modal-actions button:disabled { cursor:not-allowed; opacity:.48; }
  @keyframes tg-fade { from { opacity:0 } }
  @keyframes tg-up { from { opacity:0; transform:translateY(10px) scale(.985) } }
  @media (max-width:760px) {
    .tg-hero { align-items:stretch; flex-direction:column; border-radius:20px; }
    .tg-stats { width:100%; }
    .tg-stats>div { min-width:0; }
    .tg-toolbar { align-items:stretch; flex-direction:column; }
    .tg-search { width:100%; }
    .tg-filters { overflow:auto; }
    .tg-filters button { flex:1; }
    .tg-pending { grid-template-columns:44px 1fr; }
    .tg-pending-icon { width:44px; height:44px; }
    .tg-pending button { grid-column:1/-1; justify-content:center; }
  }
  @media (max-width:430px) {
    .tg-page { padding:12px; }
    .tg-hero { padding:21px 18px; }
    .tg-guide { align-items:flex-start; }
    .tg-grid { grid-template-columns:1fr; }
    .tg-card { min-height:315px; padding:15px; }
    .tg-card-actions { grid-template-columns:1fr; }
    .tg-modal { padding:22px 17px; border-radius:18px; }
    .tg-modal-actions { flex-direction:column-reverse; }
    .tg-modal-actions button { width:100%; }
  }
`;
