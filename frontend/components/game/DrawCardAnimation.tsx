"use client";

import React, { useEffect, useState, useRef } from "react";
import { getCardConfig } from "@/types/cards";

// ── Types ──────────────────────────────────────────────────────
export interface DrawAnimState {
  drawerName: string;       // ชื่อคนจั่ว
  drawnCard: string | null; // null = ซ่อนหน้าการ์ด (phase 1)
  isMe: boolean;            // true = ไพ่ลอยเข้ามือฉัน
  avatarSeat?: number | null;
}

interface DrawCardAnimationProps {
  state: DrawAnimState | null;
  onComplete: () => void;
}

// ── Timing ────────────────────────────────────────────────────
// Phase 1 : 0 – 1300 ms  → popup + card spinning (back)
// Phase 2 : 1300 – 2400 ms → flip + reveal card face
// Phase 3 : 2400 – 3200 ms → card flies to hand/avatar
const PHASE2_MS = 1300;
const PHASE3_MS = 2400;
const TOTAL_MS  = 3200;

// ── Card back ─────────────────────────────────────────────────
function CardBack() {
  return (
    <div
      style={{
        width: "96px",
        height: "134px",
        borderRadius: "16px",
        background: "linear-gradient(145deg, #6b2f0e 0%, #3d1505 55%, #1a0800 100%)",
        border: "3px solid #f5a623",
        boxShadow:
          "0 0 30px rgba(245,166,35,0.55), inset 0 1px 0 rgba(255,220,100,0.2), 6px 10px 28px rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "6px",
          borderRadius: "10px",
          opacity: 0.18,
          backgroundImage:
            "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)",
          backgroundSize: "6px 6px",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "6px",
          borderRadius: "10px",
          border: "1px solid rgba(245,166,35,0.3)",
          pointerEvents: "none",
        }}
      />
      <span style={{ fontSize: "3rem", position: "relative", zIndex: 1, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.8))" }}>
        💣
      </span>
    </div>
  );
}

