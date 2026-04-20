import React, { useEffect, useState } from "react";
import { getCardConfig } from "@/types/cards";

interface PendingActionState {
  playedByDisplayName: string;
  cardCode?: string;
  comboCards?: string[];
  target?: string | null;
}

interface NopeState {
  nopeCount: number;
  isCancel: boolean;
  lastPlayedByDisplayName: string;
}

interface NopeToastProps {
  isOpen: boolean;
  pendingAction: PendingActionState | null;
  nopeState: NopeState | null;
  targetDisplayName?: string;
}

/**
 * A non-blocking toast that floats at the top of the screen
 * during the 3-second Nope window. Visible to ALL players.
 */
export function NopeToast({
  isOpen,
  pendingAction,
  nopeState,
  targetDisplayName,
}: NopeToastProps) {
  const [timeLeft, setTimeLeft] = useState(3);

  // Reset & tick the countdown whenever the window opens or a new nope is played
  useEffect(() => {
    if (!isOpen) return;

    setTimeLeft(3);
    let current = 30; // 30 ticks × 100ms = 3s
    const interval = setInterval(() => {
      current--;
      setTimeLeft(current / 10);
      if (current <= 0) clearInterval(interval);
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, nopeState?.nopeCount]);

  if (!isOpen || !pendingAction) return null;

  const isCombo = !!pendingAction.comboCards;
  const cardLabel = isCombo
    ? "Combo"
    : pendingAction.cardCode
      ? getCardConfig(pendingAction.cardCode).label
      : "Action";
  const cardEmoji = isCombo
    ? "🐱"
    : pendingAction.cardCode
      ? getCardConfig(pendingAction.cardCode).emoji
      : "🎴";

  const nopeStatusText = nopeState
    ? nopeState.isCancel
      ? "❌ Noped!"
      : "✅ Yup!"
    : null;

  return (
    <div
      className="fixed bottom-[280px] left-1/2 -translate-x-1/2 z-[2000] flex flex-col items-center gap-1 pointer-events-none"
      style={{ animation: "slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(80px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
        @keyframes nopeGlow {
          0%, 100% { box-shadow: 0 0 12px rgba(239,68,68,0.6), 0 0 30px rgba(239,68,68,0.25); }
          50%      { box-shadow: 0 0 20px rgba(239,68,68,0.9), 0 0 50px rgba(239,68,68,0.4); }
        }
      `}</style>

      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
        style={{
          background: "rgba(20,10,2,0.92)",
          backdropFilter: "blur(16px)",
          border: nopeState
            ? "1px solid rgba(239,68,68,0.7)"
            : "1px solid rgba(245,166,35,0.6)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          fontFamily: "'Fredoka One', cursive",
        }}
      >
        <span className="text-base">{cardEmoji}</span>

        <div className="flex flex-col">
          <span className="text-white text-[10px] font-bold">
            {pendingAction.playedByDisplayName} เล่น {cardLabel}
            {targetDisplayName ? ` → ${targetDisplayName}` : ""}
          </span>
          {nopeState && (
            <span className="text-[9px] font-bold" style={{ color: nopeState.isCancel ? "#f87171" : "#4ade80" }}>
              {nopeState.lastPlayedByDisplayName} เล่น Nope! {nopeStatusText}
            </span>
          )}
        </div>

        {/* Countdown */}
        <div
          className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-black"
          style={{
            background: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(245,166,35,0.5)",
            color: timeLeft <= 1 ? "#f87171" : "#facc15",
            transition: "color 0.3s",
          }}
        >
          {Math.max(0, Math.ceil(timeLeft))}
        </div>
      </div>

      {/* Progress bar under the toast */}
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ width: "160px", background: "rgba(0,0,0,0.4)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${(Math.max(0, timeLeft) / 3) * 100}%`,
            background: nopeState
              ? "linear-gradient(90deg, #ef4444, #dc2626)"
              : "linear-gradient(90deg, #facc15, #f59e0b)",
            transition: "width 100ms linear",
          }}
        />
      </div>
    </div>
  );
}
