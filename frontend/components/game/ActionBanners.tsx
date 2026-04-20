import React from "react";
import { GamePhase } from "@/hooks/useGameState";

export interface ActionBannersProps {
  gamePhase: GamePhase;
  pendingAttacks: number;
  currentTurnSeat: number | null;
  isMySeat: (seat: number) => boolean;
  cancelCombo?: () => void;
  cancelFavor?: () => void;
  cancelTA?: () => void;
}

export function ActionBanners({
  gamePhase,
  pendingAttacks,
  currentTurnSeat,
  isMySeat,
  cancelCombo,
  cancelFavor,
  cancelTA,
}: ActionBannersProps) {
  return (
    <>
      {/* ── ATTACK PENDING INDICATOR ── */}
      {pendingAttacks > 0 && currentTurnSeat !== null && isMySeat(currentTurnSeat) && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-xl animate-bounce pointer-events-none"
          style={{
            bottom: "min(280px, 30vh)",
            background: "linear-gradient(135deg, rgba(239,68,68,0.95), rgba(153,27,27,0.95))",
            border: "2px solid rgba(239,68,68,0.8)",
            boxShadow: "0 0 30px rgba(239,68,68,0.5), 0 8px 20px rgba(0,0,0,0.5)",
            fontFamily: "'Fredoka One', cursive",
          }}
        >
          <span className="text-lg">⚡</span>
          <div>
            <div className="text-white font-black text-[10px] tracking-wider uppercase">
              ⚡ ATTACK! เหลืออีก {pendingAttacks} เทิร์น
            </div>
            <div className="text-red-200 text-xs">
              {"🔴".repeat(Math.min(pendingAttacks, 5))} จั่วต่อได้เลย!
            </div>
          </div>
          <span className="text-lg">⚡</span>
        </div>
      )}

      {/* ── TARGETED ATTACK SELECT TARGET banner ── */}
      {gamePhase === "TA_SELECT_TARGET" && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-xl pointer-events-none"
          style={{
            top: "calc(env(safe-area-inset-top) + 76px)",
            background: "rgba(30,5,5,0.97)",
            border: "2px solid #ef4444",
            boxShadow: "0 0 28px #ef444488",
            fontFamily: "'Fredoka One', cursive",
          }}
        >
          <span className="text-lg">🎯</span>
          <span className="text-white font-black text-[10px]">เลือกผู้เล่นที่จะโจมตี (2 เทิร์น)</span>
          {cancelTA && (
            <button
              onClick={cancelTA}
              className="ml-2 px-3 py-1 rounded-xl text-xs font-black text-white/60 hover:text-white transition-all pointer-events-auto"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              ยกเลิก
            </button>
          )}
        </div>
      )}

      {/* ── COMBO SELECT TARGET banner ── */}
      {gamePhase === "COMBO_SELECT_TARGET" && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-xl pointer-events-none"
          style={{
            top: "calc(env(safe-area-inset-top) + 76px)",
            background: "rgba(10,5,30,0.95)",
            border: "2px solid #facc15",
            boxShadow: "0 0 24px #facc1566",
            fontFamily: "'Fredoka One', cursive",
          }}
        >
          <span className="text-lg">🐱</span>
          <span className="text-white font-black text-[10px]">เลือกผู้เล่นที่จะขโมยการ์ด</span>
          {cancelCombo && (
            <button
              onClick={cancelCombo}
              className="ml-2 px-3 py-1 rounded-xl text-xs font-black text-white/60 hover:text-white transition-all pointer-events-auto"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              ยกเลิก
            </button>
          )}
        </div>
      )}

      {/* ── FAVOR SELECT TARGET banner ── */}
      {gamePhase === "FAVOR_SELECT_TARGET" && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-xl pointer-events-none"
          style={{
            top: "calc(env(safe-area-inset-top) + 76px)",
            background: "rgba(10,5,30,0.95)",
            border: "2px solid #facc15",
            boxShadow: "0 0 24px #facc1566",
            fontFamily: "'Fredoka One', cursive",
          }}
        >
          <span className="text-lg">🐱</span>
          <span className="text-white font-black text-[10px]">เลือกผู้เล่นที่จะขโมยการ์ด</span>
          {cancelFavor && (
            <button
              onClick={cancelFavor}
              className="ml-2 px-3 py-1 rounded-xl text-xs font-black text-white/60 hover:text-white transition-all pointer-events-auto"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              ยกเลิก
            </button>
          )}
        </div>
      )}
    </>
  );
}
