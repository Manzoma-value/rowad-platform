"use client";

import { useState } from "react";
import { Icons } from "./icons";
import type { Stage } from "./types";
import { ModuleCard } from "./module-card";

interface Props {
  stage: Stage;
  stageIndex: number;
  onRefresh: () => void;
}

export function StageCard({ stage, stageIndex, onRefresh }: Props) {
  const [open, setOpen] = useState(true);
  const [moduleName, setModuleName] = useState("");
  const [adding, setAdding] = useState(false);

  const totalQuestions = stage.modules.reduce(
    (sum, m) => sum + (m.questions?.length ?? 0),
    0,
  );

  const deleteStage = async () => {
    if (
      !confirm(
        "هل أنت متأكد من حذف هذه المرحلة؟ سيتم حذف جميع مستوياتها وأسئلتها.",
      )
    )
      return;
    await fetch(`/api/school-admin/roadmap/stages/${stage.id}`, {
      method: "DELETE",
    });
    onRefresh();
  };

  const addModule = async () => {
    const title = moduleName.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      await fetch(`/api/school-admin/roadmap/stages/${stage.id}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      setModuleName("");
      onRefresh();
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="rb-stage">
      {/* Stage Header */}
      <div className="rb-stage-head">
        <button className="rb-stage-toggle" onClick={() => setOpen((v) => !v)}>
          <span className="rb-stage-badge">{stageIndex + 1}</span>
          <span className="rb-stage-info">
            <span className="rb-stage-name">{stage.title}</span>
            <span className="rb-stage-stats">
              <span className="rb-stage-stat">
                {Icons.modules}
                {stage.modules.length} مستوى
              </span>
              <span className="rb-stage-div">·</span>
              <span className="rb-stage-stat">
                {Icons.questions}
                {totalQuestions} سؤال
              </span>
            </span>
          </span>
          <span className={`rb-chevron${open ? " open" : ""}`}>
            {Icons.chevronDown}
          </span>
        </button>

        <button className="rb-btn-danger-sm" onClick={deleteStage}>
          {Icons.trash} حذف
        </button>
      </div>

      {/* Stage Body */}
      {open && (
        <div className="rb-stage-body">
          {stage.modules.length === 0 ? (
            <div className="rb-empty-sm">
              {Icons.folder}
              <p>لا توجد مستويات</p>
              <span>أضف أول مستوى</span>
            </div>
          ) : (
            stage.modules.map((mod) => (
              <ModuleCard key={mod.id} mod={mod} onRefresh={onRefresh} />
            ))
          )}

          {/* Add module row */}
          <div className="rb-add-module-row">
            <input
              className="rb-input"
              dir="rtl"
              placeholder="اسم المستوى الجديد..."
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addModule()}
            />
            <button
              className="rb-btn-secondary"
              disabled={adding || !moduleName.trim()}
              onClick={addModule}
            >
              {Icons.plus} إضافة مستوى
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
