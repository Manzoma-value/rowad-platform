"use client";

import { useState } from "react";
import { Icons } from "./icons";
import type { Stage } from "./types";
import { ModuleCard } from "./module-card";
import { StageTraitsPanel } from "./stage-traits-panel";
import { useConfirm } from "@/lib/confirm-dialog";

interface Props {
  stage: Stage;
  stageIndex: number;
  onRefresh: () => void;
}

export function StageCard({ stage, stageIndex, onRefresh }: Props) {
  const confirm = useConfirm();
  const [open, setOpen] = useState(true);
  const [moduleName, setModuleName] = useState("");
  const [adding, setAdding] = useState(false);
  const [qualificationAr, setQualificationAr] = useState(stage.qualification_ar ?? "");
  const [qualificationSq, setQualificationSq] = useState(stage.qualification_sq ?? "");
  const [savingQualification, setSavingQualification] = useState(false);
  const [qualificationSaved, setQualificationSaved] = useState(false);
  const [qualificationError, setQualificationError] = useState("");

  const traits = stage.traits ?? [];

  const totalQuestions = stage.modules.reduce(
    (sum, m) => sum + (m.questions?.length ?? 0),
    0,
  );

  const deleteStage = async () => {
    if (!(await confirm({
      title: "حذف المرحلة",
      message: "هل أنت متأكد من حذف هذه المرحلة؟ سيتم حذف جميع مستوياتها وأسئلتها ومحاولات المستفيدين فيها.",
    }))) return;
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

  const saveQualification = async () => {
    setSavingQualification(true);
    setQualificationSaved(false);
    setQualificationError("");
    try {
      const response = await fetch(`/api/school-admin/roadmap/stages/${stage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qualification_ar: qualificationAr, qualification_sq: qualificationSq }),
      });
      if (!response.ok) throw new Error("تعذر حفظ الأهلية");
      setQualificationSaved(true);
      onRefresh();
    } catch (reason) {
      setQualificationError(reason instanceof Error ? reason.message : "تعذر حفظ الأهلية");
    } finally {
      setSavingQualification(false);
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
              <span className="rb-stage-div">·</span>
              <span
                className="rb-stage-stat"
                style={{
                  color:
                    traits.length === 5
                      ? "rgba(26,200,100,0.7)"
                      : "rgba(184,160,130,0.5)",
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {traits.length} سمات
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
          <section className="rb-qualification">
            <div className="rb-qualification-head">
              <span>✦</span>
              <div>
                <small>الوجهة النهائية · Aftësia përfundimtare</small>
                <h3>الأهلية المستهدفة في نهاية المرحلة</h3>
                <p>صف القدرة التي يصبح المستفيد مؤهلاً لممارستها بعد تكامل المفاهيم والسمات والأفعال الملحوظة.</p>
              </div>
            </div>
            <div className="rb-qualification-fields">
              <label>
                <span>الأهلية بالعربية</span>
                <textarea dir="rtl" value={qualificationAr} onChange={(event) => { setQualificationAr(event.target.value); setQualificationSaved(false); }} placeholder="مثال: يتخذ قراراً مسؤولاً ويشرح أثره على نفسه ومجتمعه" />
              </label>
              <label>
                <span>Aftësia në shqip</span>
                <textarea dir="ltr" value={qualificationSq} onChange={(event) => { setQualificationSq(event.target.value); setQualificationSaved(false); }} placeholder="Shembull: merr një vendim të përgjegjshëm dhe shpjegon ndikimin e tij" />
              </label>
            </div>
            <div className="rb-qualification-actions">
              <small>المفهوم يعلّم، السمة تُبنى، الفعل يُلاحظ، والأهلية هي المحصلة.</small>
              <button type="button" onClick={saveQualification} disabled={savingQualification}>
                {savingQualification ? "جارٍ الحفظ…" : qualificationSaved ? "تم الحفظ ✓" : "حفظ الأهلية"}
              </button>
            </div>
            {qualificationError && <p className="rb-qualification-error">{qualificationError}</p>}
          </section>

          {/* Modules */}
          {stage.modules.length === 0 ? (
            <div className="rb-empty-sm">
              {Icons.folder}
              <p>لا توجد مستويات</p>
              <span>أضف أول مستوى</span>
            </div>
          ) : (
            stage.modules.map((mod) => (
              <ModuleCard
                key={mod.id}
                mod={mod}
                stageTraits={traits}
                onRefresh={onRefresh}
              />
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

          {/* Traits panel — sits at the bottom of the stage */}
          <StageTraitsPanel
            stageId={stage.id}
            traits={traits}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  );
}
