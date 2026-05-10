export const css = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --gold: #E5B93C;
  --gold2: #C8A96A;
  --gold-l: rgba(229,185,60,0.10);
  --gold-b: rgba(229,185,60,0.22);
  --gold-b2: rgba(200,169,106,0.20);
  --red: #7A1E1E;
  --red-l: rgba(122,30,30,0.08);
  --red-b: rgba(122,30,30,0.20);
  --black: #0B0B0C;
  --ink: #1C1C1E;
  --ink2: #444;
  --ink3: #888;
  --ink4: #bbb;
  --bg: #F5F3EE;
  --surface: #FFFFFF;
  --surface2: #FAFAF8;
  --surface3: #F2F0EC;
  --border: #E6E3DC;
  --border2: #D0CCC3;
  --purple-l: rgba(74,32,128,0.08);
  --purple: #4A2080;
  --amber-l: rgba(154,98,0,0.09);
  --amber: #9a6200;
  --green: #1A7A3A;
  --green-l: rgba(26,122,58,0.09);
  --r: 10px;
  --r2: 14px;
  --r3: 18px;
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-sm: 0 2px 6px rgba(0,0,0,0.06);
  --shadow: 0 4px 16px rgba(0,0,0,0.08);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.12);
  --ease: cubic-bezier(0.4,0,0.2,1);
  --t: 0.18s var(--ease);
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes modalIn { from { opacity: 0; transform: scale(0.97) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes pulse { 0%,100% { opacity:.5; } 50% { opacity:1; } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

/* ─── PAGE ─── */
.rb-page {
  font-family: 'Tajawal', sans-serif;
  color: var(--ink);
  background: var(--bg);
  min-height: 100vh;
  padding: 36px 28px 80px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 920px;
  margin: 0 auto;
}

/* ─── LOADING ─── */
.rb-loading { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); font-family: 'Tajawal', sans-serif; }
.rb-loading-inner { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.rb-spinner { width: 32px; height: 32px; border: 3px solid var(--gold-b); border-top-color: var(--gold); border-radius: 50%; animation: spin .7s linear infinite; }
.rb-btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(0,0,0,.2); border-top-color: var(--black); border-radius: 50%; animation: spin .6s linear infinite; display: inline-block; }
.rb-btn-primary .rb-btn-spinner { border-color: rgba(0,0,0,.2); border-top-color: var(--black); }

/* ─── HEADER ─── */
.rb-header { animation: slideUp .35s ease both; }
.rb-header-inner { display: flex; align-items: center; gap: 14px; }
.rb-header-icon { width: 50px; height: 50px; background: var(--black); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: var(--gold); flex-shrink: 0; }
.rb-page-title { font-size: 24px; font-weight: 800; color: var(--black); letter-spacing: -.3px; }
.rb-page-sub { font-size: 13px; color: var(--ink3); margin-top: 3px; font-weight: 500; }

/* ─── STATS ─── */
.rb-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; animation: slideUp .35s .08s ease both; }
.rb-stat { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r2); padding: 16px 18px; display: flex; align-items: center; gap: 12px; transition: var(--t); cursor: default; }
.rb-stat:hover { box-shadow: var(--shadow-sm); transform: translateY(-2px); }
.rb-stat-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rb-stat.gold .rb-stat-icon { background: var(--gold-l); color: var(--gold); }
.rb-stat.red .rb-stat-icon { background: var(--red-l); color: var(--red); }
.rb-stat.dark .rb-stat-icon { background: rgba(11,11,12,.07); color: var(--black); }
.rb-stat.purple .rb-stat-icon { background: var(--purple-l); color: var(--purple); }
.rb-stat-num { font-size: 26px; font-weight: 800; color: var(--black); line-height: 1; }
.rb-stat-label { font-size: 12px; color: var(--ink3); margin-top: 3px; font-weight: 600; }

