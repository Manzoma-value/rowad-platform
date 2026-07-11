export const css = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --gold: #B8A082;
  --gold2: #B8A082;
  --gold-l: rgba(184,160,130,0.08);
  --gold-b: rgba(184,160,130,0.22);
  --gold-b2: rgba(184,160,130,0.20);
  --red: #6B1E2D;
  --red-l: rgba(107,30,45,0.06);
  --red-b: rgba(107,30,45,0.16);
  --black: #1A1A1A;
  --ink: #1A1A1A;
  --ink2: #655B53;
  --ink3: #8C8274;
  --ink4: #D9C9B0;
  --bg: #F7F3EB;
  --surface: #FFFFFF;
  --surface2: #FFFBF5;
  --surface3: #F7F3EB;
  --border: rgba(184,160,130,0.14);
  --border2: rgba(184,160,130,0.22);
  --green: #1B5E20;
  --green-l: rgba(27,94,32,0.07);
  --purple: #655B53;
  --purple-l: rgba(101,91,83,0.06);
  --amber: #6B1E2D;
  --amber-l: rgba(107,30,45,0.07);
  --r: 12px;
  --r2: 16px;
  --r3: 20px;
  --shadow-xs: 0 1px 3px rgba(26,26,26,0.04);
  --shadow-sm: 0 2px 8px rgba(26,26,26,0.06);
  --shadow: 0 8px 28px rgba(26,26,26,0.08);
  --shadow-lg: 0 20px 60px rgba(26,26,26,0.14);
  --ease: cubic-bezier(0.22,1,0.36,1);
  --t: 0.2s var(--ease);
  --font: 'Cairo', sans-serif;
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes scaleIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
@keyframes pulse { 0%,100% { opacity:.4; } 50% { opacity:1; } }
@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }

/* ─── PAGE ─── */
.lb-page {
  font-family: var(--font);
  color: var(--ink);
  display: flex; flex-direction: column;
  gap: 22px;
}

/* ─── LOADING ─── */
.lb-loading-inner { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px 0; color: var(--ink3); font-size: 14px; }
.lb-spinner { width: 36px; height: 36px; border: 3px solid rgba(184,160,130,0.15); border-top-color: var(--gold); border-radius: 50%; animation: spin .7s linear infinite; }
.lb-btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(26,26,26,.15); border-top-color: var(--black); border-radius: 50%; animation: spin .6s linear infinite; display: inline-block; }

/* ─── HEADER (editor) ─── */
.lb-header {
  background: var(--black); border-radius: var(--r3); padding: 22px 26px;
  position: relative; overflow: hidden;
  border: 1px solid rgba(184,160,130,0.1);
  animation: slideUp .4s var(--ease) both;
}
.lb-header::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, #B8A082 30%, #B8A082 60%, transparent);
}
.lb-header::after {
  content: ''; position: absolute; top: -60px; left: -60px; width: 200px; height: 200px;
  border-radius: 50%; background: radial-gradient(circle, rgba(184,160,130,0.08), transparent 70%);
  pointer-events: none;
}
.lb-header-inner { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; flex-wrap: wrap; }
.lb-header-icon {
  width: 50px; height: 50px; border-radius: 14px; flex-shrink: 0;
  background: rgba(184,160,130,0.1); border: 1px solid rgba(184,160,130,0.2);
  display: flex; align-items: center; justify-content: center; color: var(--gold);
}
.lb-header-titleblock { flex: 1; min-width: 0; }
.lb-page-title { font-size: 21px; font-weight: 900; color: #FFFFFF; letter-spacing: -.3px; }
.lb-page-sub { font-size: 12.5px; color: rgba(184,160,130,0.45); margin-top: 4px; font-weight: 500; }
.lb-back-link {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; color: rgba(184,160,130,0.55); text-decoration: none;
  margin-bottom: 8px; transition: color var(--t); font-weight: 600;
}
.lb-back-link:hover { color: var(--gold); }

/* ─── META PANEL (settings card in editor) ─── */
.lb-meta {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r2); padding: 20px;
  display: flex; flex-direction: column; gap: 16px;
  box-shadow: var(--shadow-xs);
  animation: slideUp .4s .05s var(--ease) both;
}
.lb-meta-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
}
@media (max-width: 600px) { .lb-meta-row { grid-template-columns: 1fr; } }

