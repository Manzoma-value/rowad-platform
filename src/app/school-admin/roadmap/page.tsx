"use client";

import { useEffect, useState } from "react";
import { Icons } from "./components/icons";
import { StageCard } from "./components/stage-card";
import { css } from "./components/css";
import type { Roadmap } from "./components/types";

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageName, setStageName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/school-admin/roadmap");
      const data = await res.json();
      setRoadmap(data.roadmap ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(true);
  }, []);

  const createRoadmap = async () => {
    setCreating(true);
    try {
      await fetch("/api/school-admin/roadmap", { method: "POST" });
      await load();
    } finally {
      setCreating(false);
    }
  };

  const addStage = async () => {
    const title = stageName.trim();
    if (!title) return;
    await fetch("/api/school-admin/roadmap/stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setStageName("");
    await load();
  };

  const totalModules =
    roadmap?.stages.reduce((a, s) => a + s.modules.length, 0) ?? 0;
  const totalQuestions =
    roadmap?.stages.reduce(
      (a, s) =>
        a + s.modules.reduce((b, m) => b + (m.questions?.length ?? 0), 0),
      0,
    ) ?? 0;
  const totalContents =
    roadmap?.stages.reduce(
      (a, s) =>
        a + s.modules.reduce((b, m) => b + (m.contents?.length ?? 0), 0),
      0,
    ) ?? 0;

  if (loading)
    return (
      <div className="rb-loading" dir="rtl">
        <div className="rb-loading-inner">
          <span className="rb-spinner" />
          <span>جارٍ التحميل...</span>
        </div>
        <style>{css}</style>
      </div>
    );

  return (
    <div className="rb-page" dir="rtl">
      {/* No roadmap yet */}
      {!roadmap ? (
        <div className="rb-empty-full">
          <div className="rb-empty-icon-wrap">
            <span className="rb-empty-glow" />
            {Icons.map}
          </div>
          <h2 className="rb-empty-title">لا يوجد بنك أسئلة بعد</h2>
          <p className="rb-empty-sub">
            أنشئ خارطة الطريق التعليمية لمدرستك وابدأ في إضافة المراحل
            والمستويات
          </p>
          <button
            className="rb-btn-primary lg"
            onClick={createRoadmap}
            disabled={creating}
          >
            {creating ? (
              <>
                <span className="rb-btn-spinner" />
                جارٍ الإنشاء...
              </>
            ) : (
              <>{Icons.plus} إنشاء بنك الأسئلة</>
            )}
          </button>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="rb-header">
            <div className="rb-header-inner">
              <div className="rb-header-icon">{Icons.book}</div>
              <div>
                <h1 className="rb-page-title">{roadmap.title}</h1>
                <p className="rb-page-sub">
                  إدارة مراحل التعلم والوحدات وبنك الأسئلة
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="rb-stats">
            <div className="rb-stat gold">
              <div className="rb-stat-icon">{Icons.stages}</div>
              <div>
                <div className="rb-stat-num">{roadmap.stages.length}</div>
                <div className="rb-stat-label">المراحل</div>
              </div>
            </div>
            <div className="rb-stat red">
              <div className="rb-stat-icon">{Icons.modules}</div>
              <div>
                <div className="rb-stat-num">{totalModules}</div>
                <div className="rb-stat-label">المستويات</div>
              </div>
            </div>
            <div className="rb-stat dark">
              <div className="rb-stat-icon">{Icons.questions}</div>
              <div>
                <div className="rb-stat-num">{totalQuestions}</div>
                <div className="rb-stat-label">الأسئلة</div>
              </div>
            </div>
            <div className="rb-stat purple">
              <div className="rb-stat-icon">{Icons.content}</div>
              <div>
                <div className="rb-stat-num">{totalContents}</div>
                <div className="rb-stat-label">المحتوى</div>
              </div>
            </div>
          </div>

          {/* Stages */}
          <div className="rb-stages">
            <div className="rb-section-hd">
              <span className="rb-section-title">المراحل التعليمية</span>
              <span className="rb-section-count">{roadmap.stages.length}</span>
            </div>

            <div className="rb-stages-list">
              {roadmap.stages.length === 0 ? (
                <div className="rb-empty-sm">
                  {Icons.folder}
                  <p>لا توجد مراحل بعد</p>
                  <span>أضف أول مرحلة من الأسفل</span>
                </div>
              ) : (
                roadmap.stages.map((stage, i) => (
                  <StageCard
                    key={stage.id}
                    stage={stage}
                    stageIndex={i}
                    onRefresh={load}
                  />
                ))
              )}
            </div>

            {/* Add stage bar */}
            <div className="rb-add-stage-bar">
              <div className="rb-add-stage-icon">{Icons.plus}</div>
              <div className="rb-input-wrap">
                <input
                  className="rb-input"
                  dir="rtl"
                  placeholder="اسم المرحلة الجديدة..."
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStage()}
                />
              </div>
              <button
                className="rb-btn-primary"
                disabled={!stageName.trim()}
                onClick={addStage}
              >
                إضافة مرحلة
              </button>
            </div>
          </div>
        </>
      )}

      <style>{css}</style>
    </div>
  );
}
