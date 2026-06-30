"use client";

import { useEffect, useRef, useState } from "react";

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
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("");
}

function getAvColor(name: string, role: string) {
  if (role === "SCHOOL_ADMIN") return { bg: "linear-gradient(135deg,#C8A96A,#E5B93C)", text: "#1A0D00" };
  if (role === "TEACHER") return { bg: "#0B0B0C", text: "#C8A96A" };
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}

function roleLabel(role: string) {
  if (role === "SCHOOL_ADMIN") return "Admin";
  if (role === "TEACHER") return "Teacher";
  return "Student";
}

export function ProfileAvatar({
  author,
  size = 40,
  isAdminSelf = false,
  lang = "sq",
  alignEnd = false,
}: {
  author: HubAuthor;
  size?: number;
  isAdminSelf?: boolean;
  lang?: Lang;
  alignEnd?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<HubProfile | null>(null);
  const [error, setError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const col = getAvColor(author.full_name, author.role);
  const isAdmin = author.role === "SCHOOL_ADMIN";
  const isStaff = author.role === "TEACHER" || isAdmin;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const loadProfile = async () => {
    setOpen(true);
    if (profile || loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/hub/profiles/${author.id}`);
      if (!res.ok) throw new Error("profile");
      const data = await res.json();
      setProfile(data.profile ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const p = profile ?? { ...author, email: null, class: null, classes: [], groups: [] };
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <button
        type="button"
        onClick={loadProfile}
        aria-label={`Open ${author.full_name} profile`}
        style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer", borderRadius: "999px" }}
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
          ref={cardRef}
          dir={dir}
          style={{
            position: "absolute",
            zIndex: 500,
            insetInlineStart: alignEnd ? undefined : 0,
            insetInlineEnd: alignEnd ? 0 : undefined,
            top: `calc(${size}px + 10px)`,
            width: 286,
            maxWidth: "calc(100vw - 24px)",
            borderRadius: 24,
            border: "1px solid rgba(184,155,94,.22)",
            background: "linear-gradient(145deg,rgba(255,255,255,.98),rgba(255,248,231,.96))",
            boxShadow: "0 24px 70px rgba(28,20,8,.24)",
            overflow: "hidden",
            color: "#171716",
            textAlign: "start",
          }}
        >
          <div style={{ height: 58, background: "linear-gradient(135deg,#171716,#4B3718)" }} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close profile"
            style={{
              position: "absolute",
              top: 10,
              insetInlineEnd: 10,
              width: 30,
              height: 30,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(255,255,255,.12)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            x
          </button>

          <div style={{ padding: "0 18px 18px" }}>
            <div style={{ marginTop: -31, display: "flex", alignItems: "flex-end", gap: 12 }}>
              <span
                className={`av ${isAdminSelf ? "av-admin-self" : ""}`}
                style={{
                  width: 66,
                  height: 66,
                  minWidth: 66,
                  fontSize: 22,
                  background: col.bg,
                  color: col.text,
                  boxShadow: "0 12px 24px rgba(0,0,0,.20),0 0 0 4px #fff",
                }}
              >
                {p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="av-img" src={p.avatar_url} alt="" />
                ) : initials(p.full_name)}
              </span>
              <span style={{
                marginBottom: 4,
                borderRadius: 999,
                padding: "5px 10px",
                background: "rgba(200,169,106,.16)",
                color: "#6B4F1E",
                fontSize: 11,
                fontWeight: 900,
              }}>
                {roleLabel(p.role)}
              </span>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.25 }}>{p.full_name}</div>
              <div style={{ marginTop: 5, color: "#85745D", fontSize: 12, wordBreak: "break-word" }}>
                {loading ? "Loading profile..." : error ? "Could not load profile details." : p.email ?? "No email available"}
              </div>
            </div>

            {!loading && !error && (
              <div style={{ marginTop: 15, display: "grid", gap: 10 }}>
                {p.class && <InfoBlock label="Class" values={[p.class.name]} />}
                {p.classes.length > 0 && <InfoBlock label="Classes" values={p.classes.map((c) => c.name)} />}
                {p.groups.length > 0 && <InfoBlock label="Teacher groups" values={p.groups.map((g) => g.name)} />}
                {p.role === "TEACHER" && p.classes.length === 0 && p.groups.length === 0 && (
                  <InfoBlock label="Teacher info" values={["No classes or groups assigned yet"]} />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}

function InfoBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div style={{ borderRadius: 16, background: "rgba(246,240,230,.76)", padding: "10px 12px" }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: "#9A7A35", textTransform: "uppercase", letterSpacing: ".06em" }}>
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>
        {values.map((value) => (
          <span key={value} style={{
            borderRadius: 999,
            padding: "5px 9px",
            background: "#fff",
            border: "1px solid rgba(184,155,94,.16)",
            color: "#2A1A0A",
            fontSize: 12,
            fontWeight: 800,
          }}>
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}