.lb-meta-field { display: flex; flex-direction: column; gap: 6px; }
.lb-meta-label {
  font-size: 11.5px; font-weight: 700; color: var(--ink2);
  letter-spacing: .04em; text-transform: uppercase;
  display: flex; align-items: center; gap: 6px;
}
.lb-meta-label svg { color: var(--gold2); }
.lb-meta-input, .lb-meta-select {
  width: 100%; border: 1.5px solid var(--border); border-radius: 10px;
  padding: 10px 14px; font-size: 14px; font-family: var(--font);
  color: var(--ink); outline: none; background: var(--surface);
  transition: all .2s var(--ease);
}
.lb-meta-input:focus, .lb-meta-select:focus {
  border-color: var(--gold); box-shadow: 0 0 0 3px var(--gold-l);
}
.lb-meta-textarea {
  width: 100%; border: 1.5px solid var(--border); border-radius: 10px;
  padding: 12px 14px; font-size: 14px; font-family: var(--font);
  color: var(--ink); outline: none; background: var(--surface);
  resize: vertical; line-height: 1.6; min-height: 70px;
  transition: all .2s var(--ease);
}
.lb-meta-textarea:focus { border-color: var(--gold); box-shadow: 0 0 0 3px var(--gold-l); }

/* Toggles for is_published / is_graded */
.lb-toggles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 600px) { .lb-toggles { grid-template-columns: 1fr; } }
.lb-toggle-card {
  background: var(--surface2); border: 1.5px solid var(--border);
  border-radius: var(--r); padding: 14px;
  display: flex; align-items: center; gap: 12px;
  cursor: pointer; transition: all .22s var(--ease);
}
.lb-toggle-card:hover { border-color: var(--border2); }
.lb-toggle-card.on { background: var(--gold-l); border-color: var(--gold); }
.lb-toggle-card.on.green { background: var(--green-l); border-color: rgba(27,94,32,0.4); }
.lb-toggle-switch {
  width: 38px; height: 22px; border-radius: 100px; flex-shrink: 0;
  background: var(--ink4); position: relative; transition: background .22s var(--ease);
}
.lb-toggle-switch::after {
  content: ''; position: absolute; top: 2px; left: 2px;
  width: 18px; height: 18px; border-radius: 50%; background: #fff;
  box-shadow: 0 1px 3px rgba(26,26,26,0.2);
  transition: transform .22s var(--ease);
}
.lb-toggle-card.on .lb-toggle-switch { background: var(--gold); }
.lb-toggle-card.on.green .lb-toggle-switch { background: var(--green); }
.lb-toggle-card.on .lb-toggle-switch::after { transform: translateX(16px); }
[dir="rtl"] .lb-toggle-card.on .lb-toggle-switch::after { transform: translateX(-16px); }
.lb-toggle-info { flex: 1; min-width: 0; }
.lb-toggle-title { font-size: 13px; font-weight: 800; color: var(--ink); }
.lb-toggle-sub { font-size: 11px; color: var(--ink3); margin-top: 2px; line-height: 1.4; }

/* Status pill in header */
.lb-status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 100px;
  font-size: 10.5px; font-weight: 800; letter-spacing: .04em;
  border: 1px solid;
}
.lb-status-pill.draft  { background: rgba(255,255,255,0.04); color: #B8A082; border-color: rgba(184,160,130,0.25); }
.lb-status-pill.live   { background: rgba(27,94,32,0.18); color: #1B5E20; border-color: rgba(27,94,32,0.4); }
.lb-status-pill svg    { width: 9px; height: 9px; }

/* ─── SECTIONS (content + questions) ─── */
.lb-section {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r2); overflow: hidden;
  box-shadow: var(--shadow-xs);
  animation: slideUp .4s .1s var(--ease) both;
}
.lb-section-hd {
  display: flex; align-items: center; gap: 10px;
  padding: 16px 20px;
  background: linear-gradient(180deg, var(--surface2), var(--surface));
  border-bottom: 1px solid var(--border);
}
.lb-section-hd-icon {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  background: var(--gold-l); border: 1px solid var(--gold-b); color: var(--gold);
  display: flex; align-items: center; justify-content: center;
}
.lb-section-title { font-size: 15px; font-weight: 800; color: var(--black); flex: 1; }
.lb-section-count {
  background: var(--gold-l); color: #8F765B; font-size: 11px; font-weight: 800;
  padding: 3px 10px; border-radius: 100px; border: 1px solid var(--gold-b);
}
.lb-section-body { padding: 16px 18px; }

/* ─── CONTENT BLOCKS ─── */
.lb-content-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.lb-content-block {
  display: flex; align-items: center; gap: 11px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r); padding: 12px 14px;
  transition: all .22s var(--ease);
}
.lb-content-block:hover { border-color: rgba(184,160,130,0.35); box-shadow: var(--shadow-xs); }

