import React, { useEffect } from "react";
import confetti from "canvas-confetti";

export interface WinnerModalProps {
  isMe: boolean;
  displayName: string;
}

export function WinnerModal({ isMe, displayName }: WinnerModalProps) {
  useEffect(() => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
    };
    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-2000 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 flex flex-col items-center gap-4 p-8 rounded-3xl text-center"
        style={{
          width: "420px",
          background: "rgba(0,10,0,0.95)",
          border: "2px solid rgba(250,204,21,0.6)",
          boxShadow:
            "0 0 80px rgba(250,204,21,0.3), 0 24px 60px rgba(0,0,0,0.8)",
        }}
      >
        <div className="text-7xl animate-bounce">🏆</div>
        <h2
          className="text-4xl font-black text-yellow-400 font-bungee uppercase tracking-wider"
          style={{ textShadow: "0 0 30px rgba(250,204,21,0.8)" }}
        >
          {isMe ? "คุณชนะ!" : `${displayName} ชนะ!`}
        </h2>
        <p className="text-gray-300 text-base">
          {isMe
            ? "เยี่ยมมาก! คุณเป็นผู้รอดชีวิตคนสุดท้าย 🎉"
            : `${displayName} เป็นผู้รอดชีวิตคนสุดท้าย`}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-8 py-3 rounded-2xl font-black text-black font-bungee text-lg transition-all hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #fbbf24, #d97706)",
            border: "2px solid rgba(250,204,21,0.8)",
            boxShadow: "0 4px 0 #92400e",
          }}
        >
          กลับสู่ห้อง
        </button>
      </div>
    </div>
  );
}
