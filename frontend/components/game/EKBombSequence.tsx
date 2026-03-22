import React, { useEffect, useState } from "react";
import { Card } from "./Card";

interface EKBombSequenceProps {
  drawnCard: string;
  hasDefuse: boolean;
  onDefuse: () => void;
  onExplode: () => void;
  active: boolean;
  isMyBomb: boolean;
}

export function EKBombSequence({
  drawnCard,
  hasDefuse,
  onDefuse,
  onExplode,
  active,
  isMyBomb,
}: EKBombSequenceProps) {
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    if (!active || !isMyBomb) return;

    const fuseInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(fuseInterval);
          onExplode();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(fuseInterval);
      setTimeLeft(10);
    };
  }, [active, isMyBomb, onExplode]);

  if (!active || !isMyBomb) return null;

  return (
    <div className="fixed inset-0 bg-red-950/90 flex flex-col items-center justify-center z-3000 animate-fade-in backdrop-blur-md">

      {/* Background radial gradient pulsing effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-red-600/30 via-transparent to-transparent animate-pulse-custom pointer-events-none" />

      {/* Modal popup */}
      <div
        className="relative z-10 pointer-events-auto flex flex-col items-center gap-4 p-6 rounded-3xl shadow-2xl"
        style={{
          width: "440px",
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
                className="flex-1 max-w-62.5 bg-linear-to-br from-green-500 to-emerald-700 hover:from-green-400 hover:to-emerald-600 border-2 border-green-300 text-white font-bungee py-4 px-6 rounded-2xl text-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>🛡️</span> ใช้ DEFUSE!
              </button>
            ) : (
              <div className="flex-1 max-w-62.5 bg-gray-800/80 border-2 border-gray-600 text-gray-400 font-bungee py-4 px-6 rounded-2xl text-lg flex items-center justify-center gap-2 cursor-not-allowed">
                <span>🚫</span> ไม่มี DEFUSE
              </div>
            )}

            <button
              onClick={onExplode}
              className="flex-1 max-w-62.5 bg-linear-to-br from-red-600 to-rose-900 hover:from-red-500 hover:to-rose-800 border-2 border-red-400 text-white font-bungee py-4 px-6 rounded-2xl text-xl shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <span>💀</span> ยอมแพ้
            </button>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 w-full">
          {/* ปุ่มกู้ระเบิด */}
          <button
            onClick={hasDefuse ? onDefuse : undefined}
            disabled={!hasDefuse}
            className={`flex-1 font-bungee py-3 px-4 rounded-2xl text-base transition-all flex items-center justify-center gap-2 border-2
              ${hasDefuse
                ? "bg-linear-to-br from-green-500 to-emerald-700 hover:from-green-400 hover:to-emerald-600 border-green-300 text-white shadow-[0_0_16px_rgba(34,197,94,0.4)] hover:scale-105 active:scale-95 cursor-pointer"
                : "bg-gray-800/80 border-gray-600 text-gray-400 cursor-not-allowed opacity-60"
              }`}
          >
            <span>🛡️</span>
            {hasDefuse ? "ใช้ DEFUSE!" : "ไม่มี DEFUSE"}
          </button>

          {/* ปุ่มยอมแพ้ — กดได้เสมอ */}
          <button
            onClick={onExplode}
            className="flex-1 bg-linear-to-br600 to-rose-900 hover:from-red-500 hover:to-rose-800 border-2 border-red-400 text-white font-bungee py-3 px-4 rounded-2xl text-base shadow-[0_0_16px_rgba(239,68,68,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>💀</span> ยอมแพ้
          </button>
        </div>
      </div>
    </div>
  );
}
