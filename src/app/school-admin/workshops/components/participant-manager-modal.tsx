"use client";

/* User avatars do not have stable dimensions for next/image. */
/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Clock3, Search, UserPlus, UserCheck, UserX, Users, X } from "lucide-react";
import MandalaLoader from "@/components/MandalaLoader";

type Participant = {
  teacher_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  enrolled: boolean;
};

export type JoinRequest = {
  teacher_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WAITLISTED";
  source: string;
  requested_at: string;
  decided_at: string | null;
};

type Labels = {
  participants: string;
  participantsSub: string;
  activeTeachers: string;
  searchTeachers: string;
  enrolled: string;
  enrolledCount: string;
  availableCount: string;
  addTeacher: string;
  adding: string;
  noActiveTeachers: string;
  closePanel: string;
  tabRequests: string;
  tabRoster: string;
  pendingCount: string;
  noRequests: string;
  approve: string;
  reject: string;
  waitlist: string;
  deciding: string;
  statusPending: string;
  statusApproved: string;
  statusRejected: string;
  statusWaitlisted: string;
  historyLabel: string;
};

export function ParticipantManagerModal({
  dir,
  labels,
  roster,
  visibleRoster,
  query,
  loading,
  error,
  mutatingTeacher,
  requests,
  requestsLoading,
  decidingTeacher,
  onQueryChange,
  onAdd,
  onDecide,
  onClose,
}: {
  dir: "rtl" | "ltr";
  labels: Labels;
  roster: Participant[];
  visibleRoster: Participant[];
  query: string;
  loading: boolean;
  error: string;
  mutatingTeacher: string | null;
  requests: JoinRequest[];
  requestsLoading: boolean;
  decidingTeacher: string | null;
  onQueryChange: (query: string) => void;
  onAdd: (teacherId: string) => void;
  onDecide: (teacherId: string, status: "APPROVED" | "REJECTED" | "WAITLISTED") => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"requests" | "roster">("requests");
  const pending = requests.filter((r) => r.status === "PENDING" || r.status === "WAITLISTED");
  const history = requests.filter((r) => r.status === "APPROVED" || r.status === "REJECTED");
  const [showHistory, setShowHistory] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !mutatingTeacher) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mutatingTeacher, onClose]);

  if (!mounted) return null;

  const enrolledCount = roster.filter((teacher) => teacher.enrolled).length;

  return createPortal(
    <div className="wpm-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !mutatingTeacher) onClose(); }}>
      <section className="wpm-panel" role="dialog" aria-modal="true" aria-labelledby="wpm-title" dir={dir}>
        <header>
          <div>
            <span><UserPlus size={16}/>{labels.activeTeachers}</span>
            <h2 id="wpm-title">{labels.participants}</h2>
            <p>{labels.participantsSub}</p>
          </div>
          <button onClick={onClose} disabled={!!mutatingTeacher} aria-label={labels.closePanel}><X size={20}/></button>
        </header>

        <div className="wpm-tabs">
          <button className={tab === "requests" ? "on" : ""} onClick={() => setTab("requests")}>
            <Clock3 size={15}/>{labels.tabRequests}
            {pending.length > 0 && <em>{pending.length}</em>}
          </button>
          <button className={tab === "roster" ? "on" : ""} onClick={() => setTab("roster")}>
            <Users size={15}/>{labels.tabRoster}
          </button>
        </div>

        {tab === "roster" ? (
          <>
            <div className="wpm-tools">
              <label className="wpm-search">
                <Search size={18}/>
                <input autoFocus value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={labels.searchTeachers}/>
                {query && <button type="button" onClick={() => onQueryChange("")} aria-label={labels.closePanel}><X size={15}/></button>}
              </label>
              <div className="wpm-summary">
                <span><CheckCircle2 size={15}/><b>{enrolledCount}</b>{labels.enrolledCount}</span>
                <span><UserPlus size={15}/><b>{roster.length - enrolledCount}</b>{labels.availableCount}</span>
              </div>
            </div>

            {error && <p className="wpm-error" role="alert">{error}</p>}
            <div className="wpm-list">
              {loading ? <MandalaLoader/> : visibleRoster.length === 0 ? <div className="wpm-empty">{labels.noActiveTeachers}</div> : visibleRoster.map((teacher) => (
                <article key={teacher.teacher_id} className={teacher.enrolled ? "enrolled" : ""}>
                  <span className="wpm-avatar">{teacher.avatar_url ? <img src={teacher.avatar_url} alt=""/> : teacher.full_name.trim().charAt(0).toUpperCase()}</span>
                  <div className="wpm-details">
                    <strong>{teacher.full_name}</strong>
                    <small dir="ltr">{teacher.email ?? "-"}</small>
                  </div>
                  {teacher.enrolled ? (
                    <span className="wpm-enrolled"><CheckCircle2 size={15}/>{labels.enrolled}</span>
                  ) : (
                    <button onClick={() => onAdd(teacher.teacher_id)} disabled={mutatingTeacher === teacher.teacher_id}>
                      <UserPlus size={15}/>{mutatingTeacher === teacher.teacher_id ? labels.adding : labels.addTeacher}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="wpm-list wpm-requests">
            {requestsLoading ? <MandalaLoader/> : pending.length === 0 ? <div className="wpm-empty">{labels.noRequests}</div> : pending.map((request) => (
              <article key={request.teacher_id} className={`req req-${request.status.toLowerCase()}`}>
                <span className="wpm-avatar">{request.avatar_url ? <img src={request.avatar_url} alt=""/> : request.full_name.trim().charAt(0).toUpperCase()}</span>
                <div className="wpm-details">
                  <strong>{request.full_name}</strong>
                  <small dir="ltr">{request.email ?? "-"}</small>
                </div>
                <span className={`req-status req-status-${request.status.toLowerCase()}`}>
                  {request.status === "WAITLISTED" ? labels.statusWaitlisted : labels.statusPending}
                </span>
                <div className="req-actions">
                  <button className="approve" onClick={() => onDecide(request.teacher_id, "APPROVED")} disabled={decidingTeacher === request.teacher_id}>
                    <UserCheck size={14}/>{decidingTeacher === request.teacher_id ? labels.deciding : labels.approve}
                  </button>
                  <button className="waitlist" onClick={() => onDecide(request.teacher_id, "WAITLISTED")} disabled={decidingTeacher === request.teacher_id || request.status === "WAITLISTED"}>
                    <Clock3 size={14}/>{labels.waitlist}
                  </button>
                  <button className="reject" onClick={() => onDecide(request.teacher_id, "REJECTED")} disabled={decidingTeacher === request.teacher_id}>
                    <UserX size={14}/>{labels.reject}
                  </button>
                </div>
              </article>
            ))}

            {history.length > 0 && (
              <div className="wpm-history">
                <button className="wpm-history-toggle" onClick={() => setShowHistory((v) => !v)}>{labels.historyLabel} ({history.length})</button>
                {showHistory && history.map((request) => (
                  <article key={request.teacher_id} className="req req-history">
                    <span className="wpm-avatar">{request.avatar_url ? <img src={request.avatar_url} alt=""/> : request.full_name.trim().charAt(0).toUpperCase()}</span>
                    <div className="wpm-details">
                      <strong>{request.full_name}</strong>
                      <small dir="ltr">{request.email ?? "-"}</small>
                    </div>
                    <span className={`req-status req-status-${request.status.toLowerCase()}`}>
                      {request.status === "APPROVED" ? labels.statusApproved : labels.statusRejected}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
      <style>{styles}</style>
    </div>,
    document.body,
  );
}

const styles = `
.wpm-overlay{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:clamp(12px,2vw,24px);background:rgba(26,26,26,.68);backdrop-filter:blur(10px);font-family:'Cairo',sans-serif}
.wpm-panel{width:min(980px,100%);height:min(760px,calc(100dvh - 40px));display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(217,201,176,.48);border-radius:24px;background:#EFEAE0;box-shadow:0 34px 110px rgba(26,26,26,.42);animation:wpm-in .2s ease-out}
.wpm-panel>header{display:flex;align-items:center;justify-content:space-between;gap:20px;flex:none;padding:22px 24px;background:linear-gradient(125deg,#250B12,#4A0E1C 62%,#6B1E2D);color:#F7F3EB}
.wpm-panel>header span{display:flex;align-items:center;gap:6px;color:#D9C9B0;font-size:10px;font-weight:900}.wpm-panel>header h2{margin:4px 0;font-size:clamp(20px,2.4vw,28px);line-height:1.35}.wpm-panel>header p{max-width:650px;margin:0;color:rgba(247,243,235,.72);font-size:12px;line-height:1.75}
.wpm-panel>header button{width:42px;height:42px;display:grid;place-items:center;flex:none;border:1px solid rgba(255,255,255,.2);border-radius:13px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer}.wpm-panel>header button:hover{background:rgba(255,255,255,.16)}.wpm-panel>header button:disabled{opacity:.45;cursor:progress}
.wpm-tabs{display:flex;gap:8px;flex:none;padding:14px 20px 0}
.wpm-tabs button{display:flex;align-items:center;gap:7px;border:1px solid rgba(107,30,45,.18);background:#FFFBF5;color:#655B53;padding:9px 16px;border-radius:11px 11px 0 0;font:800 12px 'Cairo',sans-serif;cursor:pointer}
.wpm-tabs button.on{background:#EFEAE0;color:#32101A;border-color:#D9C9B0;border-bottom-color:transparent}
.wpm-tabs button em{font-style:normal;min-width:19px;height:19px;display:grid;place-items:center;border-radius:999px;background:#6B1E2D;color:#fff;font-size:10px;padding:0 5px}
.wpm-requests{display:flex!important;flex-direction:column;grid-template-columns:none!important}
.req{display:grid!important;grid-template-columns:50px minmax(0,1fr) auto auto!important;align-items:center;gap:11px;padding:12px;border:1px solid rgba(107,30,45,.1);border-radius:16px;background:#FFFBF5;box-shadow:0 7px 20px rgba(50,16,26,.035)}
.req-status{font-size:10px;font-weight:800;padding:5px 10px;border-radius:999px;white-space:nowrap}
.req-status-pending{background:rgba(107,30,45,.09);color:#6B1E2D}
.req-status-waitlisted{background:rgba(184,160,130,.24);color:#8F765B}
.req-status-approved{background:rgba(27,94,32,.12);color:#1B5E20}
.req-status-rejected{background:rgba(107,30,45,.09);color:#655B53}
.req-actions{display:flex;gap:6px}
.req-actions button{display:flex;align-items:center;gap:5px;border:0;border-radius:9px;padding:8px 10px;font:800 10px 'Cairo',sans-serif;cursor:pointer;white-space:nowrap}
.req-actions button.approve{background:#1B5E20;color:#fff}
.req-actions button.waitlist{background:rgba(184,160,130,.28);color:#4A0E1C}
.req-actions button.reject{background:rgba(107,30,45,.12);color:#6B1E2D}
.req-actions button:disabled{opacity:.5;cursor:not-allowed}
.wpm-history{grid-column:1/-1;margin-top:8px;display:flex;flex-direction:column;gap:8px}
.wpm-history-toggle{align-self:flex-start;border:1px dashed rgba(107,30,45,.28);background:transparent;color:#6B1E2D;padding:7px 12px;border-radius:9px;font:800 10.5px 'Cairo',sans-serif;cursor:pointer}
@media(max-width:620px){.req{grid-template-columns:44px minmax(0,1fr)!important;row-gap:8px}.req-status,.req-actions{grid-column:1/-1}}
.wpm-tools{display:grid;grid-template-columns:minmax(280px,1fr) auto;align-items:center;gap:14px;flex:none;padding:16px 20px 12px}
.wpm-search{display:flex;align-items:center;gap:10px;min-height:48px;padding:0 14px;border:1px solid #D9C9B0;border-radius:14px;background:#fff;box-shadow:0 6px 18px rgba(50,16,26,.04)}.wpm-search:focus-within{border-color:#6B1E2D;box-shadow:0 0 0 3px rgba(107,30,45,.1)}
.wpm-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:13px;color:#32101A}.wpm-search>button{width:30px;height:30px;display:grid;place-items:center;flex:none;border:0;border-radius:9px;background:#EFEAE0;color:#6B1E2D;cursor:pointer}
.wpm-summary{display:flex;gap:8px}.wpm-summary span{min-height:46px;display:flex;align-items:center;gap:6px;padding:0 12px;border:1px solid rgba(107,30,45,.1);border-radius:13px;background:#FFFBF5;color:#655B53;font-size:10.5px;font-weight:800;white-space:nowrap}.wpm-summary svg{color:#6B1E2D}.wpm-summary b{color:#32101A;font-size:15px}
.wpm-error{margin:0 20px 10px;padding:10px 12px;border:1px solid rgba(107,30,45,.15);border-radius:11px;background:rgba(107,30,45,.08);color:#6B1E2D;font-size:11px;font-weight:800}
.wpm-list{min-height:0;flex:1;overflow:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-content:start;gap:10px;padding:8px 20px 20px}.wpm-list>.wpm-empty{grid-column:1/-1}
.wpm-empty{padding:40px 20px;text-align:center;border:1px dashed rgba(184,155,94,.34);border-radius:14px;background:#FFFBF5;color:#8C8274;font-weight:800}
.wpm-list article{min-width:0;display:grid;grid-template-columns:50px minmax(0,1fr) auto;align-items:center;gap:11px;padding:12px;border:1px solid rgba(107,30,45,.1);border-radius:16px;background:#FFFBF5;box-shadow:0 7px 20px rgba(50,16,26,.035);transition:transform .15s,border-color .15s,box-shadow .15s}.wpm-list article:hover{transform:translateY(-1px);border-color:rgba(107,30,45,.22);box-shadow:0 10px 24px rgba(50,16,26,.07)}.wpm-list article.enrolled{background:rgba(255,251,245,.64);border-color:rgba(49,87,36,.18)}
.wpm-avatar{width:50px;height:50px;display:grid;place-items:center;overflow:hidden;border-radius:15px;background:linear-gradient(145deg,#32101A,#6B1E2D);color:#F7F3EB;font-size:17px;font-weight:900}.wpm-avatar img{width:100%;height:100%;object-fit:cover}
.wpm-details{min-width:0}.wpm-details strong,.wpm-details small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wpm-details strong{font-size:12.5px;color:#32101A}.wpm-details small{margin-top:3px;color:#796A62;font-size:10.5px;text-align:left}
.wpm-list article>button,.wpm-enrolled{min-height:40px;display:flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:11px;padding:0 12px;background:#6B1E2D;color:#fff;font:800 10.5px 'Cairo',sans-serif;cursor:pointer;white-space:nowrap}.wpm-list article>button:hover{background:#4A0E1C}.wpm-enrolled{background:rgba(49,87,36,.1);color:#1B5E20}.wpm-list article>button:disabled{opacity:.55;cursor:progress}
@keyframes wpm-in{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}
@media(max-width:760px){.wpm-overlay{padding:0}.wpm-panel{width:100%;height:100dvh;max-height:none;border:0;border-radius:0}.wpm-panel>header{padding:18px 16px}.wpm-tools{grid-template-columns:1fr;padding:14px 14px 8px}.wpm-summary{display:grid;grid-template-columns:1fr 1fr}.wpm-summary span{justify-content:center}.wpm-list{grid-template-columns:1fr;padding:8px 14px 18px}.wpm-list article{grid-template-columns:46px minmax(0,1fr) auto}.wpm-avatar{width:46px;height:46px}.wpm-error{margin-inline:14px}}
@media(max-width:480px){.wpm-panel>header p{display:none}.wpm-list article{grid-template-columns:44px minmax(0,1fr)}.wpm-avatar{width:44px;height:44px}.wpm-list article>button,.wpm-enrolled{grid-column:1/-1;min-height:44px}.wpm-summary span{padding:0 8px;font-size:9.5px}}
`;
