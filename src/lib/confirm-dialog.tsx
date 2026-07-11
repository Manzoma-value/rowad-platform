"use client";

/**
 * Themed confirmation modal — replacement for the browser-native confirm().
 * Mounted once at the root via <ConfirmProvider>. Components call
 *   const confirm = useConfirm();
 *   if (await confirm({ message: "…" })) { …destructive thing… }
 *
 * Localized in AR / SQ / EN automatically from the current `useLang()` value.
 * Default variant is "danger" — destructive actions get the red treatment
 * and an explicit "this action cannot be undone" line.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLang } from "@/lib/language-context";

type Variant = "danger" | "warning" | "normal";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: Variant;
  /** Defaults to true for `danger`, false otherwise. */
  irreversible?: boolean;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fall back to the native dialog rather than crashing — keeps any caller
    // that mounts outside the provider working.
    return (opts: ConfirmOptions) =>
      Promise.resolve(window.confirm(opts.message));
  }
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);
  const { lang } = useLang();

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOpts(options);
    });
  }, []);

  const settle = (result: boolean) => {
    const fn = resolverRef.current;
    resolverRef.current = null;
    setOpts(null);
    fn?.(result);
  };

  // Keyboard: Escape cancels, Enter confirms.
  useEffect(() => {
    if (!opts) return;
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        settle(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        settle(true);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts]);

  // Prevent body scroll under the modal.
  useEffect(() => {
    if (!opts) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [opts]);

  const L = lang === "sq" ? "sq" : lang === "en" ? "en" : "ar";
  const i18n = TR[L];
  const variant = opts?.variant ?? "danger";
  const irrev = opts?.irreversible ?? variant === "danger";
  const dir = L === "ar" ? "rtl" : "ltr";

  return (
    <Ctx.Provider value={{ confirm }}>
      {children}
      {opts && (
        <div
          className="cf-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cf-title"
          onClick={() => settle(false)}
        >
          <div
            className={`cf-card cf-${variant}`}
            onClick={(e) => e.stopPropagation()}
            dir={dir}
          >
            <div className="cf-icon" aria-hidden>
              {variant === "danger" ? (
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : variant === "warning" ? (
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              )}
            </div>

            <h3 id="cf-title" className="cf-title">
              {opts.title ?? i18n.defaultTitle[variant]}
            </h3>

            <p className="cf-message">{opts.message}</p>

            {irrev && <p className="cf-irrev">{i18n.irreversible}</p>}

            <div className="cf-actions">
              <button
                type="button"
                className="cf-btn-cancel"
                onClick={() => settle(false)}
                autoFocus
              >
                {opts.cancelText ?? i18n.cancel}
              </button>
              <button
                type="button"
                className={`cf-btn-confirm cf-btn-${variant}`}
                onClick={() => settle(true)}
              >
                {opts.confirmText ?? i18n.confirm[variant]}
              </button>
            </div>
          </div>
          <style>{styles}</style>
        </div>
      )}
    </Ctx.Provider>
  );
}

const TR = {
  ar: {
    defaultTitle: { danger: "تأكيد الحذف", warning: "تأكيد العملية", normal: "تأكيد" },
    confirm:      { danger: "حذف نهائياً", warning: "متابعة", normal: "تأكيد" },
    cancel: "إلغاء",
    irreversible: "هذه العملية لا يمكن التراجع عنها.",
  },
  sq: {
    defaultTitle: { danger: "Konfirmo fshirjen", warning: "Konfirmo veprimin", normal: "Konfirmim" },
    confirm:      { danger: "Fshij përfundimisht", warning: "Vazhdo", normal: "Konfirmo" },
    cancel: "Anulo",
    irreversible: "Ky veprim nuk mund të zhbëhet.",
  },
  en: {
    defaultTitle: { danger: "Confirm deletion", warning: "Confirm action", normal: "Confirm" },
    confirm:      { danger: "Delete permanently", warning: "Continue", normal: "Confirm" },
    cancel: "Cancel",
    irreversible: "This action cannot be undone.",
  },
} as const;

const styles = `
@keyframes cfOverlayIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes cfCardIn { from { opacity: 0; transform: scale(.92) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }

.cf-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  padding: 18px;
  background: rgba(11,11,12,0.55);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  animation: cfOverlayIn 0.18s ease;
  font-family: 'Cairo','Tajawal',sans-serif;
}

.cf-card {
  max-width: 440px; width: 100%;
  background: linear-gradient(160deg, #FFFBF5 0%, #F7F3EB 100%);
  border: 1.5px solid rgba(184,160,130,0.45);
  border-radius: 22px;
  padding: 30px 28px 22px;
  box-shadow: 0 28px 72px rgba(80,60,20,0.32), inset 0 1px 0 rgba(255,255,255,0.55);
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  animation: cfCardIn 0.22s cubic-bezier(.22,1.4,.36,1);
  position: relative;
}
.cf-card.cf-danger  { border-color: rgba(107,30,45,0.40); }
.cf-card.cf-warning { border-color: rgba(184,160,130,0.55); }

.cf-icon {
  width: 60px; height: 60px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 6px;
  background: rgba(255,255,255,0.6);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), 0 4px 12px rgba(80,60,20,0.10);
}
.cf-card.cf-danger  .cf-icon { color: #6B1E2D; background: rgba(163,51,51,0.10); }
.cf-card.cf-warning .cf-icon { color: #B8A082; background: rgba(194,160,89,0.16); }
.cf-card.cf-normal  .cf-icon { color: #4A0E1C; background: rgba(194,160,89,0.16); }

.cf-title {
  font-family: 'El Messiri','Cairo',serif;
  font-size: 22px; font-weight: 800; color: #4A0E1C;
  margin: 0; letter-spacing: -.3px; line-height: 1.25;
}
.cf-card.cf-danger .cf-title { color: #6B1E2D; }

.cf-message {
  font-size: 14.5px; font-weight: 600; color: #5A4A30;
  line-height: 1.75; margin: 6px 0 0;
  max-width: 360px;
}
.cf-irrev {
  font-size: 12.5px; font-weight: 700;
  margin: 4px 0 0;
  padding: 6px 14px; border-radius: 99px;
  background: rgba(184,92,56,0.10);
  border: 1px solid rgba(184,92,56,0.25);
  color: #B85C38;
}
.cf-card.cf-danger .cf-irrev {
  background: rgba(163,51,51,0.10);
  border-color: rgba(163,51,51,0.30);
  color: #6B1E2D;
}

.cf-actions {
  display: flex; gap: 10px; margin-top: 16px;
  width: 100%; justify-content: stretch;
}

.cf-btn-cancel,
.cf-btn-confirm {
  flex: 1; min-width: 120px; min-height: 46px;
  padding: 11px 22px; border-radius: 12px;
  font-family: inherit; font-size: 13.5px; font-weight: 800;
  cursor: pointer; transition: all 0.18s cubic-bezier(.22,1,.36,1);
}

.cf-btn-cancel {
  background: rgba(255,255,255,0.7);
  border: 1.5px solid rgba(184,160,130,0.32);
  color: #5A4A30;
}
.cf-btn-cancel:hover  { background: #FFFBF5; border-color: #B8A082; color: #4A0E1C; }
.cf-btn-cancel:focus-visible { outline: 2px solid #B8A082; outline-offset: 2px; }

.cf-btn-confirm { border: 1px solid; }
.cf-btn-danger {
  background: linear-gradient(135deg,#8E2424,#6B1E2D);
  color: #FFE9D6; border-color: rgba(255,200,170,0.45);
  box-shadow: 0 6px 18px rgba(107,30,45,0.32);
}
.cf-btn-danger:hover {
  background: linear-gradient(135deg,#9C2A2A,#882323);
  transform: translateY(-1px);
  box-shadow: 0 10px 26px rgba(107,30,45,0.42);
}
.cf-btn-warning {
  background: linear-gradient(135deg,#4A0E1C,#3a2e1a);
  color: #D9C9B0; border-color: rgba(224,194,119,0.45);
  box-shadow: 0 6px 18px rgba(120,90,40,0.28);
}
.cf-btn-warning:hover {
  color: #F0D690; transform: translateY(-1px);
  box-shadow: 0 10px 26px rgba(120,90,40,0.38);
}
.cf-btn-normal {
  background: linear-gradient(135deg,#9A7833,#B8A082);
  color: #4A0E1C; border-color: rgba(0,0,0,0.10);
}
.cf-btn-confirm:focus-visible { outline: 2px solid #4A0E1C; outline-offset: 3px; }

@media(max-width:420px){
  .cf-card { padding: 24px 20px 18px; border-radius: 18px; }
  .cf-icon { width: 54px; height: 54px; }
  .cf-title { font-size: 19px; }
  .cf-message { font-size: 13.5px; }
  .cf-actions { flex-direction: column-reverse; gap: 8px; }
}
`;
