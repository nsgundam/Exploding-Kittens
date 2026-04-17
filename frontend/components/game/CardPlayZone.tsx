"use client";
import React, { useEffect, useRef, useState } from "react";
import { getCardConfig } from "@/types/cards";

export interface CardPlayZoneProps {
  lastPlayedCard: { cardCode: string; playedByDisplayName: string; seq?: number; noAnimate?: boolean } | null;
}

// ── Keyframe injection (module-level, run once) ────────────────────────────
const KEYFRAMES = `
@keyframes cpz-rise {
  0%   { transform: translateY(38px) scale(0.72); opacity: 0; filter: brightness(2.8); }
  35%  { transform: translateY(-10px) scale(1.07); opacity: 1; filter: brightness(1.6); }
  65%  { transform: translateY(4px) scale(0.97); filter: brightness(1); }
  100% { transform: translateY(0) scale(1); opacity: 1; filter: brightness(1); }
}
@keyframes cpz-ring1 {
  0%   { transform: translate(-50%,-50%) scale(0.35); opacity: 0; }
  12%  { opacity: 1; }
  100% { transform: translate(-50%,-50%) scale(2.9); opacity: 0; }
}
@keyframes cpz-ring2 {
  0%   { transform: translate(-50%,-50%) scale(0.35); opacity: 0; }
  22%  { opacity: 0.75; }
  100% { transform: translate(-50%,-50%) scale(4.2); opacity: 0; }
}
@keyframes cpz-ring3 {
  0%   { transform: translate(-50%,-50%) scale(0.35); opacity: 0; }
  35%  { opacity: 0.45; }
  100% { transform: translate(-50%,-50%) scale(5.8); opacity: 0; }
}
@keyframes cpz-name-in {
  0%   { transform: translateY(12px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes cpz-glow-pulse {
  0%,100% { text-shadow: 0 0 6px currentColor; }
  50%      { text-shadow: 0 0 18px currentColor, 0 0 36px currentColor; }
}
@keyframes cpz-shine {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes cpz-idle-float {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-4px); }
}
`;

let _cpzStyleInjected = false;
function injectCPZStyles() {
  if (_cpzStyleInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = KEYFRAMES;
  document.head.appendChild(el);
  _cpzStyleInjected = true;
}

// ── Main Component ─────────────────────────────────────────────────────────
export function CardPlayZone({ lastPlayedCard }: CardPlayZoneProps) {
  // animKey เปลี่ยนทุกครั้งที่มีการ์ดใหม่จริงๆ → force re-mount เพื่อ restart animation
  const [animKey, setAnimKey] = useState(0);
  const prevSeqRef = useRef<number | null>(null);

  useEffect(() => { injectCPZStyles(); }, []);

  useEffect(() => {
    if (!lastPlayedCard) return;
    if (lastPlayedCard.noAnimate) return; // restore หลัง Nope → แสดงแบบ static ไม่ animate

    // ใช้ seq เป็น key ถ้ามี (ทุก setLastPlayedCard จาก useGameState จะมี seq unique)
    // ถ้าไม่มี seq (legacy) → fallback ใช้ sig เดิม
    const currentSeq = lastPlayedCard.seq ?? null;
    if (currentSeq !== null) {
      if (currentSeq === prevSeqRef.current) return;
      prevSeqRef.current = currentSeq;
    }

    setTimeout(() => setAnimKey((k) => k + 1), 0);
  }, [lastPlayedCard]);

  // ── Empty state ──
  if (!lastPlayedCard) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="h-7" />
        <div
          style={{
            width: "112px",
            height: "160px",
            borderRadius: "12px",
            border: "2px dashed rgba(255,220,150,0.22)",
            background: "rgba(0,0,0,0.12)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "22px", opacity: 0.22 }}>🃏</span>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "rgba(255,220,150,0.3)",
              fontFamily: "'Fredoka One', cursive",
            }}
          >
            PLAY
            <br />
            CARD
          </span>
        </div>
        <span
          className="text-xs tracking-widest uppercase font-bold"
          style={{ color: "rgba(255,240,200,0.6)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
        >
          PLAY CARD
        </span>
      </div>
    );
  }

  const cfg = getCardConfig(lastPlayedCard.cardCode);
  const color = cfg.color;
  const emoji = cfg.emoji;
  const label = cfg.label;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-7" />

      {/* ── Holo zone: rings + card ── */}
      <div
        key={animKey}
        style={{
          position: "relative",
          width: "112px",
          height: "160px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Ring 1 — thickest, fastest */}
        <div
          style={{
            position: "absolute",
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            border: `2px solid ${color}`,
            top: "50%",
            left: "50%",
            animation: `cpz-ring1 1.0s cubic-bezier(0.22,1,0.36,1) both`,
            pointerEvents: "none",
          }}
        />
        {/* Ring 2 — medium */}
        <div
          style={{
            position: "absolute",
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            border: `1.5px solid ${color}`,
            top: "50%",
            left: "50%",
            animation: `cpz-ring2 1.2s 0.08s cubic-bezier(0.22,1,0.36,1) both`,
            pointerEvents: "none",
          }}
        />
        {/* Ring 3 — thinnest, slowest */}
        <div
          style={{
            position: "absolute",
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            border: `1px solid ${color}`,
            top: "50%",
            left: "50%",
            animation: `cpz-ring3 1.5s 0.16s cubic-bezier(0.22,1,0.36,1) both`,
            pointerEvents: "none",
          }}
        />

        {/* Card */}
        <div
          style={{
            width: "112px",
            height: "160px",
            borderRadius: "12px",
            border: `2px solid ${color}99`,
            background: `linear-gradient(150deg, ${color}18 0%, rgba(0,0,0,0.85) 100%)`,
            boxShadow: `0 0 28px ${color}44, 0 8px 32px rgba(0,0,0,0.7)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "10px",
            position: "relative",
            overflow: "hidden",
            animation: `cpz-rise 0.72s cubic-bezier(0.22,1,0.36,1) both`,
          }}
        >
          {/* Shine sweep */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "12px",
              background:
                "linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.13) 50%,transparent 65%)",
              backgroundSize: "200% 100%",
              animation: `cpz-shine 0.9s 0.28s ease-out both`,
              pointerEvents: "none",
            }}
          />

          {/* Card code top-left */}
          <span
            style={{
              position: "absolute",
              top: "6px",
              left: "8px",
              fontSize: "8px",
              fontWeight: 800,
              color: `${color}99`,
              fontFamily: "'Fredoka One', cursive",
              letterSpacing: "1px",
            }}
          >
            {lastPlayedCard.cardCode.replace(/^GVE_/, "")}
          </span>

          {/* Emoji */}
          <span
            style={{
              fontSize: "42px",
              lineHeight: 1,
              filter: `drop-shadow(0 0 10px ${color}88)`,
            }}
          >
            {emoji}
          </span>

          {/* Card name */}
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: color,
              textAlign: "center",
              lineHeight: 1.3,
              fontFamily: "'Fredoka One', cursive",
              textShadow: `0 0 8px ${color}88`,
            }}
          >
            {label}
          </span>
        </div>
      </div>

      {/* ── "PLAY CARD" label ── */}
      <span
        className="text-xs tracking-widest uppercase font-bold"
        style={{
          color: "rgba(255,240,200,0.6)",
          textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          animation: `cpz-name-in 0.4s 0.55s ease-out both`,
        }}
      >
        PLAY CARD
      </span>
    </div>
  );
}