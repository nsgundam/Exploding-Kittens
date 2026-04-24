import React, { useEffect, useRef, useState } from "react";
import { Card } from "./Card";
import { IKImplosionVoid } from "./IKImplosionVoid";
import { EKHellfirePillar } from "./EKHellfirePillar";

interface EKBombSequenceProps {
  drawnCard: string;
  hasDefuse: boolean;
  onDefuse: () => void;
  onExplode: () => void;
  active: boolean;
  isMyBomb: boolean;
  isIKFaceUp?: boolean;
  afterHellfireRef?: React.MutableRefObject<(() => void) | null>;
}

export function EKBombSequence({
  drawnCard,
  hasDefuse,
  onDefuse,
  onExplode,
  active,
  isMyBomb,
  isIKFaceUp = false,
  afterHellfireRef,
}: EKBombSequenceProps) {
  const [timeLeft, setTimeLeft] = useState(10);
  const [showImplosion, setShowImplosion] = useState(false);
  const [showHellfirePillar, setShowHellfirePillar] = useState(false);

  // ── ref เก็บ callbacks เพื่อไม่ให้ useEffect re-run เมื่อ parent re-render ──
  const onExplodeRef = useRef(onExplode);
  const isIKFaceUpRef = useRef(isIKFaceUp);
  // ── ref ป้องกัน double-fire (timer หมด + กดปุ่มพร้อมกัน) ──
  const firedRef = useRef(false);

  // อัพเดท ref ทุกครั้งที่ prop เปลี่ยน โดยไม่ trigger useEffect
  useEffect(() => { onExplodeRef.current = onExplode; }, [onExplode]);
  useEffect(() => { isIKFaceUpRef.current = isIKFaceUp; }, [isIKFaceUp]);

  // reset firedRef และ state เมื่อ bomb phase เริ่มใหม่
  useEffect(() => {
    if (active && isMyBomb) {
      firedRef.current = false;
      setTimeLeft(10);
      setShowImplosion(false);
      setShowHellfirePillar(false);
    }
  }, [active, isMyBomb]);

  useEffect(() => {
    // dependency array มีแค่ active, isMyBomb — ไม่ใส่ onExplode/isIKFaceUp
    // เพราะใช้ ref แทน ป้องกัน timer reset เมื่อ parent re-render
    if (!active || !isMyBomb) return;

    const fuseInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(fuseInterval);
          // side effect ต้องทำนอก setState updater ใช้ setTimeout(0)
          setTimeout(() => {
            if (firedRef.current) return; // ป้องกัน double-fire
            firedRef.current = true;
            onExplodeRef.current(); // emit eliminatePlayer
            if (isIKFaceUpRef.current) {
              setShowImplosion(true);
            } else {
              setShowHellfirePillar(true);
            }
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(fuseInterval);
    };
  }, [active, isMyBomb]);

  // bombAnimations lives outside guard so it survives active=false after socket fires
  const bombAnimations = (
    <>
      <IKImplosionVoid
        active={showImplosion}
        onDone={() => {
          setShowImplosion(false);
          if (afterHellfireRef?.current) {
            afterHellfireRef.current();
            afterHellfireRef.current = null;
          } else {
            // server response ยังไม่มา — poll รอสั้นๆ (network ช้า)
            const poll = setInterval(() => {
              if (afterHellfireRef?.current) {
                clearInterval(poll);
                afterHellfireRef.current();
                afterHellfireRef.current = null;
              }
            }, 100);
            setTimeout(() => clearInterval(poll), 5000);
          }
        }}
      />
      <EKHellfirePillar
        active={showHellfirePillar}
        onDone={() => {
          setShowHellfirePillar(false);
          if (afterHellfireRef?.current) {
            afterHellfireRef.current();
            afterHellfireRef.current = null;
          } else {
            // server response ยังไม่มา — poll รอสั้นๆ (network ช้า)
            const poll = setInterval(() => {
              if (afterHellfireRef?.current) {
                clearInterval(poll);
                afterHellfireRef.current();
                afterHellfireRef.current = null;
              }
            }, 100);
            setTimeout(() => clearInterval(poll), 5000);
          }
        }}
      />
    </>
  );

  if (!active || !isMyBomb) return bombAnimations;

  // IK: emit eliminatePlayer ก่อน แล้วเล่น implosion animation
  const handleIKExplode = () => {
    if (firedRef.current || showImplosion) return;
    firedRef.current = true;
    onExplode();
    setShowImplosion(true);
  };

  // EK: emit eliminatePlayer ทันที แล้วเล่น hellfire animation พร้อมกัน
  const handleEKExplode = () => {
    if (firedRef.current || showHellfirePillar) return;
    firedRef.current = true;
    onExplode();
    setShowHellfirePillar(true);
  };

  // ── IK face-up UI (สีม่วง) ──────────────────────────────────
  if (isIKFaceUp) {
    return (
      <>
        {bombAnimations}
        <div
          className="fixed inset-0 flex flex-col items-center justify-center z-[3000] animate-fade-in backdrop-blur-md"
          style={{ background: "rgba(20,0,35,0.93)", display: showImplosion ? "none" : undefined }}
        >
        {/* BG glow */}
        <div
          className="absolute inset-0 pointer-events-none animate-pulse"
          style={{
            background: "radial-gradient(circle at center, rgba(139,92,246,0.25) 0%, transparent 70%)",
          }}
        />

        <div
          className="relative z-10 flex flex-col items-center gap-5 p-7 rounded-3xl"
          style={{
            width: "min(460px, calc(100vw - 2rem))",
            maxHeight: "calc(100dvh - 2rem)",
            overflowY: "auto",
            background: "linear-gradient(160deg, #1a0530 0%, #0a001a 60%, #0d0005 100%)",
            border: "2px solid rgba(139,92,246,0.7)",
            boxShadow: "0 0 80px rgba(139,92,246,0.3), 0 24px 60px rgba(0,0,0,0.95)",
            fontFamily: "'Fredoka One', cursive",
          }}
        >
          {/* Header */}
          <div className="text-center flex flex-col items-center gap-1">
            <span className="text-6xl" style={{ filter: "drop-shadow(0 0 20px rgba(139,92,246,0.9))" }}>🐱</span>
            <h1
              className="text-3xl font-black text-white uppercase tracking-wider mt-1"
              style={{ textShadow: "0 0 24px rgba(139,92,246,0.9)", fontFamily: "'Fredoka One', cursive" }}
            >
              IMPLODING KITTEN!
            </h1>
            <div
              className="px-3 py-1 rounded-full text-xs font-black tracking-widest mt-1"
              style={{
                background: "rgba(139,92,246,0.25)",
                border: "1px solid rgba(167,139,250,0.6)",
                color: "rgba(196,181,253,0.9)",
              }}
            >
              ☠ FACE UP — ไม่สามารถ DEFUSE ได้
            </div>
          </div>

          {/* Card face-up visual */}
          <div
            className="w-28 h-40 rounded-xl flex flex-col items-center justify-center gap-2"
            style={{
              background: "linear-gradient(160deg, #4c1d95 0%, #1e0a3c 100%)",
              border: "2px solid rgba(167,139,250,0.8)",
              boxShadow: "0 0 40px rgba(139,92,246,0.6)",
            }}
          >
            <span style={{ fontSize: "3rem" }}>🐱</span>
            <div
              className="text-[10px] font-black tracking-wider text-center leading-tight px-2"
              style={{ color: "rgba(196,181,253,0.9)" }}
            >
              IMPLODING
              <br />
              KITTEN
            </div>
          </div>

          {/* Description */}
          <div
            className="w-full px-4 py-3 rounded-2xl text-sm text-center"
            style={{
              background: "rgba(220,38,38,0.1)",
              border: "1px solid rgba(220,38,38,0.3)",
              color: "rgba(255,160,160,0.85)",
              lineHeight: "1.6",
            }}
          >
            
            <br />
            <span style={{ color: "rgba(196,181,253,0.7)", fontSize: "1.5rem" }}>
              ไม่สามารถ Defuse ได้ — คุณระเบิดทันที
            </span>
          </div>

          {/* Timer */}
          <div className="text-center">
            <p className="text-xs mb-1" style={{ color: "rgba(196,181,253,0.5)" }}>ระเบิดโดยอัตโนมัติใน</p>
            <div
              className="text-5xl font-black"
              style={{
                color: timeLeft <= 3 ? "#ef4444" : "#a78bfa",
                textShadow: timeLeft <= 3
                  ? "0 0 20px rgba(239,68,68,0.8)"
                  : "0 0 20px rgba(167,139,250,0.8)",
                fontFamily: "'Fredoka One', cursive",
              }}
            >
              {timeLeft}
            </div>
          </div>

          {/* Explode button */}
          <button
            onClick={handleIKExplode}
            disabled={firedRef.current || showImplosion}
            className="w-full py-4 rounded-2xl font-black text-white text-lg tracking-wider uppercase transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
              border: "2px solid rgba(167,139,250,0.6)",
              boxShadow: "0 5px 0 #2e1065, 0 8px 20px rgba(139,92,246,0.35)",
              fontFamily: "'Fredoka One', cursive",
            }}
          >
            💀 ยอมรับชะตากรรม
          </button>
        </div>
        </div>
      </>
    );
  }

  // ── EK ปกติ UI (สีแดง) ─────────────────────────────────────
  return (
    <>
      {bombAnimations}
      <div
        className="fixed inset-0 bg-red-950/90 flex flex-col items-center justify-center z-3000 animate-fade-in backdrop-blur-md"
        style={{ display: showHellfirePillar ? "none" : undefined }}>

        {/* Background radial gradient pulsing effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-red-600/30 via-transparent to-transparent animate-pulse-custom pointer-events-none" />

        {/* Modal popup */}
        <div
          className="relative z-10 pointer-events-auto flex flex-col items-center gap-4 p-6 rounded-3xl shadow-2xl"
          style={{
            width: "min(440px, calc(100vw - 2rem))",
            maxHeight: "calc(100dvh - 2rem)",
            overflowY: "auto",
            background: "rgba(20,0,0,0.92)",
            border: "2px solid rgba(239,68,68,0.6)",
            boxShadow: "0 0 60px rgba(239,68,68,0.4), 0 24px 60px rgba(0,0,0,0.8)",
          }}
        >
          {/* Header */}
          <div className="text-center">
            <span className="text-5xl drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">💣</span>
            <h1 className="text-3xl font-black text-white font-bungee mt-2 uppercase tracking-wider"
              style={{ textShadow: "0 0 20px rgba(239,68,68,0.8)" }}>
              EXPLODING KITTEN!
            </h1>
          </div>

          {/* Card */}
          <div className="transform scale-110 drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]">
            <Card cardCode={drawnCard} />
          </div>

          {/* Timer */}
          <div className="w-full text-center">
            <p className="text-gray-400 text-sm mb-1 font-medium">คุณมีเวลาแก้สถานการณ์</p>
            <div
              className="text-4xl font-bungee mb-2"
              style={{ color: timeLeft <= 3 ? "#ef4444" : "#f97316" }}
            >
              00:{timeLeft.toString().padStart(2, "0")}
            </div>

            <div className="flex gap-4 w-full mt-4 justify-center">
              {hasDefuse ? (
                <button
                  onClick={onDefuse}
                  disabled={firedRef.current}
                  className="flex-1 max-w-62.5 bg-linear-to-br from-green-500 to-emerald-700 hover:from-green-400 hover:to-emerald-600 border-2 border-green-300 text-white font-bungee py-4 px-6 rounded-2xl text-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span>🛡️</span> ใช้ DEFUSE!
                </button>
              ) : (
                <div className="flex-1 max-w-62.5 bg-gray-800/80 border-2 border-gray-600 text-gray-400 font-bungee py-4 px-6 rounded-2xl text-lg flex items-center justify-center gap-2 cursor-not-allowed">
                  <span>🚫</span> ไม่มี DEFUSE
                </div>
              )}

              <button
                onClick={handleEKExplode}
                disabled={firedRef.current || showHellfirePillar}
                className="flex-1 max-w-62.5 bg-linear-to-br from-red-600 to-rose-900 hover:from-red-500 hover:to-rose-800 border-2 border-red-400 text-white font-bungee py-4 px-6 rounded-2xl text-xl shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>💀</span> ยอมแพ้
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}