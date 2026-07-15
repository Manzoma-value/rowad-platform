export const authPremiumCss = `
  /* Premium Albania identity layer */
  @keyframes authReveal{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}
  @keyframes authGlow{0%,100%{opacity:.30;transform:translate3d(-2%,-1%,0) scale(1)}50%{opacity:.42;transform:translate3d(2%,1%,0) scale(1.035)}}
  @keyframes authShine{0%{transform:translateX(-130%) skewX(-18deg)}100%{transform:translateX(230%) skewX(-18deg)}}

  .lp-shell{
    position:relative;display:flex;
    min-height:100dvh;height:100dvh;overflow:hidden;isolation:isolate;
    background:
      radial-gradient(circle at 12% 8%,rgba(217,201,176,.38),transparent 30%),
      radial-gradient(circle at 86% 78%,rgba(107,30,45,.17),transparent 31%),
      linear-gradient(115deg,#f8f4ec 0%,#eee7dc 51%,#4a0e1c 51.2%,#240911 100%);
  }
  .lp-shell::after{
    content:'';position:absolute;inset:18px;z-index:4;pointer-events:none;border:1px solid rgba(184,160,130,.25);
    border-radius:28px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.035);
  }
  .lp-identity-watermark{
    position:absolute;z-index:0;left:50%;top:50%;width:min(68vw,900px);aspect-ratio:1;
    transform:translate(-50%,-50%);background:url('/newIdentityBG.png') center/contain no-repeat;
    opacity:.16;mix-blend-mode:multiply;filter:saturate(.9) contrast(1.06);pointer-events:none;
  }

  .lp-panel{
    flex:0 0 44%;width:44%;min-width:0;min-height:100dvh;background:linear-gradient(145deg,rgba(73,14,28,.90),rgba(35,8,15,.86));
    border-inline-end:1px solid rgba(217,201,176,.28);box-shadow:30px 0 100px rgba(40,8,15,.24);
    backdrop-filter:blur(9px);animation:none;
  }
  .lp-shell[dir='rtl'] .lp-panel{border-inline-end:0;border-inline-start:1px solid rgba(217,201,176,.28);}
  .lp-panel::before{
    inset:0;background:
      linear-gradient(180deg,rgba(28,6,12,.08),rgba(28,6,12,.42)),
      repeating-linear-gradient(135deg,transparent 0 28px,rgba(217,201,176,.022) 28px 29px);
    opacity:1;filter:none;
  }
  .lp-panel::after{inset:32px;border-color:rgba(217,201,176,.16);border-radius:24px;}
  .lp-panel-inner{padding:64px clamp(46px,5vw,82px);gap:22px;justify-content:center;}
  .lp-location{
    position:absolute;top:48px;display:flex;align-items:center;gap:10px;color:#d9c9b0;font:700 10px/1.2 'Cairo',sans-serif;
    letter-spacing:.18em;text-transform:uppercase;
  }
  .lp-location span:last-child{color:rgba(217,201,176,.48);font-weight:500;letter-spacing:.1em;}
  .lp-location-dot{width:7px;height:7px;border-radius:50%;background:#bb1e2d;box-shadow:0 0 0 5px rgba(187,30,45,.14),0 0 18px rgba(187,30,45,.8);}
  .lp-brand-emblem{width:92px;height:92px;position:relative;display:grid;place-items:center;margin:10px 0 12px;}
  .lp-brand-emblem::before,.lp-brand-emblem::after{display:none;}
  .lp-mandala{display:none!important;}
  .lp-brand-letter{
    position:relative;z-index:2;display:grid;place-items:center;width:68px;height:68px;border-radius:22px;
    color:#4a0e1c;background:linear-gradient(145deg,#efe4d2,#b8a082);font-size:31px;font-weight:900;
    box-shadow:0 16px 40px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.62);transform:rotate(-2deg);
  }
  .lp-brand-logo{
    object-fit:contain;transform:scale(1.35);
    filter:drop-shadow(0 16px 24px rgba(0,0,0,.34));
  }
  .lp-brand-emblem .lp-school-badge{
    width:72px;height:72px;margin:0;border-radius:23px;font-size:28px;
    color:#4a0e1c;background:linear-gradient(145deg,#efe4d2,#b8a082);
    box-shadow:0 16px 40px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.62);transform:rotate(-2deg);
  }
  .lp-brand-text{gap:8px;max-width:560px;}
  .lp-brand-kicker{font-size:11px;font-weight:800;color:#d9c9b0;letter-spacing:.04em;margin-bottom:2px;}
  .lp-brand-name{font-size:clamp(30px,3.2vw,48px);letter-spacing:-1px;background:linear-gradient(180deg,#fffaf2,#cfb998);-webkit-background-clip:text;background-clip:text;color:transparent;}
  .lp-brand-tag{font-size:12px;color:rgba(239,234,224,.66);}
  .lp-albanian-values{display:flex;align-items:center;gap:12px;color:rgba(217,201,176,.66);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;}
  .lp-albania-monogram{display:grid;place-items:center;width:30px;height:30px;border:1px solid rgba(217,201,176,.34);border-radius:9px;color:#f0dfc4;background:rgba(255,255,255,.045);letter-spacing:.04em;}
  .lp-panel .lp-lang-toggle{margin-top:4px;}
  .lp-panel-footer{bottom:44px;}
  .lp-panel-quote{color:rgba(217,201,176,.35);}

  .lp-form-side{
    flex:1 1 56%;width:56%;min-width:0;min-height:100dvh;padding:42px clamp(34px,5vw,86px);background:transparent;overflow-y:auto;
  }
  .lp-form-side::before{display:none;}
  .lp-form-wrap{
    max-width:540px;padding:clamp(34px,4vw,54px);border-radius:32px;position:relative;overflow:hidden;
    border:1px solid rgba(255,255,255,.72);background:linear-gradient(145deg,rgba(255,253,248,.88),rgba(241,234,223,.78));
    box-shadow:0 38px 100px rgba(48,12,21,.18),0 8px 28px rgba(48,12,21,.08),inset 0 1px 0 #fff;
    backdrop-filter:blur(26px) saturate(1.15);animation:authReveal .7s cubic-bezier(.2,.85,.25,1) both;
  }
  .lp-form-wrap::before{content:'';position:absolute;top:0;inset-inline-start:9%;width:42%;height:2px;background:linear-gradient(90deg,transparent,#b8a082,transparent);}
  .lp-form-wrap::after{content:'AL';position:absolute;inset-inline-end:-3px;bottom:-38px;color:rgba(107,30,45,.035);font-size:150px;font-weight:900;line-height:1;pointer-events:none;}
  .lp-form-topline{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:28px;}
  .lp-form-eyebrow{font-size:11px;color:#6b1e2d;font-weight:800;letter-spacing:.08em;}
  .lp-secure-badge{display:flex;align-items:center;gap:7px;color:#7d6b54;font-size:8px;font-weight:800;letter-spacing:.14em;direction:ltr;white-space:nowrap;}
  .lp-secure-badge i{width:6px;height:6px;border-radius:50%;background:#1b5e20;box-shadow:0 0 0 4px rgba(27,94,32,.09);}
  .lp-form-ornament{margin-bottom:20px;}
  .lp-form-header{margin-bottom:30px;}
  .lp-form-title{font-size:clamp(27px,2.4vw,36px);line-height:1.25;letter-spacing:-.7px;color:#25171a;}
  .lp-form-title::after{width:54px;height:3px;margin-top:12px;background:linear-gradient(90deg,#6b1e2d,#b8a082);}
  .lp-form-sub{font-size:13px;margin-top:10px;color:#7d6b54;}
  .lp-fields{gap:18px;position:relative;z-index:1;}
  .lp-label{font-size:11px;color:#4f3f42;letter-spacing:.06em;}
  .lp-label-icon{width:24px;height:24px;border-radius:8px;color:#6b1e2d;background:rgba(107,30,45,.07);border:1px solid rgba(107,30,45,.08);}
  .lp-input{padding:15px 17px;border-radius:15px;background:rgba(255,255,255,.72);border-color:rgba(126,94,73,.24);box-shadow:0 7px 20px rgba(67,33,39,.045),inset 0 1px 0 #fff;}
  .lp-input:hover:not(:disabled){border-color:rgba(107,30,45,.35);}
  .lp-input:focus{border-color:#8d3c4d;box-shadow:0 0 0 4px rgba(107,30,45,.085),0 12px 28px rgba(67,33,39,.07);transform:translateY(-1px);}
  .lp-btn{min-height:54px;border-radius:16px;background:linear-gradient(115deg,#4a0e1c,#7c2638 52%,#4a0e1c);background-size:180% 100%;box-shadow:0 16px 34px rgba(74,14,28,.26),inset 0 1px 0 rgba(255,255,255,.16);}
  .lp-btn::after{content:'';position:absolute;inset:-20% auto -20% 0;width:28%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.20),transparent);transform:translateX(-130%) skewX(-18deg);}
  .lp-btn:hover:not(:disabled)::after{animation:authShine .8s ease;}
  .lp-btn:hover:not(:disabled){background-position:100% 0;transform:translateY(-2px);}
  .lp-divider{position:relative;z-index:1;}
  .lp-footer-text{position:relative;z-index:1;}

  @media(max-width:980px){
    .lp-panel{flex-basis:40%;width:40%;}
    .lp-form-side{flex-basis:60%;width:60%;}
    .lp-panel-inner{padding-inline:38px;}
    .lp-brand-name{font-size:31px;}
    .lp-form-side{padding-inline:30px;}
  }
  @media(max-width:820px){
    .lp-shell,.lp-shell[dir='rtl']{display:flex;flex-direction:column;height:auto;min-height:100dvh;background:linear-gradient(165deg,#3e0c18 0 18%,#efe8dc 42%,#f8f4ed 100%);}
    .lp-shell::after{inset:8px;border-radius:22px;}
    .lp-identity-watermark{position:fixed;width:min(130vw,680px);top:52%;opacity:.12;}
    .lp-panel,.lp-shell[dir='rtl'] .lp-panel{width:100%;min-height:auto;border:0;background:rgba(44,8,17,.84);backdrop-filter:blur(12px);}
    .lp-panel::after{inset:9px;border-radius:18px;}
    .lp-panel-inner{height:auto;padding:18px 24px;padding-top:calc(env(safe-area-inset-top,0px) + 18px);display:grid;grid-template-columns:auto 1fr auto;gap:14px;}
    .lp-location,.lp-brand-emblem,.lp-brand-kicker,.lp-brand-tag,.lp-albanian-values,.lp-panel-footer,.lp-brand-text .lp-rule{display:none;}
    .lp-brand-text{display:block;text-align:start;min-width:0;}
    .lp-brand-name{font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#efeae0;background:none;-webkit-text-fill-color:initial;}
    .lp-panel .lp-lang-toggle{grid-column:3;margin:0;}
    .lp-form-side,.lp-shell[dir='rtl'] .lp-form-side{width:100%;min-height:0;flex:1;padding:30px 18px 46px;align-items:flex-start;background:transparent;}
    .lp-form-wrap{max-width:560px;margin-inline:auto;padding:30px 24px;border-radius:25px;}
    .lp-form-topline{margin-bottom:20px;}
  }
  @media(max-width:430px){
    .lp-panel-inner{padding-inline:18px;}
    .lp-form-side,.lp-shell[dir='rtl'] .lp-form-side{padding:22px 13px 36px;}
    .lp-form-wrap{padding:26px 19px;border-radius:22px;}
    .lp-form-title{font-size:25px;}
    .lp-form-topline{gap:10px;}
    .lp-secure-badge{font-size:7px;letter-spacing:.09em;}
  }
  @media(prefers-reduced-motion:reduce){.lp-identity-watermark,.lp-brand-emblem::after{animation:none}.lp-form-wrap{animation:none}}
`;

export const schoolAuthPremiumCss = authPremiumCss.replaceAll(".lp-", ".sp-");
