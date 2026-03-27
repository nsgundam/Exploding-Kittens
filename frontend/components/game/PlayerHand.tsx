"use client";

import React, { useState } from "react";
import { Card } from "@/components/game/Card";
import { Player } from "@/types";

export interface PlayerHandProps {
  myCards: string[];
  status: string;
  isMyTurn: boolean;
  players: Player[];
  myPlayerToken: string | null;
  cardVersion?: string;
  expansions?: string[];
  onPlayCard: (cardCode: string, targetPlayerToken?: string, demandedCard?: string) => void;
  onPlayCombo: (cardCodes: string[]) => void;
  /** True when Nope Window is active (3-second countdown) */
  nopeWindowActive?: boolean;
  /** Called when the player clicks a glowing Nope card */
  onPlayNope?: () => void;
}

function isNopeCard(code: string): boolean {
  return code === "NP" || code === "GVE_NP";
}

// ── Cat card detection ───────────────────────────────────────
const CAT_TYPES = new Set([
  "CAT_TACO", "CAT_MELON", "CAT_BEARD", "CAT_RAINBOW", "CAT_POTATO",
  "FC", "GVE_FC", "MC", "GVE_MC",
]);

function isCatCard(code: string): boolean {
  return CAT_TYPES.has(code);
}


/** Two cat cards can form a combo if they are the same type, or one/both are feral */
function canPairWith(a: string, b: string): boolean {
  if (!isCatCard(a) || !isCatCard(b)) return false;
  const aFeral = a === "FC" || a === "GVE_FC";
  const bFeral = b === "FC" || b === "GVE_FC";
  if (aFeral || bFeral) return true;
  return a === b;
}

