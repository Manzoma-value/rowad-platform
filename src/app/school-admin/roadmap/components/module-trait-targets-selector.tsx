"use client";

import { useMemo, useState } from "react";
import type { StageTrait } from "./types";

type LinkDraft = {
  trait_id: string;
  position: number;
  guidance_ar?: string | null;
  guidance_sq?: string | null;
};

const MAQASID: Record<string, { ar: string; sq: string; color: string }> = {
  DEEN: { ar: "الدين", sq: "Feja", color: "#8F765B" },
  AQL: { ar: "العقل", sq: "Mendja", color: "#4A2080" },
  NAFS: { ar: "النفس", sq: "Shpirti", color: "#1A5C3A" },
  NASL: { ar: "النسل", sq: "Pasardhësia", color: "#6B1E2D" },
  MAL: { ar: "المال", sq: "Pasuria", color: "#7A6116" },
};

export function ModuleTraitTargetsSelector({
  moduleId,
  initialLinks,
  stageTraits,
  onRefresh,
}: {
  moduleId: string;
  initialLinks: LinkDraft[];
  stageTraits: StageTrait[];
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(initialLinks.length === 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, LinkDraft>>(() =>
    Object.fromEntries(initialLinks.map((link) => [link.trait_id, link])),
  );

  const selected = useMemo(
    () => stageTraits.filter((trait) => drafts[trait.id]),
    [drafts, stageTraits],
  );

  function toggle(traitId: string) {
    setSaved(false);
    setDrafts((current) => {
      if (current[traitId]) {
        const next = { ...current };
        delete next[traitId];
        return next;
      }
      return {
        ...current,
        [traitId]: { trait_id: traitId, position: Object.keys(current).length },
      };
    });
  }

  function changeGuidance(traitId: string, field: "guidance_ar" | "guidance_sq", value: string) {
    setSaved(false);
    setDrafts((current) => ({
      ...current,
      [traitId]: { ...current[traitId], [field]: value },
    }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const links = selected.map((trait, position) => ({ ...drafts[trait.id], position }));
      const response = await fetch(`/api/school-admin/roadmap/modules/${moduleId}/main-trait`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر حفظ الربط");
      setSaved(true);
      setOpen(false);
      onRefresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ الربط");
    } finally {
      setSaving(false);
    }
  }

  if (!stageTraits.length) return null;

  return (
    <section className="ctt">
      <div className="ctt-head">
        <div className="ctt-title">
          <span className="ctt-icon">✦</span>
          <div>
            <small>ما الذي نبنيه؟ · Çfarë duam të ndërtojmë?</small>
            <h4>السمات التي ينشّطها هذا المفهوم</h4>
            <p>المفهوم وسيلة للتعلّم، ويمكنه الإسهام في بناء أكثر من سمة. لا توجد أوزان مسبقة هنا.</p>
          </div>
        </div>
        <button className="ctt-toggle" type="button" onClick={() => setOpen((value) => !value)}>
          {open ? "إغلاق" : selected.length ? `تعديل الربط (${selected.length})` : "تحديد السمات"}
        </button>
      </div>

      {!open && selected.length > 0 && (
        <div className="ctt-summary">
          {selected.map((trait) => {
            const meta = MAQASID[trait.maqsad];
            return (
              <div className="ctt-summary-card" key={trait.id} style={{ borderColor: `${meta.color}40` }}>
                <span style={{ color: meta.color }}>{meta.ar}</span>
                <strong>{trait.name}</strong>
                {drafts[trait.id]?.guidance_ar && <p>{drafts[trait.id].guidance_ar}</p>}
              </div>
            );
          })}
        </div>
      )}

      {!open && selected.length === 0 && (
        <button className="ctt-empty" type="button" onClick={() => setOpen(true)}>
          <b>ابدأ بتحديد السمات المستهدفة</b>
          <span>اختر سمة أو أكثر، ثم اكتب الأثر المتوقع الذي يستطيع المشرف ملاحظته.</span>
        </button>
      )}

      {open && (
        <div className="ctt-editor">
          <div className="ctt-guide">
            <b>طريقة الإعداد</b>
            <span>1. اختر السمات التي يسهم المفهوم في بنائها.</span>
            <span>2. اكتب لكل سمة ما الذي نتوقع ظهوره في السلوك أو الفعل.</span>
            <span>3. يقيس الاختبار فهم المفهوم، بينما تسجّل ملاحظة المشرف نمو السمة.</span>
          </div>

          <div className="ctt-grid">
            {stageTraits.map((trait) => {
              const active = Boolean(drafts[trait.id]);
              const meta = MAQASID[trait.maqsad];
              return (
                <article className={`ctt-card ${active ? "active" : ""}`} key={trait.id}>
                  <button className="ctt-card-select" type="button" onClick={() => toggle(trait.id)}>
                    <span className="ctt-check">{active ? "✓" : "+"}</span>
                    <div>
                      <small style={{ color: meta.color }}>{meta.ar} · {meta.sq}</small>
                      <strong>{trait.name}</strong>
                      {trait.name_sq && <em>{trait.name_sq}</em>}
                      {trait.definition && <p>{trait.definition}</p>}
                    </div>
                  </button>
                  {active && (
                    <div className="ctt-fields">
                      <label>
                        <span>الأثر أو الفعل المتوقع</span>
                        <textarea
                          value={drafts[trait.id]?.guidance_ar ?? ""}
                          onChange={(event) => changeGuidance(trait.id, "guidance_ar", event.target.value)}
                          placeholder="مثال: يراجع المستفيد عواقب قراره قبل تنفيذه"
                          dir="rtl"
                        />
                      </label>
                      <label>
                        <span>Ndikimi ose veprimi i pritshëm</span>
                        <textarea
                          value={drafts[trait.id]?.guidance_sq ?? ""}
                          onChange={(event) => changeGuidance(trait.id, "guidance_sq", event.target.value)}
                          placeholder="Shembull: pjesëmarrësi shqyrton pasojat para veprimit"
                          dir="ltr"
                        />
                      </label>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {error && <div className="ctt-error">{error}</div>}
          <div className="ctt-actions">
            <span>{selected.length ? `${selected.length} سمات مستهدفة` : "يمكن الحفظ دون سمات إذا لم يحدد الأثر بعد"}</span>
            <button type="button" onClick={save} disabled={saving}>{saving ? "جارٍ الحفظ…" : saved ? "تم الحفظ ✓" : "حفظ خريطة الأثر"}</button>
          </div>
        </div>
      )}

      <style>{`
        .ctt{border:1px solid rgba(184,160,130,.28);border-radius:18px;background:linear-gradient(155deg,#FFFDF9,#F7F0E6);overflow:hidden;box-shadow:0 12px 28px rgba(50,16,26,.055);font-family:'Tajawal',sans-serif}
        .ctt-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px}.ctt-title{display:flex;gap:12px;min-width:0}.ctt-icon{display:grid;place-items:center;width:38px;height:38px;flex:none;border-radius:12px;background:#4A0E1C;color:#D9C9B0;font-size:18px}.ctt-title small{display:block;color:#8F765B;font-size:10px;font-weight:900;letter-spacing:.04em}.ctt-title h4{margin:3px 0 2px;color:#32101A;font-size:15px;font-weight:900}.ctt-title p{margin:0;max-width:650px;color:#655B53;font-size:11.5px;line-height:1.7}.ctt-toggle{flex:none;border:1px solid rgba(107,30,45,.25);border-radius:10px;background:#fff;padding:8px 12px;color:#6B1E2D;font:800 11.5px inherit;cursor:pointer}
        .ctt-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px;padding:0 18px 18px}.ctt-summary-card{border:1px solid;border-radius:12px;background:#fff;padding:11px}.ctt-summary-card span{display:block;font-size:9px;font-weight:900}.ctt-summary-card strong{display:block;margin-top:3px;color:#32101A;font-size:12px}.ctt-summary-card p{margin:5px 0 0;color:#655B53;font-size:10.5px;line-height:1.55}.ctt-empty{display:flex;width:calc(100% - 36px);margin:0 18px 18px;flex-direction:column;gap:3px;border:1.5px dashed rgba(107,30,45,.28);border-radius:13px;background:rgba(255,255,255,.55);padding:13px;text-align:right;cursor:pointer}.ctt-empty b{color:#6B1E2D;font-size:12px}.ctt-empty span{color:#796A62;font-size:10.5px}
        .ctt-editor{border-top:1px solid rgba(107,30,45,.11);padding:16px}.ctt-guide{display:grid;grid-template-columns:auto repeat(3,1fr);gap:10px;align-items:center;border-radius:13px;background:#32101A;padding:12px 14px;color:#F7F0E6;font-size:10.5px;line-height:1.5}.ctt-guide b{color:#D9C9B0;font-size:11px}.ctt-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.ctt-card{border:1px solid rgba(107,30,45,.13);border-radius:14px;background:#fff;overflow:hidden;transition:.18s}.ctt-card.active{border-color:rgba(107,30,45,.42);box-shadow:0 8px 20px rgba(107,30,45,.08)}.ctt-card-select{display:flex;width:100%;gap:10px;border:0;background:transparent;padding:12px;text-align:right;font-family:inherit;cursor:pointer}.ctt-check{display:grid;place-items:center;width:26px;height:26px;flex:none;border-radius:9px;background:#EFEAE0;color:#6B1E2D;font-weight:900}.ctt-card.active .ctt-check{background:#6B1E2D;color:#fff}.ctt-card-select>div{min-width:0}.ctt-card-select small{display:block;font-size:9px;font-weight:900}.ctt-card-select strong{display:block;margin-top:2px;color:#32101A;font-size:12.5px}.ctt-card-select em{display:block;color:#8F765B;font-size:10px;font-style:normal}.ctt-card-select p{margin:4px 0 0;color:#796A62;font-size:10.5px;line-height:1.55}.ctt-fields{display:grid;gap:9px;border-top:1px solid rgba(107,30,45,.1);background:#FAF7F1;padding:11px}.ctt-fields label span{display:block;margin-bottom:4px;color:#655B53;font-size:9.5px;font-weight:800}.ctt-fields textarea{width:100%;min-height:62px;resize:vertical;border:1px solid rgba(107,30,45,.2);border-radius:9px;background:#fff;padding:8px;color:#32101A;font:11px/1.55 inherit;outline:none}.ctt-fields textarea:focus{border-color:#B8A082;box-shadow:0 0 0 3px rgba(184,160,130,.12)}.ctt-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:13px}.ctt-actions span{color:#796A62;font-size:10.5px}.ctt-actions button{border:0;border-radius:10px;background:#6B1E2D;padding:9px 16px;color:#fff;font:900 11.5px inherit;cursor:pointer}.ctt-actions button:disabled{opacity:.6}.ctt-error{margin-top:10px;border-radius:9px;background:rgba(107,30,45,.09);padding:8px 10px;color:#6B1E2D;font-size:11px;font-weight:800}
        @media(max-width:760px){.ctt-head{flex-direction:column}.ctt-toggle{width:100%}.ctt-guide{grid-template-columns:1fr}.ctt-grid{grid-template-columns:1fr}.ctt-actions{align-items:stretch;flex-direction:column}.ctt-actions button{width:100%}}
      `}</style>
    </section>
  );
}