/* ─── Drag handle (used on content blocks + question items) ─── */
.lb-drag-handle {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 28px; flex-shrink: 0;
  color: var(--ink4);
  border-radius: 6px;
  /* touch-action set inline by SortableList; cursor inherited from dragHandleProps.style */
  transition: color .15s, background .15s;
  -webkit-user-select: none; user-select: none;
}
.lb-drag-handle:hover { color: var(--gold2); background: rgba(184,160,130,0.08); }
.lb-drag-handle svg { display: block; }
.lb-content-type-badge {
  font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 6px;
  white-space: nowrap; flex-shrink: 0; letter-spacing: .03em;
}
.lb-content-type-badge.TEXT { background: var(--black); color: var(--gold2); }
.lb-content-type-badge.IMAGE { background: rgba(184,160,130,0.12); color: #8F765B; border: 1px solid var(--gold-b); }
.lb-content-type-badge.VIDEO { background: var(--red-l); color: var(--red); border: 1px solid var(--red-b); }
.lb-content-preview { flex: 1; min-width: 0; }
.lb-content-preview-text {
  font-size: 12.5px; color: var(--ink2);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-weight: 500; display: block; direction: rtl; text-align: right;
}
.lb-content-preview-sub { font-size: 11px; color: var(--ink3); margin-top: 2px; }
.lb-content-thumb { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0; }
.lb-content-actions { display: flex; gap: 4px; flex-shrink: 0; }

/* Add-content pills */
.lb-add-row { display: flex; gap: 8px; flex-wrap: wrap; }
.lb-add-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px; border: 1.5px solid var(--gold-b); border-radius: 100px;
  background: var(--gold-l); color: #8F765B;
  font-size: 12.5px; font-weight: 700; cursor: pointer;
  font-family: var(--font); transition: all .22s var(--ease);
}
.lb-add-pill:hover {
  border-color: var(--gold); background: rgba(184,160,130,0.14);
  transform: translateY(-1px); box-shadow: 0 3px 12px rgba(184,160,130,0.15);
}

