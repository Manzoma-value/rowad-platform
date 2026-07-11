"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/language-context";

interface ProfileData {
  id: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  avatar_path: string | null;
  created_at: string;
  email?: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
}

function formatDate(d: string, lang: string) {
  return new Date(d).toLocaleDateString(lang === "ar" ? "ar-SA-u-nu-latn" : "sq-AL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const c = {
  ar: {
    section: "الحساب الشخصي",
    title: "ملفي الشخصي",
    role: "مدير الجهة",
    basicInfo: "المعلومات الأساسية",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    permission: "الصلاحية",
    joinDate: "تاريخ الانضمام",
    security: "الأمان",
    password: "كلمة المرور",
    change: "تغيير",
    accountType: "نوع الحساب",
    profileComp: "اكتمال الملف الشخصي",
    addPhoto: "أضف صورة شخصية لإكمال ملفك",
    upload: "رفع صورة",
    changePhoto: "تغيير الصورة",
    remove: "إزالة الصورة",
    uploading: "جارٍ الرفع",
    view: "عرض",
    drag: "أو اسحب الصورة وأفلتها هنا",
    fileRules: "PNG · JPG · WEBP · حتى 5 ميغابايت",
    complete: "مكتمل",
    toastOk: "تم تحديث الصورة بنجاح",
    toastRemove: "تمت إزالة الصورة",
    toastErr: "فشل رفع الصورة، حاول مجدداً",
    toastRemErr: "فشلت الإزالة",
    toastType: "يُسمح فقط برفع صور",
    toastSize: "حجم الصورة يتجاوز 5 ميغابايت",
  },
  sq: {
    section: "Llogaria ime",
    title: "Profili im",
    role: "Drejtori i Institucionit",
    basicInfo: "Të dhënat bazë",
    fullName: "Emri i plotë",
    email: "Email",
    permission: "Roli",
    joinDate: "Data e regjistrimit",
    security: "Siguria",
    password: "Fjalëkalimi",
    change: "Ndrysho",
    accountType: "Lloji i llogarisë",
    profileComp: "Plotësia e profilit",
    addPhoto: "Shto foto profili për ta plotësuar",
    upload: "Ngarko foto",
    changePhoto: "Ndrysho foton",
    remove: "Hiq foton",
    uploading: "Duke ngarkuar",
    view: "Shiko",
    drag: "ose tërhiq dhe lësho foton këtu",
    fileRules: "PNG · JPG · WEBP · Maks 5MB",
    complete: "Plotë",
    toastOk: "Foto u përditësua me sukses",
    toastRemove: "Foto u hoq",
    toastErr: "Ngarkimi dështoi, provo përsëri",
    toastRemErr: "Heqja dështoi",
    toastType: "Lejohen vetëm imazhe",
    toastSize: "Imazhi tejkalon 5MB",
  },
};

export default function SchoolAdminProfilePage() {
  const { lang } = useLang();
  const tr = c[lang === "sq" ? "sq" : "ar"];
  const isRtl = lang !== "sq";

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d?.profile) setProfile({ ...d.profile, email: d.email });
      })
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleUpload(file: File) {
    if (!profile) return;
    if (!file.type.startsWith("image/")) {
      showToast(tr.toastType, false);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(tr.toastSize, false);
      return;
    }

    setUploading(true);
    try {
      if (profile.avatar_path) {
        await supabase.storage.from("avatars").remove([profile.avatar_path]);
      }
      const ext = file.name.split(".").pop();
      const path = `profiles/${profile.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatar_url: urlData.publicUrl,
          avatar_path: path,
        }),
      });
      if (!res.ok) throw new Error();
      setProfile((p) =>
        p ? { ...p, avatar_url: urlData.publicUrl, avatar_path: path } : p,
      );
      showToast(tr.toastOk, true);
    } catch {
      showToast(tr.toastErr, false);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!profile) return;
    setRemoving(true);
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProfile((p) =>
        p ? { ...p, avatar_url: null, avatar_path: null } : p,
      );
      showToast(tr.toastRemove, true);
    } catch {
      showToast(tr.toastRemErr, false);
    } finally {
      setRemoving(false);
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [profile],
  );

  if (loading)
    return (
      <div className="pf-loading">
        <div className="pf-spin" />
        <style>{`@keyframes sp{to{transform:rotate(360deg)}}.pf-loading{display:flex;align-items:center;justify-content:center;min-height:60vh}.pf-spin{width:32px;height:32px;border:2.5px solid rgba(184,160,130,0.2);border-top-color:#B8A082;border-radius:50%;animation:sp 0.75s linear infinite}`}</style>
      </div>
    );

  if (!profile) return null;

  const initials = getInitials(profile.full_name);
  const pct = profile.avatar_url ? "100%" : "80%";

  return (
    <div className="pf-root" dir={isRtl ? "rtl" : "ltr"}>
      {/* Toast */}
      {toast && (
        <div className={`pf-toast ${toast.ok ? "pf-ok" : "pf-err"}`}>
          <span className="pf-toast-dot" />
          {toast.msg}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && profile.avatar_url && (
        <div className="pf-lb-back" onClick={() => setLightbox(false)}>
          <div className="pf-lb-box" onClick={(e) => e.stopPropagation()}>
            <button className="pf-lb-close" onClick={() => setLightbox(false)}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="pf-lb-img">
              <Image
                src={profile.avatar_url}
                alt={profile.full_name}
                width={420}
                height={420}
                style={{
                  objectFit: "cover",
                  width: "100%",
                  height: "100%",
                  borderRadius: 20,
                }}
              />
            </div>
            <p className="pf-lb-name">{profile.full_name}</p>
          </div>
        </div>
      )}

      {/* Page head */}
      <div className="pf-head">
        <span className="pf-head-label">{tr.section}</span>
        <h1 className="pf-head-title">{tr.title}</h1>
        <div className="pf-head-rule">
          <div className="pf-rule-line" />
          <div className="pf-rule-diamond" />
          <div className="pf-rule-line pf-rule-fade" />
        </div>
      </div>

      <div className="pf-layout">
        {/* LEFT */}
        <div className="pf-left">
          <div className="pf-av-card">
            <div className="pf-card-topline" />
            <div className="pf-wmark" aria-hidden="true">
              <svg viewBox="0 0 200 200" fill="none" width="100%" height="100%">
                <circle
                  cx="100"
                  cy="100"
                  r="95"
                  stroke="#B8A082"
                  strokeWidth="0.5"
                  opacity="0.1"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="78"
                  stroke="#B8A082"
                  strokeWidth="0.4"
                  strokeDasharray="4 7"
                  opacity="0.08"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="58"
                  stroke="#B8A082"
                  strokeWidth="0.3"
                  opacity="0.07"
                />
                {Array.from({ length: 8 }, (_, i) => {
                  const a = (i * 45 * Math.PI) / 180;
                  return (
                    <circle
                      key={i}
                      cx={Math.round((100 + 52 * Math.sin(a)) * 100) / 100}
                      cy={Math.round((100 - 52 * Math.cos(a)) * 100) / 100}
                      r="50"
                      stroke="#B8A082"
                      strokeWidth="0.3"
                      opacity="0.055"
                      fill="none"
                    />
                  );
                })}
                <circle
                  cx="100"
                  cy="100"
                  r="28"
                  stroke="#B8A082"
                  strokeWidth="0.3"
                  opacity="0.1"
                />
              </svg>
            </div>

            {/* Avatar */}
            <div
              className={`pf-av-zone${dragOver ? " drag-on" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="pf-av-ring">
                {uploading ? (
                  <div className="pf-av-load">
                    <div className="pf-av-spin" />
                    <span>{tr.uploading}</span>
                  </div>
                ) : profile.avatar_url ? (
                  <button
                    className="pf-av-btn"
                    onClick={() => setLightbox(true)}
                  >
                    <Image
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      width={148}
                      height={148}
                      style={{
                        objectFit: "cover",
                        width: "100%",
                        height: "100%",
                      }}
                    />
                    <div className="pf-av-hover">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                      <span>{tr.view}</span>
                    </div>
                  </button>
                ) : (
                  <div className="pf-av-initials">{initials}</div>
                )}
              </div>
              {dragOver && <div className="pf-drag-ring" />}
            </div>

            <h2 className="pf-av-name">{profile.full_name}</h2>
            <div className="pf-av-badge">{tr.role}</div>

            <div className="pf-sep">
              <div className="pf-sep-line" />
              <div className="pf-sep-dot" />
              <div className="pf-sep-line" />
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />

            <div className="pf-actions">
              <button
                className="pf-btn-primary"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <div className="pf-spin-w" />
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                )}
                {profile.avatar_url ? tr.changePhoto : tr.upload}
              </button>
              {profile.avatar_url && (
                <button
                  className="pf-btn-danger"
                  onClick={handleRemove}
                  disabled={removing}
                >
                  {removing ? (
                    <div className="pf-spin-r" />
                  ) : (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                    </svg>
                  )}
                  {tr.remove}
                </button>
              )}
            </div>

            <div className="pf-file-hint">{tr.fileRules}</div>
            <p className="pf-drag-label">{tr.drag}</p>
          </div>

          {/* Completeness */}
          <div className="pf-comp-card">
            <div className="pf-comp-row">
              <span className="pf-comp-label">{tr.profileComp}</span>
              <span className="pf-comp-pct">{pct}</span>
            </div>
            <div className="pf-bar-bg">
              <div className="pf-bar-fill" style={{ width: pct }} />
            </div>
            {!profile.avatar_url && (
              <p className="pf-comp-hint">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
                {tr.addPhoto}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="pf-right">
          {/* Basic info */}
          <div className="pf-card">
            <div className="pf-card-topline" />
            <div className="pf-card-hd">
              <div className="pf-card-ico">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                >
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <span className="pf-card-title">{tr.basicInfo}</span>
            </div>
            <div className="pf-rows">
              <div className="pf-row">
                <div className="pf-row-ico">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  >
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="pf-row-body">
                  <span className="pf-row-lbl">{tr.fullName}</span>
                  <span className="pf-row-val">{profile.full_name}</span>
                </div>
              </div>

              {profile.email && (
                <div className="pf-row">
                  <div className="pf-row-ico">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <div className="pf-row-body">
                    <span className="pf-row-lbl">{tr.email}</span>
                    <span className="pf-row-val">{profile.email}</span>
                  </div>
                </div>
              )}

              <div className="pf-row">
                <div className="pf-row-ico">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="pf-row-body">
                  <span className="pf-row-lbl">{tr.permission}</span>
                  <span className="pf-row-val">
                    <span className="pf-role-pill">{tr.role}</span>
                  </span>
                </div>
              </div>

              <div className="pf-row pf-row-last">
                <div className="pf-row-ico">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="pf-row-body">
                  <span className="pf-row-lbl">{tr.joinDate}</span>
                  <span className="pf-row-val">
                    {formatDate(profile.created_at, lang)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="pf-card">
            <div className="pf-card-topline" />
            <div className="pf-stats">
              <div className="pf-stat">
                <div className="pf-stat-ico">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <span className="pf-stat-val">{tr.role}</span>
                <span className="pf-stat-lbl">{tr.accountType}</span>
              </div>
              <div className="pf-stat-div" />
              <div className="pf-stat">
                <div className="pf-stat-ico">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <span className="pf-stat-val">
                  {formatDate(profile.created_at, lang)}
                </span>
                <span className="pf-stat-lbl">{tr.joinDate}</span>
              </div>
              <div className="pf-stat-div" />
              <div className="pf-stat">
                <div
                  className="pf-stat-ico"
                  style={{ color: profile.avatar_url ? "#6B1E2D" : "#8B6F32" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  >
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <span
                  className="pf-stat-val"
                  style={{ color: profile.avatar_url ? "#6B1E2D" : "#8B6F32" }}
                >
                  {profile.avatar_url ? tr.complete : pct}
                </span>
                <span className="pf-stat-lbl">{tr.profileComp}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeUp {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes toastIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes lbIn  {from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}
@keyframes sp    {to{transform:rotate(360deg)}}
@keyframes pulse {0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}

:root{
  --gold:#B8A082;--gold2:#B8A082;
  --gold-border:rgba(184,160,130,0.2);
  --bg-card:#FFFBF5;
  --text:#1A1A1A;--text2:#655B53;--text3:#8C8274;
  --border:rgba(26,26,26,0.08);--border-med:rgba(26,26,26,0.13);
  --font:'Cairo',sans-serif;
  --r-lg:22px;--r-xl:28px;
}

.pf-root{min-height:100vh;padding:36px 40px 80px;font-family:var(--font);animation:fadeUp 0.35s cubic-bezier(0.22,1,0.36,1)}

/* Head */
.pf-head{margin-bottom:36px}
.pf-head-label{display:block;font-size:10.5px;font-weight:700;letter-spacing:2.8px;text-transform:uppercase;color:var(--gold);margin-bottom:9px}
.pf-head-title{font-size:28px;font-weight:900;color:var(--text);letter-spacing:-0.4px;margin-bottom:16px}
.pf-head-rule{display:flex;align-items:center;gap:10px;max-width:260px}
.pf-rule-line{width:80px;height:1px;background:linear-gradient(270deg,var(--gold),transparent)}
.pf-rule-fade{flex:1;background:transparent}
.pf-rule-diamond{width:5px;height:5px;background:var(--gold);transform:rotate(45deg);flex-shrink:0;opacity:0.7}

/* Layout */
.pf-layout{display:grid;grid-template-columns:300px 1fr;gap:26px;align-items:start}

/* Avatar card */
.pf-av-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-xl);padding:32px 24px 24px;text-align:center;position:relative;overflow:hidden;box-shadow:0 20px 50px rgba(26,26,26,0.05)}
.pf-card-topline{position:absolute;top:0;left:15%;right:15%;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent)}
.pf-wmark{position:absolute;top:-30px;left:-30px;width:210px;height:210px;pointer-events:none}

.pf-av-zone{position:relative;width:fit-content;margin:0 auto 22px}
.pf-av-ring{width:148px;height:148px;border-radius:50%;border:2px solid var(--gold-border);background:rgba(184,160,130,0.06);overflow:hidden;display:flex;align-items:center;justify-content:center;margin:0 auto;position:relative;z-index:1;transition:border-color 0.2s,box-shadow 0.2s}
.pf-av-zone.drag-on .pf-av-ring{border-color:var(--gold);box-shadow:0 0 0 4px rgba(184,160,130,0.12)}
.pf-drag-ring{position:absolute;inset:-8px;border-radius:50%;border:2px dashed rgba(184,160,130,0.45);animation:pulse 1.2s ease infinite;pointer-events:none;z-index:0}
.pf-av-initials{font-size:44px;font-weight:900;color:var(--gold);user-select:none;line-height:1}
.pf-av-btn{width:100%;height:100%;background:none;border:none;cursor:pointer;padding:0;position:relative;overflow:hidden}
.pf-av-hover{position:absolute;inset:0;background:rgba(26,26,26,0.52);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:#fff;font-size:12px;font-weight:700;font-family:var(--font);opacity:0;transition:opacity 0.2s}
.pf-av-btn:hover .pf-av-hover{opacity:1}
.pf-av-load{display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--gold);font-size:11px;font-weight:600;font-family:var(--font)}
.pf-av-spin{width:36px;height:36px;border:2.5px solid rgba(184,160,130,0.15);border-top-color:var(--gold);border-radius:50%;animation:sp 0.75s linear infinite}

.pf-av-name{font-size:18px;font-weight:900;color:var(--text);margin-bottom:9px;letter-spacing:-0.2px;position:relative;z-index:1}
.pf-av-badge{display:inline-block;font-size:11px;font-weight:700;color:#8B6F32;background:rgba(184,160,130,0.13);border:1px solid rgba(184,160,130,0.24);border-radius:999px;padding:4px 14px;letter-spacing:0.5px;margin-bottom:22px;position:relative;z-index:1}
.pf-sep{display:flex;align-items:center;gap:8px;margin:0 0 22px}
.pf-sep-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(184,160,130,0.15),transparent)}
.pf-sep-dot{width:4px;height:4px;background:rgba(184,160,130,0.3);transform:rotate(45deg);flex-shrink:0}

.pf-actions{display:flex;flex-direction:column;gap:10px;position:relative;z-index:1}
.pf-btn-primary{display:flex;align-items:center;justify-content:center;gap:8px;padding:11px 22px;border-radius:999px;background:var(--text);color:#FFFBF5;border:none;font-size:13px;font-weight:700;font-family:var(--font);cursor:pointer;transition:all 0.18s;box-shadow:0 8px 24px rgba(26,26,26,0.14)}
.pf-btn-primary:hover:not(:disabled){background:#1F2328;transform:translateY(-1px);box-shadow:0 12px 30px rgba(26,26,26,0.2)}
.pf-btn-primary:disabled{opacity:0.5;cursor:not-allowed}
.pf-btn-danger{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 22px;border-radius:999px;background:transparent;color:rgba(107,30,45,0.65);border:1px solid rgba(107,30,45,0.16);font-size:12.5px;font-weight:600;font-family:var(--font);cursor:pointer;transition:all 0.18s}
.pf-btn-danger:hover:not(:disabled){background:rgba(107,30,45,0.05);color:#6B1E2D;border-color:rgba(107,30,45,0.28)}
.pf-btn-danger:disabled{opacity:0.5;cursor:not-allowed}
.pf-spin-w{width:13px;height:13px;border:2px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:sp 0.7s linear infinite}
.pf-spin-r{width:12px;height:12px;border:2px solid rgba(107,30,45,0.15);border-top-color:#6B1E2D;border-radius:50%;animation:sp 0.7s linear infinite}
.pf-file-hint{margin-top:14px;font-size:11px;color:var(--text3);position:relative;z-index:1}
.pf-drag-label{margin-top:5px;font-size:11px;color:var(--text3);position:relative;z-index:1}

/* Completeness */
.pf-comp-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px 22px;margin-top:16px;box-shadow:0 10px 28px rgba(26,26,26,0.04)}
.pf-comp-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.pf-comp-label{font-size:11px;font-weight:700;color:var(--text3)}
.pf-comp-pct{font-size:17px;font-weight:900;color:var(--gold)}
.pf-bar-bg{height:4px;border-radius:99px;background:rgba(184,160,130,0.1);overflow:hidden;margin-bottom:10px}
.pf-bar-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--gold),var(--gold2));transition:width 1s cubic-bezier(0.22,1,0.36,1)}
.pf-comp-hint{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--text3)}
.pf-comp-hint svg{flex-shrink:0;color:var(--gold)}

/* Right */
.pf-right{display:flex;flex-direction:column;gap:20px}
.pf-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-xl);padding:28px;position:relative;overflow:hidden;box-shadow:0 16px 40px rgba(26,26,26,0.04)}
.pf-card-hd{display:flex;align-items:center;gap:12px;margin-bottom:22px}
.pf-card-ico{width:36px;height:36px;border-radius:10px;background:rgba(184,160,130,0.08);border:1px solid rgba(184,160,130,0.15);display:flex;align-items:center;justify-content:center;color:var(--gold);flex-shrink:0}
.pf-card-title{font-size:13px;font-weight:800;color:var(--text);letter-spacing:0.2px}
.pf-rows{display:flex;flex-direction:column}
.pf-row{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--border)}
.pf-row-last{border-bottom:none;padding-bottom:0}
.pf-row-ico{width:34px;height:34px;border-radius:9px;flex-shrink:0;background:rgba(26,26,26,0.03);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text2)}
.pf-row-body{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
.pf-row-lbl{font-size:10.5px;font-weight:700;color:var(--text3);letter-spacing:0.3px}
.pf-row-val{font-size:14px;font-weight:700;color:var(--text)}
.pf-role-pill{display:inline-block;font-size:12px;font-weight:700;color:#8B6F32;background:rgba(184,160,130,0.12);border-radius:6px;padding:3px 10px}
.pf-sec-row{display:flex;align-items:center;gap:14px}
.pf-sec-ico{width:42px;height:42px;border-radius:12px;flex-shrink:0;background:rgba(26,26,26,0.03);border:1px solid var(--border-med);display:flex;align-items:center;justify-content:center;color:var(--text2)}
.pf-sec-body{flex:1;display:flex;flex-direction:column;gap:3px}
.pf-sec-title{font-size:14px;font-weight:700;color:var(--text)}
.pf-sec-dots{font-size:12px;color:var(--text3);letter-spacing:3px}
.pf-btn-sm{padding:8px 18px;border-radius:999px;border:1px solid var(--border-med);background:none;color:var(--text2);font-size:12.5px;font-weight:700;font-family:var(--font);cursor:pointer;transition:all 0.15s;flex-shrink:0}
.pf-btn-sm:hover{background:rgba(184,160,130,0.06);border-color:var(--gold-border);color:var(--text)}

/* Stats */
.pf-stats{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:center}
.pf-stat{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 12px;text-align:center}
.pf-stat-ico{width:38px;height:38px;border-radius:12px;background:rgba(184,160,130,0.07);border:1px solid rgba(184,160,130,0.13);display:flex;align-items:center;justify-content:center;color:var(--gold);margin-bottom:2px}
.pf-stat-val{font-size:13px;font-weight:800;color:var(--text)}
.pf-stat-lbl{font-size:10.5px;font-weight:600;color:var(--text3)}
.pf-stat-div{width:1px;height:60px;background:linear-gradient(180deg,transparent,rgba(184,160,130,0.2),transparent)}

/* Toast */
.pf-toast{position:fixed;top:24px;left:28px;z-index:9999;display:flex;align-items:center;gap:10px;padding:13px 20px;border-radius:12px;font-size:13.5px;font-weight:700;font-family:var(--font);box-shadow:0 16px 44px rgba(26,26,26,0.14);animation:toastIn 0.28s cubic-bezier(0.22,1,0.36,1)}
.pf-ok{background:#FFFBF5;border:1px solid rgba(31,78,82,0.22);color:#6B1E2D}
.pf-err{background:#FFFBF5;border:1px solid rgba(107,30,45,0.22);color:#6B1E2D}
.pf-toast-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.pf-ok .pf-toast-dot{background:#6B1E2D}
.pf-err .pf-toast-dot{background:#6B1E2D}

/* Lightbox */
.pf-lb-back{position:fixed;inset:0;z-index:9999;background:rgba(26,26,26,0.78);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeUp 0.2s ease;cursor:pointer}
.pf-lb-box{position:relative;cursor:default;animation:lbIn 0.25s cubic-bezier(0.22,1,0.36,1);text-align:center}
.pf-lb-close{position:absolute;top:-14px;left:-14px;width:36px;height:36px;border-radius:50%;background:rgba(184,160,130,0.12);border:1px solid rgba(184,160,130,0.28);color:var(--gold);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.15s;z-index:1}
.pf-lb-close:hover{background:rgba(184,160,130,0.26)}
.pf-lb-img{width:420px;height:420px;border-radius:20px;overflow:hidden}
.pf-lb-name{margin-top:16px;font-size:15px;font-weight:700;color:rgba(255,255,255,0.88);font-family:var(--font)}

@media(max-width:900px){.pf-layout{grid-template-columns:1fr}.pf-root{padding:24px 18px 60px}}
@media(max-width:600px){
  .pf-root{padding:18px 14px 56px}
  .pf-stats{grid-template-columns:1fr;gap:12px}
  .pf-stat-div{display:none}
  .pf-lb-img{width:260px;height:260px}
  .pf-lb-name{font-size:14px;margin-top:12px}
}
@media(max-width:400px){
  .pf-root{padding:14px 12px 48px}
  .pf-lb-img{width:230px;height:230px}
}
`;
