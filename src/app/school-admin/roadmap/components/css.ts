export const css = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800;900&display=swap');

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
  --ink: #1C1C1E;
  --ink2: #444;
  --ink3: #888;
  --ink4: #bbb;
  --bg: #F7F3EB;
  --surface: #FFFFFF;
  --surface2: #FAFAF8;
  --surface3: #F2F0EC;
  --border: rgba(184,160,130,0.14);
  --border2: rgba(184,160,130,0.22);
  --purple-l: rgba(74,32,128,0.06);
  --purple: #4A2080;
  --amber-l: rgba(154,98,0,0.07);
  --amber: #9a6200;
  --green: #1A7A3A;
  --green-l: rgba(26,122,58,0.07);
  --r: 12px;
  --r2: 16px;
  --r3: 20px;
  --shadow-xs: 0 1px 3px rgba(0,0,0,0.04);
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
  --shadow: 0 8px 28px rgba(0,0,0,0.08);
  --shadow-lg: 0 20px 60px rgba(0,0,0,0.14);
  --shadow-gold: 0 4px 20px rgba(184,160,130,0.15);
  --ease: cubic-bezier(0.22,1,0.36,1);
  --ease-bounce: cubic-bezier(0.34,1.56,0.64,1);
  --t: 0.2s var(--ease);
  --font: 'Tajawal', sans-serif;
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes pulse { 0%,100% { opacity:.4; } 50% { opacity:1; } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes glowPulse { 0%,100% { box-shadow: 0 0 20px rgba(184,160,130,0.1); } 50% { box-shadow: 0 0 35px rgba(184,160,130,0.2); } }
@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes scaleIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }

/* ─── PAGE ─── */
.rb-page {
  font-family: var(--font);
  color: var(--ink);
  background: var(--bg);
  min-height: 100vh;
  padding: 32px 28px 80px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  max-width: 960px;
  margin: 0 auto;
}

/* ─── LOADING ─── */
.rb-loading { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); font-family: var(--font); color: var(--ink3); font-size: 14px; }
.rb-loading-inner { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.rb-spinner { width: 36px; height: 36px; border: 3px solid rgba(184,160,130,0.15); border-top-color: var(--gold); border-radius: 50%; animation: spin .7s linear infinite; }
.rb-btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(0,0,0,.15); border-top-color: var(--black); border-radius: 50%; animation: spin .6s linear infinite; display: inline-block; }

