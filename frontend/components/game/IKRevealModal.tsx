import React, { useEffect, useState } from "react";

interface IKRevealModalProps {
  isOpen: boolean;
  drawerName: string;   // ชื่อผู้เล่นที่จั่วได้
  isMyTurn: boolean;    // true = คนจั่วคือตัวเอง → หลัง reveal ไป IK_INSERT
  isFaceUp: boolean;    // true = IK หงายหน้า → ตายทันที, false = คว่ำหน้า → เลือกตำแหน่ง
  onRevealDone: () => void; // callback หลัง reveal จบ (auto หรือปิดเอง)
}

const REVEAL_DURATION = 3000; // ms

export function IKRevealModal({
  isOpen,
  drawerName,
  isMyTurn,
  isFaceUp,
  onRevealDone,
}: IKRevealModalProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / REVEAL_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        onRevealDone();
      }
    }, 50);

    return () => {
      clearInterval(interval);
      setProgress(0);
    };
  }, [isOpen, onRevealDone]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[3000] backdrop-blur-sm"
      style={{ background: "rgba(10,0,25,0.88)" }}
    >
      {/* BG glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, rgba(139,92,246,0.2) 0%, transparent 65%)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />

      <div
        className="relative z-10 flex flex-col items-center gap-5 p-8 rounded-3xl"
        style={{
          width: "420px",
          background: "linear-gradient(160deg, #1a0530 0%, #0a001a 70%)",
          border: "2px solid rgba(139,92,246,0.65)",
          boxShadow: "0 0 100px rgba(139,92,246,0.25), 0 24px 60px rgba(0,0,0,0.95)",
          fontFamily: "'Fredoka One', cursive",
        }}
      >
        {/* Animated cat emoji */}
        <div
          style={{
            fontSize: "5rem",
            filter: "drop-shadow(0 0 24px rgba(139,92,246,0.9))",
            animation: "bounce 0.6s ease-in-out infinite alternate",
          }}
        >
          🐱
        </div>

        {/* Title */}
        <div className="text-center">
          <div
            className="text-3xl font-black text-white uppercase tracking-widest"
            style={{ textShadow: "0 0 24px rgba(139,92,246,0.9)" }}
          >
            IMPLODING KITTEN!
          </div>
          <div
            className="text-base mt-1"
            style={{ color: "rgba(196,181,253,0.75)" }}
          >
            {drawerName} จั่วได้ Imploding Kitten!
          </div>
        </div>

        {/* Card face-up visual */}
        <div
          className="w-24 h-32 rounded-xl flex flex-col items-center justify-center gap-1 relative"
          style={{
            background: "linear-gradient(160deg, #4c1d95 0%, #1e0a3c 100%)",
            border: "2px solid rgba(167,139,250,0.8)",
            boxShadow: "0 0 40px rgba(139,92,246,0.5)",
          }}
        >
          <span style={{ fontSize: "2.5rem" }}>🐱</span>
          <div
            className="text-[9px] font-black tracking-wider text-center leading-tight px-1"
            style={{ color: "rgba(196,181,253,0.9)" }}
          >
            IMPLODING
            <br />
            KITTEN
          </div>
          {/* Face-up/down badge */}
          <div
            className="absolute -top-2.5 -right-2.5 px-2 py-0.5 rounded-full text-[9px] font-black"
            style={{
              background: isFaceUp ? "rgba(220,38,38,0.9)" : "rgba(139,92,246,0.9)",
              border: `1px solid ${isFaceUp ? "rgba(255,160,160,0.8)" : "rgba(196,181,253,0.8)"}`,
              color: "white",
            }}
          >
            {isFaceUp ? "FACE UP ☠" : "FACE DOWN"}
          </div>
        </div>

        {/* Status message */}
        <div
          className="w-full px-4 py-3 rounded-2xl text-sm text-center"
          style={{
            background: isFaceUp ? "rgba(220,38,38,0.12)" : "rgba(139,92,246,0.12)",
            border: `1px solid ${isFaceUp ? "rgba(220,38,38,0.35)" : "rgba(139,92,246,0.35)"}`,
            color: isFaceUp ? "rgba(255,160,160,0.85)" : "rgba(196,181,253,0.85)",
            lineHeight: "1.6",
          }}
        >
          {isFaceUp ? (
            <>
              ☠️ การ์ดหงายหน้า — <strong>{drawerName}</strong> ระเบิดทันที!
              <br />
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>ไม่สามารถ Defuse ได้</span>
            </>
          ) : (
            <>
              🐱 การ์ดคว่ำหน้า — <strong>{isMyTurn ? "คุณ" : drawerName}</strong>{" "}
              {isMyTurn ? "ต้องเลือกตำแหน่งใส่กลับกอง" : "กำลังเลือกตำแหน่งใส่กลับกอง"}
              <br />
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                หลังจากใส่กลับ การ์ดจะหงายหน้าขึ้น
              </span>
            </>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <div
              className="h-full rounded-full transition-none"
              style={{
                width: `${progress}%`,
                background: isFaceUp
                  ? "linear-gradient(90deg, #ef4444, #dc2626)"
                  : "linear-gradient(90deg, #8b5cf6, #7c3aed)",
              }}
            />
          </div>
          <div
            className="text-center text-xs mt-1"
            style={{ color: "rgba(196,181,253,0.4)" }}
          >
            {isMyTurn && !isFaceUp ? "กำลังเปิดหน้าต่างเลือกตำแหน่ง..." : "กำลังดำเนินการ..."}
          </div>
        </div>

        <style>{`
          @keyframes bounce {
            from { transform: translateY(0px); }
            to   { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    </div>
  );
}