// Deliberately local to the general login; tenant-branded login pages keep
// their own identity and styling.
export const whiteLabelLoginCss = `
.lp-shell{height:auto;min-height:100dvh;overflow:visible;background:#FFFBF5;color:#4A0E1C;font-family:'Tajawal',Arial,sans-serif}
.lp-shell[dir=rtl] :is(input,button){font-family:'Tajawal',Arial,sans-serif}
.lp-shell[dir=ltr],.lp-shell[dir=ltr] :is(input,button){font-family:Arial,Helvetica,sans-serif}
.lp-shell :is(a,button):focus-visible{outline:3px solid #B8A082;outline-offset:4px}
.lp-identity-watermark,.lp-corner{display:none}
.lp-panel{width:45%;min-height:100dvh;background:#32101A;box-shadow:none;border:0}
.lp-panel::before{inset:0;background:linear-gradient(145deg,rgba(107,30,46,.96),rgba(23,19,19,.98)),url('/binaa-brand/bina-alahliyya-brand-kit-v2/06-Patterns/pattern-original-fine-dark.svg') center/cover;opacity:1;filter:none}
.lp-panel::after{display:none}
.lp-panel-inner{padding:105px 12%;align-items:flex-start;gap:30px;text-align:start}
.lp-location{position:absolute;top:45px;display:flex;gap:12px;align-items:center;color:#FFFBF5;font-size:12px;font-weight:700;letter-spacing:.1em}
.lp-location span:last-child{font-size:8px;font-weight:400;color:#D9C9B0;letter-spacing:.08em}
.lp-location-dot{width:6px;height:6px;border-radius:50%;background:#B8A082}
.lp-brand-emblem{width:75px;height:75px;position:relative;margin-top:25px}
.lp-brand-logo{object-fit:contain;filter:none}.lp-mandala{display:none}
.lp-brand-text{display:flex;flex-direction:column;align-items:flex-start;text-align:start;gap:16px}
.lp-brand-text .lp-rule{display:none}.lp-brand-kicker{font-size:10px;color:#D9C9B0;letter-spacing:.06em}
.lp-brand-name{font-size:clamp(34px,4vw,60px);font-weight:500;line-height:1.25;letter-spacing:-1.8px;background:none;color:#FFFBF5}
.lp-brand-tag{font-size:16px;font-weight:400;color:#D9C9B0;max-width:310px;line-height:1.9}
.lp-albanian-values{display:flex;align-items:center;gap:12px;color:#D9C9B0;font-size:10px;letter-spacing:.05em;padding-top:15px;border-top:1px solid #B8A08240;width:100%}
.lp-albania-monogram{width:28px;height:28px;display:grid;place-items:center;border:1px solid #B8A08266;border-radius:8px;font-family:Georgia,serif;font-size:15px}
.lp-panel-footer{bottom:40px;padding:0 20px}.lp-panel-quote{color:#D9C9B0;font-size:9px;letter-spacing:0}
.lp-form-side{min-height:100dvh;background:#FFFBF5;padding:95px 6% 65px;overflow:visible;flex-direction:column;position:relative}
.lp-form-side::before{display:none}.lp-back-home{position:absolute;top:40px;inset-inline-start:9%;display:flex;gap:12px;align-items:center;font-size:11px;color:#655B53;text-decoration:none}.lp-back-home:hover{color:#4A0E1C}
.lp-shell .lp-eye{inset-inline-end:auto;left:auto;right:8px}
.lp-form-wrap{max-width:435px;width:100%;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;backdrop-filter:none}
.lp-form-topline{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:22px}.lp-form-eyebrow{font-size:11px;color:#8F765B;font-weight:600}.lp-secure-badge{display:flex;align-items:center;gap:6px;font-size:8px;color:#655B53;letter-spacing:.08em}.lp-secure-badge i{width:5px;height:5px;background:#1B5E20;border-radius:50%}
.lp-form-ornament{display:none}.lp-form-header{text-align:start;margin-bottom:32px}.lp-form-title{font-size:38px;font-weight:500;color:#4A0E1C;letter-spacing:-1px;line-height:1.4}.lp-form-title::after{display:none}.lp-form-sub{font-size:13px;line-height:1.8;margin-top:8px;color:#655B53}
.lp-fields{gap:20px}.lp-label{font-size:10px;letter-spacing:.07em;color:#655B53}.lp-label-icon{background:transparent;color:#8F765B;width:15px}.lp-input{border:1px solid #D9C9B0;border-radius:9px;box-shadow:none;background:#FFFFFF;padding:16px;font-size:15px;color:#4A0E1C}.lp-input:focus{background:#FFFFFF;border-color:#8F765B;box-shadow:0 0 0 3px #B8A08226}.lp-input--with-action{padding-right:50px;padding-left:16px}.lp-eye{right:8px;left:auto;inset-inline-end:auto;width:36px;height:36px;color:#655B53}.lp-btn{border-radius:9px;background:#4A0E1C;box-shadow:0 6px 15px #32101a12;padding:16px;font-size:14px;color:#FFFBF5;font-weight:600}.lp-btn:hover:not(:disabled){background:#6B1E2D;box-shadow:0 10px 20px #32101a1a}.lp-btn::before{display:none}.lp-forgot{color:#4A0E1C;opacity:1;font-weight:500}.lp-footer-text{font-size:12px;color:#655B53}.lp-link{color:#4A0E1C}.lp-divider{margin:28px 0 20px}.lp-lang-toggle{border-color:#B8A08266}.lp-lang-btn{min-height:36px}
@media(max-width:1000px){.lp-panel-inner{padding-inline:10%}.lp-brand-tag{font-size:14px}.lp-form-side{padding-inline:5%}}
@media(max-width:820px){.lp-shell{flex-direction:column;overflow:visible}.lp-panel{width:100%;min-height:auto}.lp-panel::after{display:none}.lp-panel-inner{display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:15px;padding:23px 6%}.lp-brand-text{display:block;flex:1}.lp-brand-name{font-size:23px;letter-spacing:-.4px}.lp-brand-kicker,.lp-brand-tag,.lp-brand-emblem,.lp-location,.lp-albanian-values,.lp-panel-footer{display:none}.lp-panel .lp-lang-toggle{display:flex;margin:0}.lp-form-side{width:100%;min-height:calc(100dvh - 84px);padding:85px 7% 45px;align-items:center}.lp-back-home{top:26px;inset-inline-start:7%}.lp-form-wrap{padding:0;max-width:440px}.lp-form-title{font-size:32px}.lp-form-sub{font-size:12px}.lp-form-topline{margin-bottom:17px}}
.lp-shell .lp-panel .lp-lang-toggle{display:grid;grid-template-columns:1fr 1fr;flex-shrink:0}
@media(prefers-reduced-motion:reduce){.lp-shell *{animation:none!important;transition:none!important}}
`;