// ── Card face ─────────────────────────────────────────────────
function CardFace({ cardCode }: { cardCode: string }) {
  const cfg = getCardConfig(cardCode);
  return (
    <div
      style={{
        width: "96px",
        height: "134px",
        borderRadius: "16px",
        background: `linear-gradient(145deg, ${cfg.color}28 0%, #ffffff 100%)`,
        border: `3px solid ${cfg.color}`,
        boxShadow: `0 0 40px ${cfg.color}77, inset 0 1px 0 rgba(255,255,255,0.6), 6px 10px 28px rgba(0,0,0,0.5)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "5px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "5px",
          left: "7px",
          fontSize: "9px",
          fontWeight: "900",
          color: cfg.color,
          fontFamily: "'Fredoka One', cursive",
          opacity: 0.7,
        }}
      >
        {cardCode.replace(/^GVE_/, "")}
      </div>
      <div style={{ fontSize: "2.8rem", filter: `drop-shadow(0 0 12px ${cfg.color}aa)`, lineHeight: 1 }}>
        {cfg.emoji}
      </div>
      <div
        style={{
          fontSize: "9px",
          fontWeight: "900",
          textTransform: "uppercase",
          color: cfg.color,
          fontFamily: "'Fredoka One', cursive",
          letterSpacing: "0.04em",
          textAlign: "center",
          padding: "0 5px",
          lineHeight: 1.2,
        }}
      >
        {cfg.label}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          insetInline: 0,
          height: "35%",
          borderRadius: "0 0 13px 13px",
          background: `linear-gradient(to top, ${cfg.color}18, transparent)`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ── Particles ─────────────────────────────────────────────────
function Particles({ color }: { color: string }) {
  const items = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * 360;
    const dist = 60 + Math.random() * 45;
    const px = `${Math.cos((angle * Math.PI) / 180) * dist}px`;
    const py = `${Math.sin((angle * Math.PI) / 180) * dist}px`;
    const size = 3 + Math.random() * 6;
    const delay = Math.random() * 0.18;
    const isRing = i % 3 === 0;
    return { px, py, size, delay, isRing };
  });

  return (
    <>
      {items.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: `${p.size}px`,
            height: `${p.size}px`,
            marginTop: `-${p.size / 2}px`,
            marginLeft: `-${p.size / 2}px`,
            borderRadius: p.isRing ? "50%" : "2px",
            background: p.isRing ? "transparent" : color,
            border: p.isRing ? `2px solid ${color}` : "none",
            boxShadow: `0 0 8px ${color}`,
            "--px": p.px,
            "--py": p.py,
            animation: `particleFloat 0.75s cubic-bezier(0,0,0.2,1) ${p.delay}s forwards`,
            pointerEvents: "none",
            zIndex: 10,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

// ── Ring pulse ────────────────────────────────────────────────
function RingPulse({ color, active }: { color: string; active: boolean }) {
  if (!active) return null;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: `-${20 + i * 22}px`,
            borderRadius: "50%",
            border: `2px solid ${color}`,
            opacity: 0,
            animation: `ringExpand 1.2s ease-out ${i * 0.28}s infinite`,
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

// ── Spin dots ─────────────────────────────────────────────────
function SpinDots() {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "rgba(245,166,35,0.7)",
            animation: `dotBounce 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────
function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <div style={{ width: "100%", height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          borderRadius: "2px",
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          transition: "width 0.1s linear",
        }}
      />
    </div>
  );
}

// ── Corner decoration ─────────────────────────────────────────
function CornerDeco({ color }: { color: string }) {
  const corners = [
    { top: "14px", left: "18px", borderTop: true, borderLeft: true, borderRadius: "3px 0 0 0" },
    { top: "14px", right: "18px", borderTop: true, borderRight: true, borderRadius: "0 3px 0 0" },
    { bottom: "14px", left: "18px", borderBottom: true, borderLeft: true, borderRadius: "0 0 0 3px" },
    { bottom: "14px", right: "18px", borderBottom: true, borderRight: true, borderRadius: "0 0 3px 0" },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: "20px",
            height: "20px",
            top: c.top,
            left: c.left,
            right: c.right,
            bottom: c.bottom,
            borderTop: c.borderTop ? `2px solid ${color}44` : undefined,
            borderLeft: c.borderLeft ? `2px solid ${color}44` : undefined,
            borderRight: c.borderRight ? `2px solid ${color}44` : undefined,
            borderBottom: c.borderBottom ? `2px solid ${color}44` : undefined,
            borderRadius: c.borderRadius,
          }}
        />
      ))}
    </>
  );
}

