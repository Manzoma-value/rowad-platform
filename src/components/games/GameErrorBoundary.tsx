"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; message: string; retryLabel: string; onRetry?: () => void };
type State = { hasError: boolean };

/**
 * Catches unexpected render-time exceptions during play so a stray bug
 * white-screens a small recovery card instead of the whole tab — and since
 * the board's progress is already autosaved (see useModelDraft), "retry"
 * genuinely recovers the player's work instead of losing it.
 */
export class GameErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[game error boundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ge-boundary">
          <p>{this.props.message}</p>
          <button
            type="button"
            onClick={() => { this.setState({ hasError: false }); this.props.onRetry?.(); }}
          >
            {this.props.retryLabel}
          </button>
          <style>{`
            .ge-boundary{max-width:520px;margin:60px auto;padding:28px;text-align:center;font-family:'Cairo',sans-serif;
              background:#FFFBF5;border:1.5px solid rgba(107,30,45,.3);border-radius:16px;color:#6B1E2D}
            .ge-boundary p{margin:0 0 16px;font-size:14px;font-weight:700;line-height:1.8}
            .ge-boundary button{border:0;border-radius:11px;padding:11px 26px;font:900 13.5px 'Cairo',sans-serif;
              cursor:pointer;background:linear-gradient(135deg,#4A0E1C,#6B1E2D);color:#D9C9B0}
          `}</style>
        </div>
      );
    }
    return this.props.children;
  }
}