/* ─── QUESTIONS ─── */
.lb-q-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.lb-q-item {
  display: flex; align-items: flex-start; gap: 11px;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: var(--r); padding: 13px 15px;
  transition: all .22s var(--ease);
}
.lb-q-item:hover { border-color: rgba(184,160,130,0.3); }
.lb-q-num {
  width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
  background: var(--black); color: var(--gold);
  font-size: 12px; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
}
.lb-q-body { flex: 1; min-width: 0; }
.lb-q-text { font-size: 13px; color: var(--ink); line-height: 1.6; margin-bottom: 8px; font-weight: 500; direction: rtl; text-align: right; }
.lb-q-tags { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.lb-tag {
  font-size: 10px; padding: 3px 9px; border-radius: 6px; font-weight: 700;
  display: inline-flex; align-items: center; gap: 4px;
}
.lb-tag.MCQ      { background: var(--black); color: var(--gold2); }
.lb-tag.TF       { background: var(--red-l); color: var(--red); border: 1px solid var(--red-b); }
.lb-tag.WRITTEN  { background: var(--amber-l); color: var(--amber); }
.lb-tag.MATCHING { background: var(--purple-l); color: var(--purple); }
.lb-tag.answer   { background: var(--gold-l); color: #8F765B; border: 1px solid var(--gold-b); }

.lb-add-q-btn {
  width: 100%; border: 2px dashed var(--gold-b); background: var(--gold-l);
  border-radius: var(--r); padding: 12px; font-size: 13px; color: #8F765B;
  cursor: pointer; font-family: var(--font); font-weight: 700;
  transition: all .22s var(--ease);
  display: flex; align-items: center; justify-content: center; gap: 7px;
}
.lb-add-q-btn:hover { border-color: var(--gold); background: rgba(184,160,130,0.12); transform: translateY(-1px); }

/* ─── ICON BUTTONS ─── */
.lb-icon-btn {
  background: none; border: 1px solid transparent; cursor: pointer;
  padding: 6px; border-radius: 8px; color: var(--ink4);
  transition: all .2s var(--ease);
  display: flex; align-items: center; justify-content: center;
}
.lb-icon-btn:hover { background: var(--surface3); color: var(--ink); border-color: var(--border); }
.lb-icon-btn.danger:hover { background: var(--red-l); color: var(--red); border-color: var(--red-b); }

/* ─── BUTTONS ─── */
.lb-btn-primary {
  background: linear-gradient(135deg, var(--gold) 0%, var(--gold2) 100%);
  color: var(--black); border: none; border-radius: var(--r); padding: 12px 24px;
  font-size: 13px; font-weight: 800; cursor: pointer; font-family: var(--font);
  white-space: nowrap; transition: all .22s var(--ease);
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  box-shadow: 0 2px 8px rgba(184,160,130,0.25);
}
.lb-btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(184,160,130,0.35); }
.lb-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.lb-btn-ghost {
  background: transparent; color: var(--ink2); border: 1px solid var(--border);
  border-radius: var(--r); padding: 12px 24px; font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: var(--font); white-space: nowrap;
  transition: all .22s var(--ease);
}
.lb-btn-ghost:hover { border-color: var(--border2); background: var(--surface3); }
.lb-btn-danger {
  background: var(--red); color: #fff; border: none;
  border-radius: var(--r); padding: 10px 18px; font-size: 12.5px; font-weight: 700;
  cursor: pointer; font-family: var(--font); white-space: nowrap;
  transition: all .22s var(--ease);
  display: inline-flex; align-items: center; gap: 6px;
}
.lb-btn-danger:hover { background: #6B1E2D; transform: translateY(-1px); }

/* ═══════════════════════════════════════════════════════════
   MODAL
   ═══════════════════════════════════════════════════════════ */
.lb-overlay {
  position: fixed; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  background: rgba(26,26,26,.6); backdrop-filter: blur(12px);
  padding: 16px; animation: fadeIn .25s ease;
}
.lb-modal {
  background: var(--surface); border-radius: 24px;
  width: 100%; max-width: 520px; max-height: 88vh; overflow-y: auto;
  box-shadow: var(--shadow-lg), 0 0 0 1px rgba(184,160,130,0.08);
  animation: modalIn .35s var(--ease);
  position: relative;
}
.lb-modal::before {
  content: ''; position: absolute; top: 0; left: 20%; right: 20%; height: 2px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
  border-radius: 0 0 2px 2px;
}
.lb-modal.wide { max-width: 600px; }
.lb-modal-hd {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 26px 28px 0; position: relative;
}
.lb-modal-icon {
  width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--gold-l); color: var(--gold);
  border: 1px solid var(--gold-b);
}
.lb-modal-icon.red { background: var(--red-l); color: var(--red); border-color: var(--red-b); }
.lb-modal-icon.dark { background: rgba(26,26,26,.06); color: var(--black); border-color: rgba(26,26,26,.1); }
.lb-modal-icon.purple { background: var(--purple-l); color: var(--purple); border-color: rgba(101,91,83,0.15); }
.lb-modal-hd-text { flex: 1; padding-top: 4px; }
.lb-modal-title { font-size: 18px; font-weight: 900; color: var(--black); letter-spacing: -.2px; }
.lb-modal-sub { font-size: 12.5px; color: var(--ink3); margin-top: 3px; font-weight: 500; }
.lb-close-btn {
  background: none; border: none; cursor: pointer; color: var(--ink3);
  padding: 6px; border-radius: 8px; transition: all .2s var(--ease);
  display: flex; align-items: center;
}
.lb-close-btn:hover { background: var(--surface3); color: var(--ink); transform: rotate(90deg); }

.lb-modal-body { padding: 22px 28px; display: flex; flex-direction: column; gap: 18px; }
.lb-modal-ft {
  display: flex; gap: 10px; padding: 16px 28px 22px;
  border-top: 1px solid var(--border); background: var(--surface2);
  border-radius: 0 0 24px 24px;
}
.lb-field { display: flex; flex-direction: column; gap: 8px; }
.lb-label {
  font-size: 11.5px; font-weight: 700; color: var(--ink2);
  letter-spacing: .05em; text-transform: uppercase;
  display: flex; align-items: center; gap: 7px;
}
.lb-label-hint { font-size: 11px; color: var(--ink3); font-weight: 500; text-transform: none; }
.lb-input {
  width: 100%; border: 1.5px solid var(--border); border-radius: var(--r);
  padding: 11px 15px; font-size: 16px; font-family: var(--font);
  color: var(--ink); outline: none; background: var(--surface);
  transition: all .22s var(--ease);
}
.lb-input:focus { border-color: var(--gold); box-shadow: 0 0 0 3px var(--gold-l); }
.lb-textarea {
  width: 100%; border: 1.5px solid var(--border); border-radius: var(--r);
  padding: 14px 16px; font-family: var(--font); font-size: 16px;
  color: var(--ink); outline: none; resize: vertical; line-height: 1.7;
  background: var(--surface); transition: all .22s var(--ease); min-height: 100px;
}
.lb-textarea:focus { border-color: var(--gold); box-shadow: 0 0 0 3px var(--gold-l); }
.lb-error {
  background: var(--red-l); border: 1px solid var(--red-b); color: var(--red);
  font-size: 12.5px; padding: 11px 14px; border-radius: var(--r); font-weight: 600;
  display: flex; align-items: center; gap: 8px;
  animation: scaleIn .2s var(--ease);
}

/* Type buttons (question type selector) */
.lb-type-row { display: flex; gap: 8px; flex-wrap: wrap; }
.lb-type-btn {
  flex: 1; min-width: 80px; padding: 14px 10px;
  border: 2px solid var(--border); border-radius: var(--r);
  font-size: 12px; font-weight: 700; cursor: pointer;
  background: var(--surface); color: var(--ink3); font-family: var(--font);
  transition: all .22s var(--ease);
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.lb-type-btn:hover { border-color: var(--gold-b); background: var(--gold-l); }
.lb-type-btn.active {
  background: var(--gold-l); color: var(--black); border-color: var(--gold);
  box-shadow: 0 2px 10px rgba(184,160,130,0.15);
}
.lb-type-btn-icon { color: var(--ink4); transition: color .2s; display: flex; }
.lb-type-btn.active .lb-type-btn-icon { color: var(--gold); }

/* MCQ options */
.lb-opts { display: flex; flex-direction: column; gap: 8px; }
.lb-opt-row { display: flex; align-items: center; gap: 10px; padding: 4px 6px; border-radius: var(--r); }
.lb-opt-row.sel { background: var(--gold-l); }
.lb-opt-radio {
  width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--border2);
  cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  background: var(--surface); color: transparent; transition: all .22s var(--ease);
  font-size: 11px;
}
.lb-opt-radio:hover { border-color: var(--gold2); }
.lb-opt-row.sel .lb-opt-radio { border-color: var(--gold); background: var(--gold); color: #fff; }
.lb-opt-num {
  width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0;
  background: var(--surface3); color: var(--ink3);
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}

/* TF buttons */
.lb-tf-row { display: flex; gap: 10px; }
.lb-tf-btn {
  flex: 1; padding: 14px; border: 2px solid var(--border); border-radius: var(--r);
  font-size: 14px; font-weight: 700; cursor: pointer; background: var(--surface);
  font-family: var(--font); transition: all .22s var(--ease);
  display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--ink3);
}
.lb-tf-btn:hover { border-color: var(--gold-b); }
.lb-tf-btn.true  { background: var(--gold-l); color: #8F765B; border-color: var(--gold); }
.lb-tf-btn.false { background: var(--red-l); color: var(--red); border-color: rgba(107,30,45,0.3); }

/* Matching pairs */
.lb-pairs { display: flex; flex-direction: column; gap: 8px; }
.lb-pair-row { display: flex; align-items: center; gap: 8px; }
.lb-pair-row .lb-input { flex: 1; }
.lb-pair-arrow { color: var(--ink4); display: flex; flex-shrink: 0; }

/* Upload zone */
.lb-upload-zone {
  border: 2px dashed rgba(184,160,130,0.3); border-radius: var(--r2);
  padding: 36px 24px; display: flex; flex-direction: column; align-items: center;
  gap: 12px; cursor: pointer; text-align: center;
  background: linear-gradient(180deg, rgba(184,160,130,0.04), rgba(184,160,130,0.01));
  transition: all .3s var(--ease); position: relative; overflow: hidden;
}
.lb-upload-zone::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(circle at center, rgba(184,160,130,0.06), transparent 70%);
  opacity: 0; transition: opacity .3s;
}
.lb-upload-zone:hover {
  border-color: var(--gold); background: rgba(184,160,130,0.06);
  transform: translateY(-2px); box-shadow: 0 8px 30px rgba(184,160,130,0.1);
}
.lb-upload-zone:hover::before { opacity: 1; }
.lb-upload-zone .icon-wrap {
  width: 64px; height: 64px; border-radius: 16px; margin-bottom: 4px;
  background: rgba(184,160,130,0.08); border: 1px solid rgba(184,160,130,0.15);
  display: flex; align-items: center; justify-content: center; color: var(--gold2);
}
.lb-upload-zone p { font-size: 13px; color: var(--ink3); font-weight: 500; line-height: 1.6; }
.lb-upload-zone strong { color: #8F765B; font-weight: 700; }
.lb-img-preview {
  width: 100%; max-height: 200px; object-fit: contain;
  border-radius: var(--r); border: 1px solid var(--border);
  background: var(--surface2);
}

/* Video preview */
.lb-yt-preview {
  border-radius: var(--r); overflow: hidden;
  border: 1px solid var(--border); box-shadow: var(--shadow-xs);
  position: relative;
}
.lb-yt-preview::after {
  content: '▶'; position: absolute; top: 50%; left: 50%;
  transform: translate(-50%,-50%); width: 48px; height: 48px;
  background: rgba(26,26,26,0.7); border-radius: 50%; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; pointer-events: none;
}
.lb-yt-preview img { width: 100%; display: block; }

/* ─── LIST PAGE ─── */
.lb-list-hd { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.lb-list-title-wrap { display: flex; align-items: center; gap: 14px; }
.lb-list-title-icon {
  width: 48px; height: 48px; border-radius: 14px;
  background: linear-gradient(135deg, var(--gold), var(--gold2)); color: var(--black);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(184,160,130,0.3);
}
.lb-list-title { font-size: 22px; font-weight: 900; color: var(--black); letter-spacing: -.3px; }
.lb-list-sub { font-size: 12.5px; color: var(--ink3); margin-top: 3px; font-weight: 500; }

.lb-list-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  animation: slideUp .4s .08s var(--ease) both;
}
.lb-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r2); padding: 18px;
  display: flex; flex-direction: column; gap: 12px;
  text-decoration: none; color: inherit;
  transition: all .22s var(--ease);
  position: relative; overflow: hidden;
  box-shadow: var(--shadow-xs);
}
.lb-card:hover {
  transform: translateY(-3px); box-shadow: var(--shadow);
  border-color: rgba(184,160,130,0.35);
}
.lb-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--gold), var(--gold2));
  opacity: 0; transition: opacity .22s;
}
.lb-card:hover::before { opacity: 1; }
.lb-card-row { display: flex; align-items: center; gap: 8px; }
.lb-card-title { font-size: 15px; font-weight: 800; color: var(--black); line-height: 1.4; }
.lb-card-desc { font-size: 12.5px; color: var(--ink3); line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.lb-card-meta {
  display: flex; gap: 6px; flex-wrap: wrap; margin-top: auto;
}
.lb-card-chip {
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--surface3); color: var(--ink2);
  font-size: 11px; font-weight: 700; padding: 4px 9px; border-radius: 6px;
  border: 1px solid var(--border);
}
.lb-card-chip svg { color: var(--gold2); width: 11px; height: 11px; }
.lb-card-class {
  display: inline-flex; align-items: center; gap: 4px;
  background: rgba(26,26,26,0.06); color: var(--ink2);
  font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px;
}

/* Empty state */
.lb-empty {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r3); padding: 70px 30px; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  animation: fadeIn .4s ease;
}
.lb-empty-icon {
  width: 88px; height: 88px; border-radius: 22px;
  background: var(--gold-l); border: 1px solid var(--gold-b);
  display: flex; align-items: center; justify-content: center;
  color: var(--gold); animation: float 3s ease-in-out infinite;
}
.lb-empty-title { font-size: 19px; font-weight: 900; color: var(--black); }
.lb-empty-sub { font-size: 13.5px; color: var(--ink3); max-width: 320px; line-height: 1.7; }

/* Create modal — class picker etc. */
.lb-empty-inline { padding: 14px; text-align: center; color: var(--ink3); font-size: 13px; font-style: italic; }
`;