// ── Main Component ────────────────────────────────────────────
export function DrawCardAnimation({ state, onComplete }: DrawCardAnimationProps) {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [progress, setProgress] = useState(0);
  const [flyStyle, setFlyStyle] = useState<React.CSSProperties>({});
  const [fadeOut, setFadeOut] = useState(false);
  const [showRevealFlash, setShowRevealFlash] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // progress ticker
  const startTimeRef = useRef<number>(0);
  useEffect(() => {
    if (!state) return;
    startTimeRef.current = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setProgress(Math.min((elapsed / TOTAL_MS) * 100, 100));
    }, 50);
    return () => clearInterval(tick);
  }, [state]);

  useEffect(() => {
    if (!state) return;

    setPhase(1);
    setFlyStyle({});
    setFadeOut(false);
    setShowRevealFlash(false);
    setProgress(0);

    const t1 = setTimeout(() => {
      setPhase(2);
      setShowRevealFlash(true);
      setTimeout(() => setShowRevealFlash(false), 350);
    }, PHASE2_MS);

    const t2 = setTimeout(() => {
      setPhase(3);
      const isBomb = state.drawnCard === "EK" || state.drawnCard === "IK";
      if (isBomb) {
        // EK/IK: ไม่ลอยลงมือ — ค้างกลางจอแล้ว scale up เล็กน้อยก่อน fade ออก
        // เพื่อ transition ไปยัง bomb popup ได้ smooth
        setFlyStyle({
          transform: "scale(1.08)",
          opacity: 0,
          transition: "transform 0.5s ease-out, opacity 0.55s ease",
        });
      } else if (state.isMe) {
        // fly down to footer (my hand)
        setFlyStyle({
          transform: "translate(-50%, 300px) scale(0.45)",
          opacity: 0,
          transition: "transform 0.72s cubic-bezier(0.4,0,0.2,1), opacity 0.65s ease",
        });
      } else {
        const seat = state.avatarSeat ?? 0;
        const xMap: Record<number, number> = { 1: -230, 2: -230, 3: 230, 4: 230, 5: 0 };
        const yMap: Record<number, number> = { 1: -170, 2: 120, 3: 120, 4: -170, 5: -200 };
        const xOff = xMap[seat] ?? (Math.random() > 0.5 ? 200 : -200);
        const yOff = yMap[seat] ?? -140;
        setFlyStyle({
          transform: `translate(calc(-50% + ${xOff}px), ${yOff}px) scale(0.28)`,
          opacity: 0,
          transition: "transform 0.75s cubic-bezier(0.4,0,0.2,1), opacity 0.6s ease",
        });
      }
    }, PHASE3_MS);

    const t3 = setTimeout(() => {
      setFadeOut(true);
      onCompleteRef.current();
    }, TOTAL_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [state]);

  if (!state) return null;

  const cardCode = state.drawnCard ?? "AT";
  const cfg = getCardConfig(cardCode);
  const accentColor = phase >= 2 && state.drawnCard ? cfg.color : "#f5a623";

  return (
    <>
      <style>{`
        @keyframes spinCard3D {
          0%   { transform: rotateY(0deg) scale(1.05); }
          50%  { transform: rotateY(180deg) scale(0.88); }
          100% { transform: rotateY(360deg) scale(1.05); }
        }
        @keyframes popupIn {
          0%   { opacity: 0; transform: translateY(50px) scale(0.65); }
          65%  { opacity: 1; transform: translateY(-10px) scale(1.06); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmerSweep {
          0%   { background-position: -200% center; opacity: 1; }
          100% { background-position: 200% center; opacity: 0; }
        }
        @keyframes cardReveal {
          0%   { transform: rotateY(90deg) scale(0.7); opacity: 0; }
          60%  { transform: rotateY(-8deg) scale(1.07); opacity: 1; }
          100% { transform: rotateY(0deg) scale(1); opacity: 1; }
        }
        @keyframes cardEntrance {
          0%   { transform: translateY(-80px) rotate(-15deg) scale(0.4); opacity: 0; }
          65%  { transform: translateY(10px) rotate(3deg) scale(1.08); opacity: 1; }
          100% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
        }
        @keyframes particleFloat {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.9; }
          100% { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; }
        }
        @keyframes ringExpand {
          0%   { transform: scale(0.6); opacity: 0.7; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes dotBounce {
          from { transform: translateY(0); opacity: 0.4; }
          to   { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes flashWhite {
          0%   { opacity: 0.9; }
          100% { opacity: 0; }
        }
        @keyframes nameSlideIn {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes labelPop {
          0%   { opacity: 0; transform: scale(0.7) translateY(6px); }
          70%  { transform: scale(1.08) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 4500,
          background: "rgba(2, 1, 10, 0.82)",
          backdropFilter: "blur(8px)",
          animation: "overlayIn 0.3s ease",
          opacity: fadeOut ? 0 : 1,
          transition: fadeOut ? "opacity 0.4s ease" : undefined,
          pointerEvents: "none",
        }}
      />

      {/* White flash on reveal */}
      {showRevealFlash && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 4501,
            background: "rgba(255,255,255,0.08)",
            animation: "flashWhite 0.35s ease forwards",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Center container */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 4502,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "18px",
            padding: "32px 48px 28px",
            borderRadius: "28px",
            background: "linear-gradient(160deg, rgba(14,6,36,0.98) 0%, rgba(6,2,18,0.98) 100%)",
            border: `2px solid ${accentColor}66`,
            boxShadow: `0 0 80px ${accentColor}22, 0 0 140px ${accentColor}0a, 0 28px 70px rgba(0,0,0,0.95)`,
            animation: "popupIn 0.52s cubic-bezier(0.34,1.56,0.64,1)",
            transition: "border-color 0.45s ease, box-shadow 0.45s ease, opacity 0.4s ease",
            fontFamily: "'Fredoka One', cursive",
            minWidth: "280px",
            opacity: fadeOut ? 0 : 1,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <CornerDeco color={accentColor} />

          {/* Who drew */}
          <div style={{ textAlign: "center", animation: "nameSlideIn 0.4s ease" }}>
            <div
              style={{
                fontSize: "11px",
                color: "rgba(255,240,200,0.45)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: "3px",
              }}
            >
              {state.isMe ? "คุณจั่วไพ่" : `${state.drawerName} จั่วไพ่`}
            </div>
            {phase >= 2 && state.drawnCard && (
              <div
                style={{
                  fontSize: "21px",
                  fontWeight: "900",
                  color: cfg.color,
                  textShadow: `0 0 24px ${cfg.color}99`,
                  animation: "labelPop 0.42s cubic-bezier(0.34,1.56,0.64,1)",
                  letterSpacing: "0.04em",
                  lineHeight: 1.1,
                }}
              >
                {cfg.label}!
              </div>
            )}
          </div>

          {/* Card area */}
          <div
            style={{
              position: "relative",
              width: "96px",
              height: "134px",
              ...flyStyle,
              transformOrigin: "center bottom",
            }}
          >
            <RingPulse color={accentColor} active={phase >= 2} />

            {phase >= 2 && state.drawnCard && <Particles color={cfg.color} />}

            {/* Phase 1 — spinning back */}
            {phase === 1 && (
              <div style={{ animation: "cardEntrance 0.5s cubic-bezier(0.34,1.56,0.64,1), spinCard3D 0.65s ease-in-out 0.5s infinite" }}>
                <CardBack />
              </div>
            )}

            {/* Phase 2+ — face reveal */}
            {phase >= 2 && state.drawnCard && (
              <div style={{ animation: "cardReveal 0.48s cubic-bezier(0.34,1.56,0.64,1)", position: "relative", width: "96px", height: "134px" }}>
                <CardFace cardCode={state.drawnCard} />
                {/* shimmer sweep */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "14px",
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmerSweep 0.75s ease forwards",
                    pointerEvents: "none",
                  }}
                />
              </div>
            )}
          </div>

          {/* Status text */}
          <div style={{ textAlign: "center", minHeight: "22px" }}>
            {phase === 1 && <SpinDots />}
            {phase === 2 && state.drawnCard && (() => {
              const isBomb = state.drawnCard === "EK" || state.drawnCard === "IK";
              const bombMsg = state.drawnCard === "IK" ? "💀 Imploding Kitten!" : "💣 Exploding Kitten!";
              return (
                <div style={{ fontSize: "12px", color: `${cfg.color}cc`, animation: "nameSlideIn 0.35s ease", letterSpacing: "0.05em" }}>
                  {isBomb ? bombMsg : (state.isMe ? "✨ ไพ่เข้ามือคุณแล้ว!" : `✨ ${state.drawerName} ได้รับไพ่!`)}
                </div>
              );
            })()}
            {phase === 3 && (() => {
              const isBomb = state.drawnCard === "EK" || state.drawnCard === "IK";
              return (
                <div style={{ fontSize: "11px", color: "rgba(255,240,200,0.3)", letterSpacing: "0.05em" }}>
                  {isBomb ? "⚠️ กำลังโหลด..." : (state.isMe ? "📥 ไพ่ลอยเข้ามือ..." : "🃏 ไพ่ลอยไปหาผู้เล่น...")}
                </div>
              );
            })()}
          </div>

          {/* Progress bar */}
          <div style={{ width: "100%", paddingTop: "4px" }}>
            <ProgressBar progress={progress} color={accentColor} />
          </div>
        </div>
      </div>
    </>
  );
}