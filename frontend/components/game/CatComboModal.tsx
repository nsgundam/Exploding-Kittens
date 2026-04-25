"use client";

import React, { useState } from "react";
import { Player } from "@/types";
import { getCardConfig, CARD_CONFIG } from "@/types/cards";
import { resolveAvatarSrc } from "@/lib/avatar";


// ── Types ────────────────────────────────────────────────────────
export interface CatComboModalProps {
  isOpen: boolean;
  comboCards: string[];
  players: Player[];
  myPlayerToken: string | null;
  cardVersion?: string;
  expansions?: string[];
  startAtDemandStep?: boolean;    // เริ่มที่ step demand card เลย (สำหรับ 3-card จาก board)
  preselectedTarget?: string;     // player_token ที่เลือกไว้แล้ว
  onConfirm: (targetPlayerToken: string, demandedCard?: string, cardIndex?: number) => void;
  onCancel: () => void;
}

type Step = "select_target" | "demand_card";

const avatarColors: Record<number, string> = {
  1: "#e07b39",
  2: "#c0392b",
  3: "#8e44ad",
  4: "#2980b9",
  5: "#27ae60",
};



export function CatComboModal({
  isOpen,
  comboCards,
  players,
  myPlayerToken,
  cardVersion = "classic",
  expansions = [],
  startAtDemandStep = false,
  preselectedTarget,
  onConfirm,
  onCancel,
}: CatComboModalProps) {
  const [step, setStep] = useState<Step>(startAtDemandStep ? "demand_card" : "select_target");
  const [selectedTarget, setSelectedTarget] = useState<Player | null>(
    preselectedTarget ? (players.find(p => p.player_token === preselectedTarget) ?? null) : null
  );
  const [demandedCard, setDemandedCard] = useState<string>("");
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [filterText, setFilterText] = useState("");

  // shuffledIndices: ลำดับที่แสดงบน UI (สุ่มแล้ว) → map กลับเป็น index จริงในมือ
  // สร้างใหม่ทุกครั้งที่เลือก target เพื่อป้องกัน position inference
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);

  // makeShuffled runs inside effects/handlers only, never during render
  const makeShuffled = (count: number): number[] => {
    const indices = Array.from({ length: count }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j]!, indices[i]!];
    }
    return indices;
  };

  React.useEffect(() => {
    if (isOpen && startAtDemandStep && preselectedTarget) {
      const target = players.find(p => p.player_token === preselectedTarget);
      setShuffledIndices(makeShuffled(target?.hand_count ?? 0));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, preselectedTarget]);

  // กรองการ์ดที่สามารถขโมยได้ตาม deck version และ expansions
  // ห้ามขโมย EK, DF, IK เสมอ
  const hasImploding = expansions.includes("imploding_kittens");
  const DEMANDABLE_CARDS = Object.keys(CARD_CONFIG).filter((code) => {
    // ห้ามขโมย EK และ IK เท่านั้น — DF ขโมยได้ใน 3-card combo
    const norm = code.replace(/^GVE_/, "");
    if (["EK", "IK"].includes(norm)) return false;

    if (cardVersion === "good_and_evil") {
      // GVE deck: แสดงเฉพาะ GVE_ cards และ cat cards
      const isCat = code.startsWith("CAT_") || code === "FC" || code === "MC" || code === "GVE_FC" || code === "GVE_MC";
      return code.startsWith("GVE_") || isCat;
    } else {
      // Classic deck: ไม่แสดง GVE_ cards
      if (code.startsWith("GVE_")) return false;
      // Imploding Kittens expansion cards (IK, RV, DB, TA, FC, AF)
      // แสดงเฉพาะเมื่อ expansion นั้นเปิดอยู่
      // การ์ดทั้งหมดใน Imploding Kittens expansion (รวม FC)
      const implodingOnly = ["IK", "RV", "DB", "TA", "AF", "FC"];
      if (implodingOnly.includes(code)) return hasImploding;
      return true;
    }
  });

  const isThreeCard = comboCards.length >= 3;
  const comboSize = Math.min(comboCards.length, 3);
  const cardCode = comboCards[0] ?? "CAT_TACO";
  const cardConfig = getCardConfig(cardCode);

  const targets = players.filter(
    (p) =>
      p.player_token !== myPlayerToken &&
      p.is_alive !== false &&
      p.seat_number !== null
  );

  const filteredDemandable = DEMANDABLE_CARDS.filter((code) => {
    const cfg = getCardConfig(code);
    return (
      cfg.label.toLowerCase().includes(filterText.toLowerCase()) ||
      code.toLowerCase().includes(filterText.toLowerCase())
    );
  });

  const handleSelectTarget = (player: Player) => {
    setSelectedTarget(player);
    // สุ่มลำดับการ�Aสดงการ์ดหลังทุกครั้งที่เลือก target
    // เพื่อป้องกัน position inference (#1 มักเป็น Defuse)
    setShuffledIndices(makeShuffled(player.hand_count ?? 0));
    setSelectedCardIndex(null);
    setStep("demand_card");
  };

  const handleDemandConfirm = () => {
    if (!selectedTarget) return;
    if (isThreeCard && !demandedCard) return;
    if (!isThreeCard && selectedCardIndex === null) return;
    onConfirm(selectedTarget.player_token, demandedCard, selectedCardIndex ?? undefined);
    resetState();
  };

  const resetState = () => {
    setStep("select_target");
    setSelectedTarget(null);
    setDemandedCard("");
    setSelectedCardIndex(null);
    setFilterText("");
  };

  const handleClose = () => {
    resetState();
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-3000 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-md"
        onClick={handleClose}
      />

      <div
        className="relative z-10 flex flex-col items-center gap-5 p-7 rounded-3xl"
        style={{
          width: "min(500px, calc(100vw - 2rem))",
          maxHeight: "calc(100dvh - 2rem)",
          overflowY: "auto",
          background: "rgba(13,8,32,0.45)",
          backdropFilter: "blur(24px)",
          border: `2px solid ${cardConfig.color}55`,
          boxShadow: `0 0 80px ${cardConfig.color}18, 0 24px 60px rgba(0,0,0,0.5)`,
          fontFamily: "'Fredoka One', cursive",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── COMBO BADGE ── */}
        <div className="flex items-center gap-3 justify-center">
          <div
            className="relative"
            style={{ width: `${comboSize * 28 + 40}px`, height: "64px" }}
          >
            {comboCards.slice(0, comboSize).map((_, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `${i * 28}px`,
                  top: 0,
                  zIndex: i,
                  transform: `rotate(${(i - (comboSize - 1) / 2) * 6}deg)`,
                  fontSize: "36px",
                  filter: `drop-shadow(0 0 8px ${cardConfig.color}88)`,
                }}
              >
                {cardConfig.emoji}
              </div>
            ))}
          </div>

          <div>
            <div
              className="text-xs font-bold tracking-widest uppercase mb-0.5"
              style={{ color: `${cardConfig.color}99` }}
            >
              {comboSize}-CARD COMBO
            </div>
            <div
              className="text-2xl font-black text-white"
              style={{ textShadow: `0 0 20px ${cardConfig.color}88` }}
            >
              {cardConfig.label}
            </div>
            <div className="text-xs mt-0.5" style={{ color: `${cardConfig.color}77` }}>
              {isThreeCard
                ? "ขโมยการ์ดที่ระบุ — ถ้าไม่มี ถือว่าโมฆะ"
                : "สุ่มจิ้มการ์ด 1 ใบจากมือผู้เล่นอื่น"}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          className="w-full h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${cardConfig.color}44, transparent)`,
          }}
        />

        {/* ── STEP 1: SELECT TARGET ── */}
        {step === "select_target" && (
          <>
            <div className="text-center">
              <div className="text-lg font-black text-white">
                {isThreeCard ? "Step 1/2 — " : ""}เลือกเหยื่อ 🎯
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {isThreeCard
                  ? "เลือกผู้เล่น จากนั้นระบุการ์ดที่ต้องการ"
                  : "เลือกผู้เล่น แล้วสุ่มหยิบการ์ดจากมือ 1 ใบ"}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 w-full">
              {targets.map((player) => {
                const color = avatarColors[player.seat_number ?? 1] ?? "#a78bfa";
                const avatarSrc = resolveAvatarSrc(player.avatar_url || player.profile_picture);
                return (
                  <button
                    key={player.player_id}
                    onClick={() => handleSelectTarget(player)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: `${color}18`,
                      border: `2px solid ${color}55`,
                      boxShadow: `0 0 16px ${color}22`,
                      minWidth: "110px",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = `${color}33`;
                      (e.currentTarget as HTMLElement).style.border = `2px solid ${color}`;
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 28px ${color}55`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = `${color}18`;
                      (e.currentTarget as HTMLElement).style.border = `2px solid ${color}55`;
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${color}22`;
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center border-4 text-2xl font-black"
                      style={{ borderColor: color, background: `${color}22`, color }}
                    >
                      {avatarSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarSrc}
                          alt={player.display_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        player.display_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="text-sm font-black text-white text-center leading-tight max-w-22.5 truncate">
                      {player.display_name}
                    </span>
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: `${color}22`,
                        border: `1px solid ${color}55`,
                        color,
                      }}
                    >
                      🃏 {player.hand_count ?? "?"}
                    </div>
                  </button>
                );
              })}
            </div>

            {targets.length === 0 && (
              <div
                className="w-full py-8 rounded-2xl text-center text-sm"
                style={{
                  color: "rgba(255,255,255,0.35)",
                  border: "1px dashed rgba(255,255,255,0.12)",
                }}
              >
                ไม่มีผู้เล่นให้เลือก
              </div>
            )}

            <button
              onClick={handleClose}
              className="w-full py-3 rounded-2xl font-black text-sm tracking-wider uppercase transition-all hover:scale-[1.02] active:scale-95"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.4)",
                fontFamily: "'Fredoka One', cursive",
              }}
            >
              ยกเลิก
            </button>
          </>
        )}

        {/* ── STEP 2: DEMAND CARD (3-card only) ── */}
        {step === "demand_card" && selectedTarget && (
          <>
            <div className="text-center w-full">
              <div
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: `${cardConfig.color}77` }}
              >
                Step 2/2
              </div>
              <div className="text-lg font-black text-white">
                ระบุการ์ดที่ต้องการจาก{" "}
                <span style={{ color: cardConfig.color }}>
                  {selectedTarget.display_name}
                </span>
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {isThreeCard ? "ถ้าผู้เล่นไม่มีการ์ดนั้น Combo จะโมฆะ" : "จิ้มเพื่อสุ่มหยิบไพ่หลังการ์ดของเป้าหมาย"}
              </div>
            </div>

            {/* Content for Step 2 based on Combo Size */}
            {!isThreeCard ? (
              <div className="flex flex-wrap justify-center gap-3 w-full py-4 max-h-[220px] overflow-y-auto">
                {shuffledIndices.map((realIdx, displayPos) => (
                  <button
                    key={displayPos}
                    onClick={() => setSelectedCardIndex(realIdx)}
                    className="relative rounded-xl transition-all flex flex-col items-center justify-center shadow-lg"
                    style={{
                      width: "60px",
                      height: "90px",
                      background: selectedCardIndex === realIdx ? `linear-gradient(135deg, ${cardConfig.color}, ${cardConfig.color}88)` : "linear-gradient(135deg, #1e0a3c, #3b156a)",
                      border: "2px solid " + (selectedCardIndex === realIdx ? "#fff" : "rgba(255,255,255,0.2)"),
                      transform: selectedCardIndex === realIdx ? "scale(1.1) translateY(-4px)" : "scale(1)",
                      boxShadow: selectedCardIndex === realIdx ? `0 10px 20px ${cardConfig.color}66` : "0 4px 10px rgba(0,0,0,0.5)",
                    }}
                  >
                    <div
                      className="absolute inset-1 rounded-lg opacity-20"
                      style={{
                        backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 4px)",
                        backgroundSize: "6px 6px",
                      }}
                    />
                    <span className="text-xl opacity-60">🐱</span>
                    <span className="text-[10px] mt-1 font-black" style={{ color: "rgba(255,255,255,0.5)" }}>#{displayPos + 1}</span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                {/* Search */}
            <div className="w-full relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                🔍
              </span>
              <input
                type="text"
                placeholder="ค้นหาชื่อการ์ด..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full rounded-xl py-2.5 pl-9 pr-4 text-sm text-white outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  fontFamily: "'Fredoka One', cursive",
                }}
              />
            </div>

            {/* Card grid */}
            <div
              className="w-full grid gap-2 overflow-y-auto"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                maxHeight: "200px",
              }}
            >
              {filteredDemandable.map((code) => {
                const cfg = getCardConfig(code);
                const isSelected = demandedCard === code;
                return (
                  <button
                    key={code}
                    onClick={() => setDemandedCard(isSelected ? "" : code)}
                    className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: isSelected
                        ? `${cfg.color}33`
                        : "rgba(255,255,255,0.05)",
                      border: isSelected
                        ? `2px solid ${cfg.color}`
                        : "2px solid rgba(255,255,255,0.1)",
                      boxShadow: isSelected ? `0 0 20px ${cfg.color}55` : "none",
                    }}
                  >
                    <span className="text-2xl">{cfg.emoji}</span>
                    <span
                      className="text-[9px] font-black uppercase leading-tight text-center"
                      style={{
                        color: isSelected ? cfg.color : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {cfg.label}
                    </span>
                    {isSelected && (
                      <span
                        className="text-[8px] font-bold rounded-full px-1.5 py-0.5"
                        style={{ background: cfg.color, color: "#000" }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected preview */}
            {demandedCard && (
              <div
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{
                  background: `${getCardConfig(demandedCard).color}15`,
                  border: `1px solid ${getCardConfig(demandedCard).color}44`,
                }}
              >
                <span className="text-2xl">{getCardConfig(demandedCard).emoji}</span>
                <div>
                  <div
                    className="text-xs uppercase tracking-wider"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    การ์ดที่เลือก
                  </div>
                  <div
                    className="text-sm font-black"
                    style={{ color: getCardConfig(demandedCard).color }}
                  >
                    {getCardConfig(demandedCard).label}
                  </div>
                </div>
              </div>
            )}
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setStep("select_target");
                  setDemandedCard("");
                  setSelectedCardIndex(null);
                  setFilterText("");
                }}
                className="flex-1 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.45)",
                  fontFamily: "'Fredoka One', cursive",
                }}
              >
                ← กลับ
              </button>
              <button
                onClick={handleDemandConfirm}
                disabled={isThreeCard ? !demandedCard : selectedCardIndex === null}
                className="flex-1 py-3 px-6 rounded-2xl font-black text-sm uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: (isThreeCard ? demandedCard : selectedCardIndex !== null)
                    ? `linear-gradient(135deg, ${cardConfig.color}, ${cardConfig.color}bb)`
                    : "rgba(255,255,255,0.05)",
                  border: `2px solid ${(isThreeCard ? demandedCard : selectedCardIndex !== null) ? cardConfig.color : "transparent"}`,
                  color: (isThreeCard ? demandedCard : selectedCardIndex !== null) ? "#000" : "rgba(255,255,255,0.3)",
                  boxShadow: (isThreeCard ? demandedCard : selectedCardIndex !== null)
                    ? `0 4px 20px ${cardConfig.color}55`
                    : "none",
                  fontFamily: "'Fredoka One', cursive",
                }}
              >
                ยืนยัน Combo! 🐱
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}