export function PlayerHand({
  myCards,
  status,
  isMyTurn,
  onPlayCard,
  onPlayCombo,
  nopeWindowActive = false,
  onPlayNope,
}: PlayerHandProps) {
  // selectedIndices: indices of cat cards selected for combo
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const mid = Math.floor(myCards.length / 2);

  // ── Derive combo state ────────────────────────────────────
  const selectedCards = selectedIndices.map((i) => myCards[i]);
  const comboCount = selectedIndices.length; // 0, 1, 2, or 3

  const canAddToCombo = (idx: number): boolean => {
    const code = myCards[idx];
    if (!isCatCard(code)) return false;
    if (selectedIndices.includes(idx)) return true; // already selected
    if (selectedIndices.length === 0) return true;
    if (selectedIndices.length >= 3) return false;

    // Must be compatible with the first selected card
    const firstCode = myCards[selectedIndices[0]];
    return canPairWith(firstCode, code);
  };

  const handleCardClick = (idx: number) => {
    const code = myCards[idx];

    // During Nope Window: only allow clicking Nope cards
    if (nopeWindowActive) {
      if (isNopeCard(code) && onPlayNope) {
        onPlayNope();
      }
      return;
    }

    // Non-cat cards: play immediately (existing behavior)
    if (!isCatCard(code)) {
      if (selectedIndices.length > 0) {
        setSelectedIndices([]);
      }
      onPlayCard(code);
      return;
    }

    // Cat card clicked
    if (selectedIndices.includes(idx)) {
      setSelectedIndices((prev) => prev.filter((i) => i !== idx));
      return;
    }

    if (!canAddToCombo(idx)) {
      // Incompatible cat — reset selection to this card
      setSelectedIndices([idx]);
      return;
    }

    const newSelection = [...selectedIndices, idx];
    setSelectedIndices(newSelection);
  };

  const handlePlayCombo = () => {
    if (selectedIndices.length < 2) return;
    const cards = selectedIndices.map((i) => myCards[i] as string);
    setSelectedIndices([]);
    onPlayCombo(cards);
  };



  // ── Render ────────────────────────────────────────────────
  if (status !== "PLAYING" && status !== "playing") return null;

  return (
    <>
      <div className="flex flex-col items-center gap-2 flex-1 justify-end z-50 pb-2">

        {/* ── COMBO BAR ── shows when 1+ cat selected */}
        {isMyTurn && selectedIndices.length >= 1 && (
          <div
            className="flex items-center gap-3 px-5 py-2.5 rounded-2xl mb-1"
            style={{
              background: "rgba(0,0,0,0.75)",
              border: "2px solid rgba(250,204,21,0.5)",
              boxShadow: "0 0 24px rgba(250,204,21,0.2)",
              backdropFilter: "blur(12px)",
              fontFamily: "'Fredoka One', cursive",
              transition: "all 0.2s",
            }}
          >
            {/* Stacked emoji preview */}
            <div className="flex items-center">
              {selectedCards.map((c, i) => (
                <span
                  key={i}
                  className="text-2xl"
                  style={{
                    marginLeft: i > 0 ? "-6px" : 0,
                    filter: "drop-shadow(0 0 6px rgba(250,204,21,0.7))",
                  }}
                >
                  🐱
                </span>
              ))}
            </div>

            {/* Badge */}
            <div
              className="text-xs font-black uppercase tracking-wider"
              style={{ color: "rgba(250,204,21,0.9)" }}
            >
              {comboCount === 1 && "เลือก 1 ใบ — ต้องการอีก 1 หรือ 2 ใบ"}
              {comboCount === 2 && "✓ Combo 2 ใบ พร้อมแล้ว!"}
              {comboCount === 3 && "✓ Combo 3 ใบ พร้อมแล้ว!"}
            </div>

            {/* Play button */}
            {comboCount >= 2 && (
              <button
                onClick={handlePlayCombo}
                className="px-4 py-1.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #facc15, #f59e0b)",
                  color: "#000",
                  boxShadow: "0 3px 12px rgba(250,204,21,0.5)",
                  fontFamily: "'Fredoka One', cursive",
                }}
              >
                เล่น Combo!
              </button>
            )}

            {/* Cancel selection */}
            <button
              onClick={() => setSelectedIndices([])}
              className="text-xs px-2 py-1 rounded-lg transition-all hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Fredoka One', cursive" }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── CARD FAN ── */}
        <style>{`
          @keyframes nopeCardGlow {
            0%, 100% { box-shadow: 0 0 14px rgba(239,68,68,0.7), 0 0 40px rgba(239,68,68,0.3); }
            50%      { box-shadow: 0 0 24px rgba(239,68,68,1),   0 0 60px rgba(239,68,68,0.5); }
          }
        `}</style>
        <div className="flex items-end justify-center">
          {myCards.map((cardCode, i) => {
            const isCat = isCatCard(cardCode);
            const isNope = isNopeCard(cardCode);
            const isSelected = selectedIndices.includes(i);
            const isComboMode = selectedIndices.length > 0;

            // During Nope Window: only Nope cards are active
            const isNopeActive = nopeWindowActive && isNope;

            // Determine if card is interactable
            const isActive = nopeWindowActive
              ? isNopeActive
              : isMyTurn &&
                cardCode !== "DF" &&
                cardCode !== "EK" &&
                cardCode !== "GVE_EK";

            // In combo mode: non-compatible cards are dimmed
            const isCompatible = !isComboMode || canAddToCombo(i);
            const isDimmed = nopeWindowActive
              ? !isNope  // dim everything except Nope during window
              : isActive && isComboMode && !isCompatible && !isSelected;

            return (
              <div
                key={`${i}-${cardCode}`}
                className="relative"
                style={{
                  transform: isSelected
                    ? "rotate(0deg) translateY(-32px) scale(1.08)"
                    : isNopeActive
                      ? "rotate(0deg) translateY(-20px) scale(1.1)"
                      : `rotate(${(i - mid) * 5}deg) translateY(${Math.abs(i - mid) * 4}px)`,
                  marginLeft: i === 0 ? 0 : "-16px",
                  zIndex: isSelected ? 30 : isNopeActive ? 25 : i === mid ? 5 : i,
                  transition: "transform 0.25s ease, opacity 0.25s, filter 0.25s",
                  opacity: isDimmed ? 0.3 : 1,
                  filter: isDimmed ? "grayscale(0.7) brightness(0.6)" : "none",
                  cursor: isNopeActive ? "pointer" : undefined,
                }}
                onMouseEnter={(e) => {
                  if (isNopeActive) {
                    (e.currentTarget as HTMLElement).style.transform =
                      "rotate(0deg) translateY(-32px) scale(1.15)";
                    (e.currentTarget as HTMLElement).style.zIndex = "30";
                  } else if (isActive && !isSelected && !nopeWindowActive) {
                    (e.currentTarget as HTMLElement).style.transform =
                      "rotate(0deg) translateY(-24px) scale(1.08)";
                    (e.currentTarget as HTMLElement).style.zIndex = "20";
                  }
                }}
                onMouseLeave={(e) => {
                  if (isNopeActive) {
                    (e.currentTarget as HTMLElement).style.transform =
                      "rotate(0deg) translateY(-20px) scale(1.1)";
                    (e.currentTarget as HTMLElement).style.zIndex = "25";
                  } else if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.transform = `rotate(${(i - mid) * 5}deg) translateY(${Math.abs(i - mid) * 4}px)`;
                    (e.currentTarget as HTMLElement).style.zIndex = String(i === mid ? 5 : i);
                  }
                }}
              >
                {/* Nope card glow ring */}
                {isNopeActive && (
                  <div
                    className="absolute -inset-1 rounded-xl pointer-events-none"
                    style={{
                      zIndex: 1,
                      animation: "nopeCardGlow 1.2s ease-in-out infinite",
                      borderRadius: "14px",
                    }}
                  />
                )}

                {/* Cat card selection ring */}
                {isSelected && (
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      zIndex: 2,
                      border: "3px solid #facc15",
                      boxShadow: "0 0 20px rgba(250,204,21,0.8), inset 0 0 10px rgba(250,204,21,0.2)",
                      borderRadius: "12px",
                    }}
                  />
                )}

                <Card
                  cardCode={cardCode}
                  selected={isSelected}
                  disabled={!isActive}
                  onClick={() => isActive && handleCardClick(i)}
                />

                {/* NOPE badge during window */}
                {isNopeActive && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full pointer-events-none animate-bounce"
                    style={{
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      color: "#fff",
                      whiteSpace: "nowrap",
                      zIndex: 10,
                      boxShadow: "0 2px 8px rgba(239,68,68,0.6)",
                    }}
                  >
                    🚫 NOPE!
                  </div>
                )}

                {/* Cat indicator badge */}
                {isCat && isMyTurn && !isComboMode && !nopeWindowActive && (
                  <div
                    className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full pointer-events-none"
                    style={{
                      background: "rgba(250,204,21,0.9)",
                      color: "#000",
                      whiteSpace: "nowrap",
                      zIndex: 10,
                    }}
                  >
                    COMBO
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
</>
  );
}