/* ─── SECTION HEADER ─── */
.rb-section-hd { display: flex; align-items: center; gap: 10px; }
.rb-section-title { font-size: 16px; font-weight: 700; color: var(--black); }
.rb-section-count { background: var(--gold-l); color: #7A6020; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 100px; }

/* ─── STAGES ─── */
.rb-stages { display: flex; flex-direction: column; gap: 14px; animation: slideUp .35s .15s ease both; }
.rb-stages-list { display: flex; flex-direction: column; gap: 12px; }

/* ─── STAGE ─── */
.rb-stage { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r3); overflow: hidden; box-shadow: var(--shadow-xs); transition: box-shadow var(--t); }
.rb-stage:hover { box-shadow: var(--shadow-sm); }
.rb-stage-head { display: flex; align-items: center; gap: 10px; padding: 15px 18px; background: var(--black); border-bottom: 2px solid var(--gold); }
.rb-stage-toggle { display: flex; align-items: center; gap: 12px; flex: 1; background: none; border: none; cursor: pointer; text-align: right; }
.rb-stage-badge { width: 34px; height: 34px; border-radius: 9px; background: linear-gradient(135deg, var(--gold) 0%, var(--gold2) 100%); color: var(--black); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; flex-shrink: 0; }
.rb-stage-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.rb-stage-name { font-size: 15px; font-weight: 700; color: #fff; }
.rb-stage-stats { display: flex; align-items: center; gap: 10px; }
.rb-stage-stat { display: flex; align-items: center; gap: 4px; font-size: 11px; color: rgba(255,255,255,.45); }
.rb-stage-stat svg { width: 13px; height: 13px; }
.rb-stage-div { width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,.25); }
.rb-stage-body { padding: 18px; display: flex; flex-direction: column; gap: 10px; background: var(--surface2); }
.rb-chevron { display: flex; align-items: center; color: rgba(255,255,255,.35); transition: transform var(--t); }
.rb-chevron.open { transform: rotate(180deg); }
.rb-chevron.dark { color: var(--ink4); }

/* ─── MODULE ─── */
.rb-module { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r2); overflow: hidden; transition: border-color var(--t), box-shadow var(--t); }
.rb-module.open { border-color: var(--gold-b); box-shadow: var(--shadow-xs); }
.rb-mod-head { display: flex; align-items: center; gap: 8px; padding: 13px 15px; }
.rb-mod-toggle { display: flex; align-items: center; gap: 10px; flex: 1; background: none; border: none; cursor: pointer; text-align: right; }
.rb-mod-dot-wrap { width: 26px; height: 26px; border-radius: 7px; background: var(--gold-l); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rb-mod-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--gold); }
.rb-mod-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.rb-mod-name { font-size: 13px; font-weight: 700; color: var(--ink); }
.rb-mod-meta { font-size: 11px; color: var(--ink3); font-weight: 500; display: flex; align-items: center; gap: 6px; }
.rb-mod-meta-sep { width: 2px; height: 2px; border-radius: 50%; background: var(--ink4); }
.rb-mod-body { border-top: 1px solid var(--border); }

