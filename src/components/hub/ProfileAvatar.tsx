"use client";

// Hub avatar with a centered profile-card modal.
//
// What it was before this rewrite:
//   The popup used `position: absolute` anchored to the avatar with
//   `top: calc(size+10px)`. Inside a chat-row the avatar's parent column
//   was narrow and overflow-hidden, so the popup got clipped/squeezed —
//   producing the broken "tiny avatar + giant cream block" UI the user
//   screenshot showed.
//
// What it is now:
//   On click we open a CENTERED fixed-position modal (document body),
//   independent of the chat row layout. The same hub profile API
//   (/api/hub/profiles/[id]) is still used to load class/groups/email.
//   Bilingual labels (AR / SQ), Escape + outside-click + X to close,
//   body scroll locked while open.

import { useEffect, useState } from "react";

type Lang = "ar" | "sq";

export interface HubAuthor {
  id: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
}

interface HubProfile extends HubAuthor {
  email: string | null;
  class: { id: string; name: string } | null;
  classes: { id: string; name: string }[];
  groups: { id: string; name: string }[];
}

const AV_COLORS = [
  { bg: "#D4A96A", text: "#3D1A00" },
  { bg: "#7BAF7B", text: "#0D2A0D" },
  { bg: "#B87A6B", text: "#2A0D0A" },
  { bg: "#9B7BB8", text: "#1A0A2A" },
  { bg: "#B8A46B", text: "#2A1F00" },
  { bg: "#6BA8A8", text: "#0A2020" },
  { bg: "#B86B8A", text: "#2A0A15" },
  { bg: "#6B9BB8", text: "#0A2535" },
];

function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("");
}

function getAvColor(name: string, role: string) {
  if (role === "SCHOOL_ADMIN") return { bg: "linear-gradient(135deg,#C8A96A,#E5B93C)", text: "#1A0D00" };
  if (role === "TEACHER") return { bg: "#0B0B0C", text: "#C8A96A" };
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}

const L10N = {
  ar: {
    close: "إغلاق",
    roleAdmin: "مشرف",
    roleTeacher: "معلم",
    roleStudent: "طالب",
    roleOwner: "مالك",
    classLabel: "الفصل",
    classesLabel: "الفصول",
    groupsLabel: "مجموعات المعلمين",
    noEmail: "لا يوجد بريد إلكتروني",
    loading: "جارٍ التحميل…",
    error: "تعذّر تحميل الملف الشخصي.",
  },
  sq: {
    close: "Mbyll",
    roleAdmin: "Drejtori",
    roleTeacher: "Mësues",
    roleStudent: "Nxënës",
    roleOwner: "Pronari",
    classLabel: "Klasa",
    classesLabel: "Klasat",
    groupsLabel: "Grupet e mësuesve",
    noEmail: "Pa email",
    loading: "Po ngarkohet…",
    error: "Profili nuk u ngarkua.",
  },
} as const;

function roleLabel(role: string, t: typeof L10N.ar | typeof L10N.sq): string {
  if (role === "SCHOOL_ADMIN") return t.roleAdmin;
  if (role === "TEACHER") return t.roleTeacher;
  if (role === "STUDENT") return t.roleStudent;
  if (role === "OWNER") return t.roleOwner;
  return role;
}