/* ─── HEADER ─── */
.rb-header {
  background: var(--black); border-radius: var(--r3); padding: 26px 30px;
  position: relative; overflow: hidden;
  border: 1px solid rgba(184,160,130,0.1);
  animation: slideUp .4s var(--ease) both;
}
.rb-header::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, #B8A082 30%, #B8A082 60%, transparent);
}
.rb-header::after {
  content: ''; position: absolute; top: -60px; right: -60px; width: 200px; height: 200px;
  border-radius: 50%; background: radial-gradient(circle, rgba(184,160,130,0.08), transparent 70%);
  pointer-events: none;
}
.rb-header-inner { display: flex; align-items: center; gap: 16px; position: relative; z-index: 1; }
.rb-header-icon {
  width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
  background: rgba(184,160,130,0.1); border: 1px solid rgba(184,160,130,0.2);
  display: flex; align-items: center; justify-content: center; color: var(--gold);
}
.rb-page-title { font-size: 22px; font-weight: 900; color: #FFFFFF; letter-spacing: -.3px; }
.rb-page-sub { font-size: 12.5px; color: rgba(184,160,130,0.45); margin-top: 4px; font-weight: 500; }

/* ─── STATS ─── */
.rb-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; animation: slideUp .4s .06s var(--ease) both; }
.rb-stat {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r2);
  padding: 18px 20px; display: flex; align-items: center; gap: 14px;
  transition: all .25s var(--ease); cursor: default;
  box-shadow: var(--shadow-xs);
}
.rb-stat:hover { box-shadow: var(--shadow-sm); transform: translateY(-3px); border-color: var(--border2); }
.rb-stat-icon {
  width: 42px; height: 42px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.rb-stat.gold .rb-stat-icon { background: var(--gold-l); color: var(--gold); }
.rb-stat.red .rb-stat-icon { background: var(--red-l); color: var(--red); }
.rb-stat.dark .rb-stat-icon { background: rgba(11,11,12,.06); color: var(--black); }
.rb-stat.purple .rb-stat-icon { background: var(--purple-l); color: var(--purple); }
.rb-stat-num { font-size: 28px; font-weight: 900; color: var(--black); line-height: 1; letter-spacing: -.5px; }
.rb-stat-label { font-size: 12px; color: var(--ink3); margin-top: 4px; font-weight: 600; }

/* ─── SECTION HEADER ─── */
.rb-section-hd { display: flex; align-items: center; gap: 10px; }
.rb-section-title { font-size: 16px; font-weight: 800; color: var(--black); }
.rb-section-count {
  background: var(--gold-l); color: #8F765B; font-size: 11px; font-weight: 800;
  padding: 3px 10px; border-radius: 100px; border: 1px solid var(--gold-b);
}

/* ─── STAGES ─── */
.rb-stages { display: flex; flex-direction: column; gap: 14px; animation: slideUp .4s .12s var(--ease) both; }
.rb-stages-list { display: flex; flex-direction: column; gap: 14px; }

/* ─── STAGE ─── */
.rb-stage {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r3);
  overflow: hidden; box-shadow: var(--shadow-xs);
  transition: all .25s var(--ease);
}
.rb-stage:hover { box-shadow: var(--shadow-sm); }
.rb-stage-head {
  display: flex; align-items: center; gap: 10px; padding: 16px 20px;
  background: var(--black); border-bottom: 1px solid rgba(184,160,130,0.15);
  position: relative;
}
.rb-stage-head::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(184,160,130,0.3), transparent);
}
.rb-stage-toggle { display: flex; align-items: center; gap: 12px; flex: 1; background: none; border: none; cursor: pointer; text-align: right; font-family: var(--font); }
.rb-stage-badge {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, var(--gold) 0%, var(--gold2) 100%);
  color: var(--black); display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 900; box-shadow: 0 2px 8px rgba(184,160,130,0.3);
}
.rb-stage-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.rb-stage-name { font-size: 15px; font-weight: 700; color: #fff; }
.rb-stage-stats { display: flex; align-items: center; gap: 10px; }
.rb-stage-stat { display: flex; align-items: center; gap: 4px; font-size: 11px; color: rgba(255,255,255,.4); }
.rb-stage-stat svg { width: 13px; height: 13px; }
.rb-stage-div { width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,.2); }
.rb-stage-body { padding: 18px; display: flex; flex-direction: column; gap: 12px; background: var(--surface2); }
.rb-chevron { display: flex; align-items: center; color: rgba(255,255,255,.3); transition: transform .3s var(--ease); }
.rb-chevron.open { transform: rotate(180deg); }
.rb-chevron.dark { color: var(--ink4); }