/* ─── CONTENT SECTION ─── */
.rb-content-section { padding: 14px 15px; background: rgba(200,169,106,0.04); }
.rb-section-label { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.rb-section-label-line { width: 3px; height: 16px; background: linear-gradient(180deg, var(--gold) 0%, var(--gold2) 100%); border-radius: 2px; }
.rb-section-label-text { font-size: 11px; font-weight: 800; color: var(--gold2); letter-spacing: .06em; text-transform: uppercase; }
.rb-content-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.rb-content-block { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 10px 12px; transition: border-color var(--t), box-shadow var(--t); }
.rb-content-block:hover { border-color: var(--gold-b); box-shadow: var(--shadow-xs); }
.rb-drag-handle { color: var(--ink4); cursor: grab; display: flex; align-items: center; flex-shrink: 0; }
.rb-content-type-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 5px; white-space: nowrap; flex-shrink: 0; }
.rb-content-type-badge.TEXT { background: var(--black); color: var(--gold2); }
.rb-content-type-badge.IMAGE { background: rgba(200,169,106,0.15); color: #7A6020; }
.rb-content-type-badge.VIDEO { background: var(--red-l); color: var(--red); }
.rb-content-preview { flex: 1; min-width: 0; }
.rb-content-preview-text { font-size: 12px; color: var(--ink2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; direction: rtl; text-align: right; }
.rb-content-preview-sub { font-size: 11px; color: var(--ink3); margin-top: 1px; display: flex; align-items: center; gap: 4px; direction: rtl; }
.rb-content-thumb { width: 40px; height: 40px; border-radius: 7px; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0; }
.rb-content-thumb-placeholder { width: 40px; height: 40px; border-radius: 7px; background: var(--gold-l); border: 1px solid var(--gold-b); display: flex; align-items: center; justify-content: center; color: var(--gold2); flex-shrink: 0; }
.rb-add-content-row { display: flex; gap: 8px; }
.rb-add-content-pill { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border: 1.5px solid var(--gold-b); border-radius: 100px; background: var(--gold-l); color: #7A6020; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Tajawal', sans-serif; transition: var(--t); }
.rb-add-content-pill:hover { border-color: var(--gold); background: rgba(229,185,60,0.14); }

/* ─── DIVIDER ─── */
.rb-section-divider { display: flex; align-items: center; gap: 0; padding: 0 15px; background: rgba(200,169,106,0.10); }
.rb-divider-line { flex: 1; height: 1px; background: var(--gold-b2); }
.rb-divider-diamond { width: 7px; height: 7px; background: var(--gold2); transform: rotate(45deg); border-radius: 1px; flex-shrink: 0; }

/* ─── QUESTIONS SECTION ─── */
.rb-q-section { padding: 14px 15px; background: var(--surface); }
.rb-q-list { display: flex; flex-direction: column; gap: 7px; margin-bottom: 10px; }
.rb-q-item { display: flex; align-items: flex-start; gap: 10px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r); padding: 11px 13px; transition: border-color var(--t); }
.rb-q-item:hover { border-color: var(--gold-b); }
.rb-q-num { width: 22px; height: 22px; border-radius: 6px; background: var(--red-l); color: var(--red); font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rb-q-body { flex: 1; min-width: 0; }
.rb-q-text { font-size: 13px; color: var(--ink); line-height: 1.55; margin-bottom: 7px; font-weight: 500; direction: rtl; text-align: right; }
.rb-q-tags { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; direction: rtl; }
.rb-tag { font-size: 10px; padding: 3px 8px; border-radius: 100px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
.rb-tag svg { width: 10px; height: 10px; }
.rb-tag.MCQ { background: var(--black); color: var(--gold2); }
.rb-tag.TF { background: var(--red-l); color: var(--red); border: 1px solid var(--red-b); }
.rb-tag.WRITTEN { background: var(--amber-l); color: var(--amber); }
.rb-tag.MATCHING { background: var(--purple-l); color: var(--purple); }
.rb-tag.answer { background: var(--gold-l); color: #7A6020; border: 1px solid var(--gold-b); }
.rb-q-actions { display: flex; flex-direction: column; gap: 3px; flex-shrink: 0; }
.rb-add-q-btn { width: 100%; border: 2px dashed var(--gold-b); background: var(--gold-l); border-radius: var(--r); padding: 10px; font-size: 12px; color: #7A6020; cursor: pointer; font-family: 'Tajawal', sans-serif; font-weight: 700; transition: var(--t); display: flex; align-items: center; justify-content: center; gap: 7px; }
.rb-add-q-btn:hover { border-color: var(--gold); background: rgba(229,185,60,0.14); }

/* ─── ICON BUTTONS ─── */
.rb-icon-btn { background: none; border: 1px solid transparent; cursor: pointer; padding: 5px; border-radius: 7px; color: var(--ink4); transition: var(--t); display: flex; align-items: center; justify-content: center; }
.rb-icon-btn:hover { background: var(--surface3); color: var(--ink); border-color: var(--border); }
.rb-icon-btn.danger:hover { background: var(--red-l); color: var(--red); border-color: var(--red-b); }
.rb-icon-btn:disabled { opacity: .4; cursor: not-allowed; }

/* ─── BUTTONS ─── */
.rb-btn-primary { background: linear-gradient(135deg, var(--gold) 0%, var(--gold2) 100%); color: var(--black); border: none; border-radius: var(--r); padding: 11px 22px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Tajawal', sans-serif; white-space: nowrap; transition: var(--t); display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
.rb-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(229,185,60,.4); }
.rb-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.rb-btn-primary.lg { padding: 14px 36px; font-size: 15px; border-radius: var(--r2); }
.rb-btn-secondary { background: var(--surface); color: var(--ink); border: 1px solid var(--border2); border-radius: var(--r); padding: 9px 16px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Tajawal', sans-serif; white-space: nowrap; transition: var(--t); display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.rb-btn-secondary:hover:not(:disabled) { border-color: var(--gold); color: #7A6020; }
.rb-btn-secondary:disabled { opacity: .5; cursor: not-allowed; }
.rb-btn-ghost { background: transparent; color: var(--ink2); border: 1px solid var(--border); border-radius: var(--r); padding: 11px 22px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Tajawal', sans-serif; white-space: nowrap; transition: var(--t); }
.rb-btn-ghost:hover { border-color: var(--ink3); background: var(--surface3); }
.rb-btn-danger-sm { font-size: 12px; color: #fff; background: var(--red); border: none; border-radius: 8px; padding: 7px 13px; cursor: pointer; font-family: 'Tajawal', sans-serif; white-space: nowrap; transition: var(--t); display: flex; align-items: center; gap: 5px; font-weight: 600; }
.rb-btn-danger-sm:hover { background: #5c1616; }
.rb-btn-danger-sm svg { width: 13px; height: 13px; }

/* ─── INPUTS ─── */
.rb-input-row { display: flex; gap: 10px; }
.rb-input-wrap { flex: 1; }
.rb-input { width: 100%; border: 1px solid var(--border); border-radius: var(--r); padding: 10px 14px; font-size: 13px; font-family: 'Tajawal', sans-serif; color: var(--ink); outline: none; background: var(--surface); transition: var(--t); }
.rb-input:focus { border-color: var(--gold); box-shadow: 0 0 0 3px var(--gold-l); }
.rb-input::placeholder { color: var(--ink4); }
.rb-textarea { width: 100%; border: 1px solid var(--border); border-radius: var(--r); padding: 12px 14px; font-family: 'Tajawal', sans-serif; font-size: 13px; color: var(--ink); outline: none; resize: vertical; line-height: 1.65; background: var(--surface); transition: var(--t); min-height: 90px; }
.rb-textarea:focus { border-color: var(--gold); box-shadow: 0 0 0 3px var(--gold-l); }

/* ─── ADD STAGE BAR ─── */
.rb-add-stage-bar { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r2); padding: 14px 18px; display: flex; gap: 10px; align-items: center; }
.rb-add-stage-icon { width: 36px; height: 36px; border-radius: 9px; background: var(--gold-l); color: var(--gold); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rb-add-module-row { display: flex; gap: 8px; }

/* ─── COMPLETION BADGE ─── */
.rb-completion { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 5px; }
.rb-completion.done { background: var(--green-l); color: var(--green); }
.rb-completion.none { background: var(--surface3); color: var(--ink4); }

/* ─── MODAL ─── */
.rb-overlay { position: fixed; inset: 0; z-index: 200; display: flex; align-items: center; justify-content: center; background: rgba(11,11,12,.55); backdrop-filter: blur(6px); padding: 16px; animation: fadeIn .2s ease; }
.rb-modal { background: var(--surface); border-radius: var(--r3); width: 100%; max-width: 500px; max-height: 88vh; overflow-y: auto; box-shadow: var(--shadow-lg); animation: modalIn .22s ease; }
.rb-modal.wide { max-width: 580px; }
.rb-modal-hd { display: flex; align-items: flex-start; gap: 12px; padding: 22px 22px 0; }
.rb-modal-icon { width: 40px; height: 40px; border-radius: 11px; background: var(--gold-l); color: var(--gold); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rb-modal-icon.red { background: var(--red-l); color: var(--red); }
.rb-modal-icon.dark { background: rgba(11,11,12,.07); color: var(--black); }
.rb-modal-icon.purple { background: var(--purple-l); color: var(--purple); }
.rb-modal-title { font-size: 16px; font-weight: 800; color: var(--black); }
.rb-modal-sub { font-size: 12px; color: var(--ink3); margin-top: 2px; }
.rb-modal-hd-text { flex: 1; }
.rb-close-btn { background: none; border: none; cursor: pointer; color: var(--ink3); padding: 5px; border-radius: 7px; transition: var(--t); display: flex; align-items: center; }
.rb-close-btn:hover { background: var(--surface3); color: var(--ink); }
.rb-modal-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 18px; }
.rb-modal-ft { display: flex; gap: 8px; padding: 14px 22px 20px; border-top: 1px solid var(--border); }
.rb-field { display: flex; flex-direction: column; gap: 8px; }
.rb-label { font-size: 11px; font-weight: 700; color: var(--ink2); letter-spacing: .04em; text-transform: uppercase; display: flex; align-items: center; gap: 7px; }
.rb-label-hint { font-size: 11px; color: var(--ink3); font-weight: 500; text-transform: none; }
.rb-error { background: var(--red-l); border: 1px solid var(--red-b); color: var(--red); font-size: 12px; padding: 10px 13px; border-radius: var(--r); font-weight: 500; display: flex; align-items: center; gap: 8px; }

/* ─── TYPE BTNS ─── */
.rb-type-row { display: flex; gap: 8px; flex-wrap: wrap; }
.rb-type-btn { flex: 1; min-width: 80px; padding: 11px 10px; border: 2px solid var(--border); border-radius: var(--r); font-size: 12px; font-weight: 700; cursor: pointer; background: var(--surface); color: var(--ink3); font-family: 'Tajawal', sans-serif; transition: var(--t); display: flex; flex-direction: column; align-items: center; gap: 5px; }
.rb-type-btn:hover { border-color: var(--gold-b); }
.rb-type-btn.active { background: var(--gold-l); color: var(--black); border-color: var(--gold); }
.rb-type-btn .icon { display: flex; color: var(--ink4); transition: var(--t); }
.rb-type-btn.active .icon { color: var(--gold); }

/* ─── MCQ OPTIONS ─── */
.rb-opts { display: flex; flex-direction: column; gap: 8px; }
.rb-opt-row { display: flex; align-items: center; gap: 9px; padding: 3px; border-radius: var(--r); transition: background var(--t); }
.rb-opt-row.sel { background: var(--gold-l); }
.rb-opt-radio { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--border2); cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: var(--t); background: var(--surface); color: #fff; }
.rb-opt-radio:hover { border-color: var(--gold2); }
.rb-opt-radio.sel { border-color: var(--gold); background: var(--gold); }
.rb-opt-num { width: 20px; height: 20px; border-radius: 5px; background: var(--surface3); color: var(--ink3); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

/* ─── TF BTNS ─── */
.rb-tf-row { display: flex; gap: 10px; }
.rb-tf-btn { flex: 1; padding: 13px; border: 2px solid var(--border); border-radius: var(--r); font-size: 14px; font-weight: 700; cursor: pointer; background: var(--surface); font-family: 'Tajawal', sans-serif; transition: var(--t); display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--ink3); }
.rb-tf-btn:hover { border-color: var(--gold-b); }
.rb-tf-btn.true { background: var(--gold-l); color: #7A6020; border-color: var(--gold); }
.rb-tf-btn.false { background: var(--red-l); color: var(--red); border-color: var(--red); }

/* ─── MATCHING ─── */
.rb-pairs { display: flex; flex-direction: column; gap: 8px; }
.rb-pair-row { display: flex; align-items: center; gap: 8px; }
.rb-pair-row .rb-input { flex: 1; }
.rb-pair-arrow { color: var(--ink4); display: flex; flex-shrink: 0; }

/* ─── IMAGE UPLOAD ─── */
.rb-upload-zone { border: 2px dashed var(--gold-b); border-radius: var(--r2); padding: 28px; display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; transition: var(--t); text-align: center; background: var(--gold-l); }
.rb-upload-zone:hover { border-color: var(--gold); background: rgba(229,185,60,.12); }
.rb-upload-zone .icon { color: var(--gold2); }
.rb-upload-zone p { font-size: 12px; color: var(--ink3); font-weight: 500; }
.rb-upload-zone strong { color: #7A6020; }
.rb-img-preview { width: 100%; max-height: 160px; object-fit: contain; border-radius: var(--r); border: 1px solid var(--border); }

/* ─── VIDEO PREVIEW ─── */
.rb-yt-preview { border-radius: var(--r); overflow: hidden; border: 1px solid var(--border); }
.rb-yt-preview img { width: 100%; display: block; }

/* ─── EMPTY STATES ─── */
.rb-empty-full { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r3); padding: 70px 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; animation: fadeIn .4s ease; }
.rb-empty-icon-wrap { width: 90px; height: 90px; border-radius: 22px; background: var(--gold-l); display: flex; align-items: center; justify-content: center; color: var(--gold); position: relative; margin-bottom: 6px; }
.rb-empty-glow { position: absolute; inset: -16px; background: radial-gradient(circle, rgba(229,185,60,.12) 0%, transparent 70%); animation: pulse 3s ease-in-out infinite; }
.rb-empty-title { font-size: 20px; font-weight: 800; color: var(--black); }
.rb-empty-sub { font-size: 13px; color: var(--ink3); max-width: 300px; line-height: 1.6; }
.rb-empty-sm { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 24px; color: var(--ink3); font-size: 12px; font-weight: 500; text-align: center; }
.rb-empty-sm svg { color: var(--gold2); opacity: .6; }
.rb-empty-inline { display: flex; align-items: center; gap: 8px; padding: 14px; color: var(--ink3); font-size: 12px; font-weight: 500; }
.rb-empty-inline svg { color: var(--gold2); }
`;