export function ProfileAvatar({
  author,
  size = 40,
  isAdminSelf = false,
  lang = "sq",
}: {
  author: HubAuthor;
  size?: number;
  isAdminSelf?: boolean;
  lang?: Lang;
  /** kept for API back-compat — no longer used since the modal is centered */
  alignEnd?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<HubProfile | null>(null);
  const [error, setError] = useState(false);

  const col = getAvColor(author.full_name, author.role);
  const isAdmin = author.role === "SCHOOL_ADMIN";
  const isStaff = author.role === "TEACHER" || isAdmin;

  // Lock body scroll + Escape-to-close while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleOpen = async () => {
    setOpen(true);
    if (profile || loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/hub/profiles/${author.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("profile");
      const data = await res.json();
      setProfile(data.profile ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const t = L10N[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const p = profile ?? { ...author, email: null, class: null, classes: [], groups: [] };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Open ${author.full_name} profile`}
        className="hpa-trigger"
        style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer", borderRadius: "999px", display: "inline-flex", flexShrink: 0 }}
      >
        <span
          className={`av ${isAdminSelf ? "av-admin-self" : ""}`}
          style={{ width: size, height: size, minWidth: size, fontSize: size * 0.36, background: col.bg, color: col.text }}
        >
          {author.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="av-img" src={author.avatar_url} alt="" />
          ) : initials(author.full_name)}
          {isStaff && <span className={`av-badge ${isAdmin ? "av-badge-admin" : ""}`}>{isAdmin ? "*" : "+"}</span>}
        </span>
      </button>

      {open && (
        <div
          className="hpa-overlay"
          dir={dir}
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div className="hpa-card" onClick={(e) => e.stopPropagation()}>
            <div className="hpa-band" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.close}
              className="hpa-x"
            >×</button>

            <div className="hpa-body">
              <div className="hpa-id-row">
                <span
                  className="av hpa-big-av"
                  style={{ background: col.bg, color: col.text }}
                >
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="av-img" src={p.avatar_url} alt="" />
                  ) : initials(p.full_name)}
                </span>
                <span className={`hpa-role-pill hpa-role-${p.role}`}>
                  {roleLabel(p.role, t)}
                </span>
              </div>

              <div className="hpa-name-wrap">
                <div className="hpa-name">{p.full_name}</div>
                <div className="hpa-email">
                  {loading ? t.loading : error ? t.error : (p.email ?? t.noEmail)}
                </div>
              </div>

              {!loading && !error && (
                <div className="hpa-blocks">
                  {p.class && <InfoBlock label={t.classLabel} values={[p.class.name]} />}
                  {p.classes.length > 0 && <InfoBlock label={t.classesLabel} values={p.classes.map((c) => c.name)} />}
                  {p.groups.length > 0 && <InfoBlock label={t.groupsLabel} values={p.groups.map((g) => g.name)} />}
                </div>
              )}
            </div>
          </div>

          <style>{css}</style>
        </div>
      )}
    </>
  );
}

function InfoBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="hpa-block">
      <div className="hpa-block-label">{label}</div>
      <div className="hpa-chips">
        {values.map((value) => (
          <span key={value} className="hpa-chip">{value}</span>
        ))}
      </div>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

.hpa-overlay {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  background: rgba(11,11,12,0.55);
  backdrop-filter: blur(8px);
  animation: hpa-fade .18s ease;
  font-family: 'Cairo', 'Tajawal', sans-serif;
}
@keyframes hpa-fade { from { opacity: 0; } to { opacity: 1; } }

.hpa-card {
  position: relative;
  width: 100%; max-width: 380px;
  border-radius: 20px;
  overflow: hidden;
  background: linear-gradient(165deg, #FFFDF8 0%, #F7F1E3 100%);
  border: 1.5px solid #C0A063;
  box-shadow:
    0 22px 70px rgba(0,0,0,0.32),
    inset 0 0 0 4px #EFE6D1,
    inset 0 0 0 5.5px rgba(194,160,89,0.4);
  animation: hpa-pop .22s cubic-bezier(.22,1,.36,1);
}
@keyframes hpa-pop {
  from { opacity: 0; transform: scale(.94) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.hpa-band {
  height: 70px;
  background: linear-gradient(135deg, #171716 0%, #4B3718 100%);
}
.hpa-x {
  position: absolute; top: 10px; inset-inline-end: 12px; z-index: 2;
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(255,255,255,0.14);
  border: 1px solid rgba(255,255,255,0.20);
  color: #fff; font-size: 22px; font-weight: 800; line-height: 1;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  padding: 0;
  transition: background .15s;
}
.hpa-x:hover { background: rgba(255,255,255,0.24); }

.hpa-body { padding: 0 22px 22px; }

.hpa-id-row {
  margin-top: -34px;
  display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;
}
.hpa-big-av {
  width: 78px !important; height: 78px !important; min-width: 78px;
  font-size: 26px !important;
  box-shadow: 0 10px 24px rgba(0,0,0,0.25), 0 0 0 4px #FFFDF8;
}
.hpa-role-pill {
  margin-bottom: 4px;
  font-size: 11px; font-weight: 900; letter-spacing: 0.04em;
  padding: 5px 12px; border-radius: 999px;
}
.hpa-role-TEACHER      { background: rgba(20,80,140,0.12); color: #14528C; }
.hpa-role-SCHOOL_ADMIN { background: rgba(229,185,60,0.20); color: #8E6C36; }
.hpa-role-STUDENT      { background: rgba(122,30,30,0.10); color: #7A1E1E; }
.hpa-role-OWNER        { background: rgba(8,11,12,0.10);   color: #1B1810; }

.hpa-name-wrap { margin-top: 14px; }
.hpa-name { font-size: 18px; font-weight: 900; color: #1B1810; line-height: 1.3; word-break: break-word; }
.hpa-email { margin-top: 4px; color: #85745D; font-size: 12.5px; word-break: break-word; }

.hpa-blocks { margin-top: 14px; display: grid; gap: 10px; }
.hpa-block {
  border-radius: 12px;
  background: rgba(246,240,230,0.76);
  padding: 10px 12px;
  border: 1px solid rgba(184,155,94,0.18);
}
.hpa-block-label {
  font-size: 10.5px; font-weight: 900; color: #9A7A35;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.hpa-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
.hpa-chip {
  border-radius: 999px;
  padding: 4px 10px;
  background: #fff;
  border: 1px solid rgba(184,155,94,0.32);
  color: #2A1A0A;
  font-size: 12px; font-weight: 800;
}
`;