/* ─── MODULE ─── */
.rb-module {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r2);
  overflow: hidden; transition: all .25s var(--ease);
}
.rb-module.open { border-color: rgba(184,160,130,0.3); box-shadow: var(--shadow-sm); }
.rb-mod-head { display: flex; align-items: center; gap: 8px; padding: 14px 16px; }
.rb-mod-toggle { display: flex; align-items: center; gap: 11px; flex: 1; background: none; border: none; cursor: pointer; text-align: right; font-family: var(--font); }
.rb-mod-dot-wrap {
  width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
  background: var(--gold-l); border: 1px solid var(--gold-b);
  display: flex; align-items: center; justify-content: center;
}
.rb-mod-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gold); }
.rb-mod-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.rb-mod-name { font-size: 14px; font-weight: 700; color: var(--ink); }
.rb-mod-meta { font-size: 11px; color: var(--ink3); font-weight: 500; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.rb-mod-meta-sep { width: 2px; height: 2px; border-radius: 50%; background: var(--ink4); flex-shrink: 0; }
.rb-mod-body { border-top: 1px solid var(--border); }

/* ─── CONTENT SECTION ─── */
.rb-content-section {
  padding: 16px 18px;
  background: linear-gradient(180deg, rgba(184,160,130,0.04) 0%, rgba(184,160,130,0.01) 100%);
}
.rb-section-label { display: flex; align-items: center; gap: 9px; margin-bottom: 14px; }
.rb-section-label-line {
  width: 3px; height: 18px; border-radius: 2px;
  background: linear-gradient(180deg, var(--gold) 0%, var(--gold2) 100%);
}
.rb-section-label-text { font-size: 11px; font-weight: 800; color: var(--gold2); letter-spacing: .08em; text-transform: uppercase; }
.rb-content-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.rb-content-block {
  display: flex; align-items: center; gap: 11px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r); padding: 12px 14px;
  transition: all .22s var(--ease);
}
.rb-content-block:hover { border-color: rgba(184,160,130,0.35); box-shadow: var(--shadow-xs); transform: translateX(-2px); }
.rb-drag-handle {
  color: var(--ink4); display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; opacity: 0.5;
  width: 22px; height: 26px; border-radius: 6px;
  transition: opacity .2s, color .15s, background .15s;
  -webkit-user-select: none; user-select: none;
}
.rb-content-block:hover .rb-drag-handle,
.rb-q-item:hover .rb-drag-handle { opacity: 1; }
.rb-drag-handle:hover { color: var(--gold); background: rgba(184,160,130,0.10); }
.rb-content-type-badge {
  font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 6px;
  white-space: nowrap; flex-shrink: 0; letter-spacing: .03em;
}
.rb-content-type-badge.TEXT { background: var(--black); color: var(--gold2); }
.rb-content-type-badge.IMAGE { background: linear-gradient(135deg, rgba(184,160,130,0.12), rgba(184,160,130,0.06)); color: #8F765B; border: 1px solid var(--gold-b); }
.rb-content-type-badge.VIDEO { background: var(--red-l); color: var(--red); border: 1px solid var(--red-b); }
.rb-content-preview { flex: 1; min-width: 0; }
.rb-content-preview-text { font-size: 12.5px; color: var(--ink2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; direction: rtl; text-align: right; display: block; }
.rb-content-preview-sub { font-size: 11px; color: var(--ink3); margin-top: 2px; display: flex; align-items: center; gap: 4px; direction: rtl; }
.rb-content-thumb { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0; }
.rb-add-content-row { display: flex; gap: 8px; flex-wrap: wrap; }
.rb-add-content-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 16px; border: 1.5px solid var(--gold-b); border-radius: 100px;
  background: var(--gold-l); color: #8F765B;
  font-size: 12px; font-weight: 700; cursor: pointer; font-family: var(--font);
  transition: all .22s var(--ease);
}
.rb-add-content-pill:hover {
  border-color: var(--gold); background: rgba(184,160,130,0.14);
  transform: translateY(-1px); box-shadow: 0 3px 12px rgba(184,160,130,0.15);
}

/* ─── DIVIDER ─── */
.rb-section-divider { display: flex; align-items: center; gap: 0; padding: 2px 18px; background: rgba(184,160,130,0.06); }
.rb-divider-line { flex: 1; height: 1px; background: var(--gold-b2); }
.rb-divider-diamond { width: 6px; height: 6px; background: var(--gold2); transform: rotate(45deg); border-radius: 1px; flex-shrink: 0; opacity: 0.5; }

/* ─── QUESTIONS SECTION ─── */
.rb-q-section { padding: 16px 18px; background: var(--surface); }
.rb-q-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.rb-q-item {
  display: flex; align-items: flex-start; gap: 11px;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: var(--r); padding: 13px 15px;
  transition: all .22s var(--ease);
}
.rb-q-item:hover { border-color: rgba(184,160,130,0.3); transform: translateX(-2px); }
.rb-q-num {
  width: 24px; height: 24px; border-radius: 7px; flex-shrink: 0;
  background: var(--black); color: var(--gold);
  font-size: 11px; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
}
.rb-q-body { flex: 1; min-width: 0; }
.rb-q-text { font-size: 13px; color: var(--ink); line-height: 1.6; margin-bottom: 8px; font-weight: 500; direction: rtl; text-align: right; }
.rb-q-tags { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; direction: rtl; }
.rb-tag {
  font-size: 10px; padding: 3px 9px; border-radius: 6px; font-weight: 700;
  display: inline-flex; align-items: center; gap: 4px;
}
.rb-tag svg { width: 10px; height: 10px; }
.rb-tag.MCQ { background: var(--black); color: var(--gold2); }
.rb-tag.TF { background: var(--red-l); color: var(--red); border: 1px solid var(--red-b); }
.rb-tag.WRITTEN { background: var(--amber-l); color: var(--amber); }
.rb-tag.MATCHING { background: var(--purple-l); color: var(--purple); }
.rb-tag.answer { background: var(--gold-l); color: #8F765B; border: 1px solid var(--gold-b); }
.rb-add-q-btn {
  width: 100%; border: 2px dashed var(--gold-b); background: var(--gold-l);
  border-radius: var(--r); padding: 12px; font-size: 13px; color: #8F765B;
  cursor: pointer; font-family: var(--font); font-weight: 700;
  transition: all .22s var(--ease);
  display: flex; align-items: center; justify-content: center; gap: 7px;
}
.rb-add-q-btn:hover { border-color: var(--gold); background: rgba(184,160,130,0.12); transform: translateY(-1px); }

/* ─── ICON BUTTONS ─── */
.rb-icon-btn {
  background: none; border: 1px solid transparent; cursor: pointer;
  padding: 6px; border-radius: 8px; color: var(--ink4);
  transition: all .2s var(--ease);
  display: flex; align-items: center; justify-content: center;
}
.rb-icon-btn:hover { background: var(--surface3); color: var(--ink); border-color: var(--border); }
.rb-icon-btn.danger:hover { background: var(--red-l); color: var(--red); border-color: var(--red-b); }
.rb-icon-btn:disabled { opacity: .4; cursor: not-allowed; }

/* ─── BUTTONS ─── */
.rb-btn-primary {
  background: linear-gradient(135deg, var(--gold) 0%, var(--gold2) 100%);
  color: var(--black); border: none; border-radius: var(--r); padding: 12px 24px;
  font-size: 13px; font-weight: 800; cursor: pointer; font-family: var(--font);
  white-space: nowrap; transition: all .22s var(--ease);
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  box-shadow: 0 2px 8px rgba(184,160,130,0.25);
}
.rb-btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(184,160,130,0.35); }
.rb-btn-primary:active:not(:disabled) { transform: translateY(0); }
.rb-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.rb-btn-primary.lg { padding: 15px 40px; font-size: 15px; border-radius: var(--r2); }
.rb-btn-secondary {
  background: var(--surface); color: var(--ink); border: 1px solid var(--border2);
  border-radius: var(--r); padding: 10px 18px; font-size: 12px; font-weight: 600;
  cursor: pointer; font-family: var(--font); white-space: nowrap;
  transition: all .22s var(--ease);
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
.rb-btn-secondary:hover:not(:disabled) { border-color: var(--gold); color: #8F765B; background: var(--gold-l); }
.rb-btn-secondary:disabled { opacity: .5; cursor: not-allowed; }
.rb-btn-ghost {
  background: transparent; color: var(--ink2); border: 1px solid var(--border);
  border-radius: var(--r); padding: 12px 24px; font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: var(--font); white-space: nowrap;
  transition: all .22s var(--ease);
}
.rb-btn-ghost:hover { border-color: var(--border2); background: var(--surface3); }
.rb-btn-danger-sm {
  font-size: 12px; color: #fff; background: var(--red); border: none;
  border-radius: 9px; padding: 8px 14px; cursor: pointer; font-family: var(--font);
  white-space: nowrap; transition: all .22s var(--ease);
  display: flex; align-items: center; gap: 5px; font-weight: 700;
}
.rb-btn-danger-sm:hover { background: #5c1616; transform: translateY(-1px); }
.rb-btn-danger-sm svg { width: 13px; height: 13px; }

/* ─── INPUTS ─── */
.rb-input-row { display: flex; gap: 10px; }
.rb-input-wrap { flex: 1; }
.rb-input {
  width: 100%; border: 1.5px solid var(--border); border-radius: var(--r);
  padding: 11px 15px; font-size: 16px; font-family: var(--font);
  color: var(--ink); outline: none; background: var(--surface);
  transition: all .22s var(--ease);
}
.rb-input:focus { border-color: var(--gold); box-shadow: 0 0 0 3px var(--gold-l); background: #fff; }
.rb-input::placeholder { color: var(--ink4); }
.rb-textarea {
  width: 100%; border: 1.5px solid var(--border); border-radius: var(--r);
  padding: 14px 16px; font-family: var(--font); font-size: 16px;
  color: var(--ink); outline: none; resize: vertical; line-height: 1.7;
  background: var(--surface); transition: all .22s var(--ease); min-height: 100px;
}
.rb-textarea:focus { border-color: var(--gold); box-shadow: 0 0 0 3px var(--gold-l); background: #fff; }

/* ─── ADD STAGE BAR ─── */
.rb-add-stage-bar {
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: var(--r2); padding: 14px 18px;
  display: flex; gap: 10px; align-items: center;
  transition: all .22s var(--ease);
}
.rb-add-stage-bar:focus-within { border-color: var(--gold-b); box-shadow: var(--shadow-gold); }
.rb-add-stage-icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: var(--gold-l); border: 1px solid var(--gold-b); color: var(--gold);
  display: flex; align-items: center; justify-content: center;
}
.rb-add-module-row { display: flex; gap: 8px; }

/* ─── COMPLETION BADGE ─── */
.rb-completion { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 5px; }

/* ═══════════════════════════════════════════════════════════
   MODAL — Premium redesign
   ═══════════════════════════════════════════════════════════ */
.rb-overlay {
  position: fixed; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  background: rgba(11,11,12,.6); backdrop-filter: blur(12px);
  padding: 16px; animation: fadeIn .25s ease;
}
.rb-modal {
  background: var(--surface); border-radius: 24px;
  width: 100%; max-width: 520px; max-height: 88vh; overflow-y: auto;
  box-shadow: var(--shadow-lg), 0 0 0 1px rgba(184,160,130,0.08);
  animation: modalIn .35s var(--ease);
  position: relative;
}
.rb-modal::before {
  content: ''; position: absolute; top: 0; left: 20%; right: 20%; height: 2px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
  border-radius: 0 0 2px 2px;
}
.rb-modal.wide { max-width: 600px; }

.rb-modal-hd {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 28px 28px 0; position: relative;
}
.rb-modal-icon {
  width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--gold-l); color: var(--gold);
  border: 1px solid var(--gold-b);
}
.rb-modal-icon.red { background: var(--red-l); color: var(--red); border-color: var(--red-b); }
.rb-modal-icon.dark { background: rgba(11,11,12,.06); color: var(--black); border-color: rgba(11,11,12,.1); }
.rb-modal-icon.purple { background: var(--purple-l); color: var(--purple); border-color: rgba(74,32,128,0.15); }
.rb-modal-hd-text { flex: 1; padding-top: 4px; }
.rb-modal-title { font-size: 18px; font-weight: 900; color: var(--black); letter-spacing: -.2px; }
.rb-modal-sub { font-size: 12.5px; color: var(--ink3); margin-top: 3px; font-weight: 500; }
.rb-close-btn {
  background: none; border: none; cursor: pointer; color: var(--ink3);
  padding: 6px; border-radius: 8px; transition: all .2s var(--ease);
  display: flex; align-items: center;
}
.rb-close-btn:hover { background: var(--surface3); color: var(--ink); transform: rotate(90deg); }

.rb-modal-body { padding: 24px 28px; display: flex; flex-direction: column; gap: 20px; }
.rb-modal-ft {
  display: flex; gap: 10px; padding: 18px 28px 24px;
  border-top: 1px solid var(--border); background: var(--surface2);
  border-radius: 0 0 24px 24px;
}
.rb-field { display: flex; flex-direction: column; gap: 8px; }
.rb-label {
  font-size: 11.5px; font-weight: 700; color: var(--ink2);
  letter-spacing: .05em; text-transform: uppercase;
  display: flex; align-items: center; gap: 7px;
}
.rb-label-hint { font-size: 11px; color: var(--ink3); font-weight: 500; text-transform: none; }
.rb-error {
  background: var(--red-l); border: 1px solid var(--red-b); color: var(--red);
  font-size: 12.5px; padding: 11px 14px; border-radius: var(--r); font-weight: 600;
  display: flex; align-items: center; gap: 8px;
  animation: scaleIn .2s var(--ease);
}

/* ─── TYPE BTNS (question type selector) ─── */
.rb-type-row { display: flex; gap: 8px; flex-wrap: wrap; }
.rb-type-btn {
  flex: 1; min-width: 80px; padding: 14px 10px;
  border: 2px solid var(--border); border-radius: var(--r);
  font-size: 12px; font-weight: 700; cursor: pointer;
  background: var(--surface); color: var(--ink3); font-family: var(--font);
  transition: all .22s var(--ease);
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.rb-type-btn:hover { border-color: var(--gold-b); background: var(--gold-l); }
.rb-type-btn.active {
  background: var(--gold-l); color: var(--black); border-color: var(--gold);
  box-shadow: 0 2px 10px rgba(184,160,130,0.15);
}
.rb-type-btn .icon { display: flex; color: var(--ink4); transition: color .2s; }
.rb-type-btn.active .icon { color: var(--gold); }

/* ─── MCQ OPTIONS ─── */
.rb-opts { display: flex; flex-direction: column; gap: 8px; }
.rb-opt-row {
  display: flex; align-items: center; gap: 10px; padding: 5px 8px;
  border-radius: var(--r); transition: all .2s var(--ease);
}
.rb-opt-row.sel { background: var(--gold-l); }
.rb-opt-radio {
  width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--border2);
  cursor: pointer; flex-shrink: 0; display: flex; align-items: center;
  justify-content: center; transition: all .22s var(--ease);
  background: var(--surface); color: transparent;
}
.rb-opt-radio:hover { border-color: var(--gold2); }
.rb-opt-radio.sel { border-color: var(--gold); background: var(--gold); color: #fff; }
.rb-opt-num {
  width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0;
  background: var(--surface3); color: var(--ink3);
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}

/* ─── TF BTNS ─── */
.rb-tf-row { display: flex; gap: 10px; }
.rb-tf-btn {
  flex: 1; padding: 14px; border: 2px solid var(--border); border-radius: var(--r);
  font-size: 14px; font-weight: 700; cursor: pointer; background: var(--surface);
  font-family: var(--font); transition: all .22s var(--ease);
  display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--ink3);
}
.rb-tf-btn:hover { border-color: var(--gold-b); }
.rb-tf-btn.true { background: var(--gold-l); color: #8F765B; border-color: var(--gold); box-shadow: 0 2px 10px rgba(184,160,130,0.12); }
.rb-tf-btn.false { background: var(--red-l); color: var(--red); border-color: rgba(107,30,45,0.3); }

/* ─── MATCHING ─── */
.rb-pairs { display: flex; flex-direction: column; gap: 8px; }
.rb-pair-row { display: flex; align-items: center; gap: 8px; }
.rb-pair-row .rb-input { flex: 1; }
.rb-pair-arrow { color: var(--ink4); display: flex; flex-shrink: 0; }

/* ═══════════════════════════════════════════════════════════
   IMAGE UPLOAD ZONE — Premium design
   ═══════════════════════════════════════════════════════════ */
.rb-upload-zone {
  border: 2px dashed rgba(184,160,130,0.3); border-radius: var(--r2);
  padding: 36px 24px; display: flex; flex-direction: column; align-items: center;
  gap: 12px; cursor: pointer; text-align: center;
  background: linear-gradient(180deg, rgba(184,160,130,0.04), rgba(184,160,130,0.01));
  transition: all .3s var(--ease); position: relative; overflow: hidden;
}
.rb-upload-zone::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(circle at center, rgba(184,160,130,0.06), transparent 70%);
  opacity: 0; transition: opacity .3s;
}
.rb-upload-zone:hover {
  border-color: var(--gold); background: rgba(184,160,130,0.06);
  transform: translateY(-2px); box-shadow: 0 8px 30px rgba(184,160,130,0.1);
}
.rb-upload-zone:hover::before { opacity: 1; }
.rb-upload-zone .icon {
  color: var(--gold2); transition: all .3s var(--ease);
  position: relative; z-index: 1;
}
.rb-upload-zone:hover .icon { transform: translateY(-3px); color: var(--gold); }
.rb-upload-zone p { font-size: 13px; color: var(--ink3); font-weight: 500; position: relative; z-index: 1; line-height: 1.6; }
.rb-upload-zone strong { color: #8F765B; font-weight: 700; }
.rb-img-preview {
  width: 100%; max-height: 200px; object-fit: contain;
  border-radius: var(--r); border: 1px solid var(--border);
  background: var(--surface2);
}

/* ─── VIDEO PREVIEW ─── */
.rb-yt-preview {
  border-radius: var(--r); overflow: hidden;
  border: 1px solid var(--border); box-shadow: var(--shadow-xs);
  position: relative;
}
.rb-yt-preview::after {
  content: '▶'; position: absolute; top: 50%; left: 50%;
  transform: translate(-50%,-50%); width: 48px; height: 48px;
  background: rgba(11,11,12,0.7); border-radius: 50%; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; pointer-events: none;
}
.rb-yt-preview img { width: 100%; display: block; }

/* ─── EMPTY STATES ─── */
.rb-empty-full {
  background: var(--surface); border: 1px solid var(--border); border-radius: 24px;
  padding: 80px 40px; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  animation: fadeIn .5s var(--ease);
}
.rb-empty-icon-wrap {
  width: 100px; height: 100px; border-radius: 24px;
  background: var(--gold-l); border: 1px solid var(--gold-b);
  display: flex; align-items: center; justify-content: center;
  color: var(--gold); position: relative; margin-bottom: 8px;
  animation: float 3s ease-in-out infinite;
}
.rb-empty-glow {
  position: absolute; inset: -20px; border-radius: 50%;
  background: radial-gradient(circle, rgba(184,160,130,.1) 0%, transparent 70%);
  animation: pulse 3s ease-in-out infinite;
}
.rb-empty-title { font-size: 22px; font-weight: 900; color: var(--black); }
.rb-empty-sub { font-size: 14px; color: var(--ink3); max-width: 320px; line-height: 1.7; }
.rb-empty-sm {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 28px; color: var(--ink3); font-size: 13px; font-weight: 500; text-align: center;
}
.rb-empty-sm svg { color: var(--gold2); opacity: .5; }
.rb-empty-inline {
  display: flex; align-items: center; gap: 8px;
  padding: 16px; color: var(--ink3); font-size: 12.5px; font-weight: 500;
  font-style: italic;
}

/* ─── RESPONSIVE ─── */
@media (max-width: 768px) {
  .rb-stats { grid-template-columns: repeat(2, 1fr); }
  .rb-page { padding: 20px 16px 60px; }
}
@media (max-width: 480px) {
  .rb-stats { grid-template-columns: 1fr 1fr; gap: 8px; }
  .rb-stat { padding: 14px; gap: 10px; }
  .rb-stat-num { font-size: 22px; }
  .rb-header { padding: 20px; }
  .rb-page-title { font-size: 19px; }
  .rb-stage-head { padding: 14px 16px; }
  .rb-modal { border-radius: 20px; margin: 8px; }
  .rb-modal-hd, .rb-modal-body { padding-left: 20px; padding-right: 20px; }
  .rb-modal-ft { padding: 16px 20px 20px; }
  .rb-add-content-row { flex-wrap: wrap; }
  .rb-add-content-pill { flex: 1; justify-content: center; min-width: 80px; }
  .rb-upload-zone { padding: 28px 16px; }
}
`;
