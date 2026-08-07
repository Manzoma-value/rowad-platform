"use client";

import { useEffect, useState } from "react";
import { LockKeyhole, Video as VideoIcon } from "lucide-react";
import MandalaLoader from "@/components/MandalaLoader";
import type { TeacherWorkshopVideo } from "@/lib/workshop-videos";
import { VideoQuizPlayer } from "./VideoQuizPlayer";

const T = {
  ar: {
    title: "فيديوهات الورشة التفاعلية",
    sub: "شاهد الفيديو وأجب عن الأسئلة التي تظهر أثناء التشغيل.",
    locked: "المحتوى متاح بعد التسجيل في الورشة",
    lockedSub: "امسح رمز QR الخاص بالورشة، وبعد ربط حسابك ستظهر لك الفيديوهات هنا.",
    noVideos: "لم تتم إضافة فيديوهات بعد.",
    error: "تعذر تحميل الفيديوهات.",
  },
  sq: {
    title: "Videot interaktive të forumit",
    sub: "Shiko videon dhe përgjigju pyetjeve që shfaqen gjatë shikimit.",
    locked: "Materialet hapen pas regjistrimit në forum",
    lockedSub: "Skano kodin QR të forumit. Pasi llogaria të lidhet, videot do të shfaqen këtu.",
    noVideos: "Nuk ka video ende.",
    error: "Videot nuk u ngarkuan.",
  },
} as const;

export function WorkshopVideoSection({ workshopId, hasAccess, lang }: { workshopId: string; hasAccess: boolean; lang: "ar" | "sq" }) {
  const t = T[lang];
  const [videos, setVideos] = useState<TeacherWorkshopVideo[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hasAccess) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/teacher/workshops/${workshopId}/videos`, { cache: "no-store" });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (!cancelled) setVideos(data.videos ?? []);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [workshopId, hasAccess]);

  return (
    <section id="workshop-videos" className="wvs-section">
      <div className="wvs-head">
        <div><h2>{t.title}</h2><p>{t.sub}</p></div>
      </div>
      {!hasAccess ? (
        <div className="wvs-locked">
          <LockKeyhole size={28} />
          <strong>{t.locked}</strong>
          <p>{t.lockedSub}</p>
        </div>
      ) : error ? (
        <div className="wvs-empty">{t.error}</div>
      ) : !videos ? (
        <MandalaLoader />
      ) : videos.length === 0 ? (
        <div className="wvs-empty"><VideoIcon size={22} />{t.noVideos}</div>
      ) : (
        <div className="wvs-list">
          {videos.map((video) => (
            <VideoQuizPlayer key={video.id} workshopId={workshopId} video={video} lang={lang} />
          ))}
        </div>
      )}
      <style>{styles}</style>
    </section>
  );
}

const styles = `
.wvs-section{margin-top:18px;padding-top:18px;border-top:1px solid #D9C9B0;font-family:'Cairo','Tajawal',sans-serif}
.wvs-head{margin-bottom:14px}
.wvs-head h2{font-size:19px;margin:0;color:#32101A}
.wvs-head p{font-size:11px;color:#796A62;margin:3px 0 0}
.wvs-locked,.wvs-empty{min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;text-align:center;padding:24px;background:#F7F3EB;color:#796A62;border:1px dashed #D9C9B0;border-radius:10px}
.wvs-locked svg{color:#6B1E2D}
.wvs-locked strong{font-size:13px;color:#32101A}
.wvs-locked p{max-width:600px;margin:0;font-size:11px;line-height:1.8}
.wvs-list{display:flex;flex-direction:column;gap:16px}
`;
