import React, { useState } from "react";

interface InsertIKModalProps {
  deckCount: number;
  isOpen: boolean;
  onConfirm: (position: number) => void;
}

export function InsertIKModal({ deckCount, isOpen, onConfirm }: InsertIKModalProps) {
  const [selectedPosition, setSelectedPosition] = useState<number>(() =>
    Math.floor(Math.max(deckCount, 1) / 2)
  );

  if (!isOpen) return null;

  const safeMax = Math.max(deckCount, 1);
  const totalSlots = 13;
  const insertSlot = Math.round((selectedPosition / safeMax) * (totalSlots - 1));

  const positionLabel =
    selectedPosition === 0
      ? "บนสุด (Top)"
      : selectedPosition >= safeMax
      ? "ล่างสุด (Bottom)"
      : `ใบที่ ${selectedPosition + 1} จากบนสุด`;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              width: `${4 + (i % 3) * 3}px`,
              height: `${4 + (i % 3) * 3}px`,
              left: `${10 + i * 11}%`,
              top: `${15 + (i % 4) * 18}%`,
              background: i % 2 === 0
                ? "rgba(139,92,246,0.4)"
                : "rgba(220,38,38,0.35)",
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${1.5 + i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <div
        className="relative z-10 flex flex-col items-center gap-5 p-7 rounded-3xl"
        style={{
          width: "480px",
          background: "linear-gradient(160deg, #1a0530 0%, #0a001a 60%, #0d0005 100%)",
          border: "2px solid rgba(139,92,246,0.55)",
          boxShadow:
            "0 0 100px rgba(139,92,246,0.2), 0 0 40px rgba(220,38,38,0.1), 0 24px 60px rgba(0,0,0,0.95)",
          fontFamily: "'Fredoka One', cursive",
        }}
      >
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-2">
          {/* IK Card face-up visual */}
          <div
            className="w-20 h-28 rounded-xl flex flex-col items-center justify-center gap-1 mb-1"
            style={{
              background: "linear-gradient(160deg, #4c1d95 0%, #1e0a3c 100%)",
              border: "2px solid rgba(167,139,250,0.7)",
              boxShadow:
                "0 0 30px rgba(139,92,246,0.5), 0 0 8px rgba(220,38,38,0.3)",
            }}
          >
            <span style={{ fontSize: "2rem" }}>🐱</span>
            <div
              className="text-[9px] font-black tracking-wider text-center leading-tight px-1"
              style={{ color: "rgba(196,181,253,0.9)" }}
            >
              IMPLODING
              <br />
              KITTEN
            </div>
            {/* Face-up indicator */}
            <div
              className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[8px] font-black"
              style={{
                background: "rgba(139,92,246,0.9)",
                border: "1px solid rgba(196,181,253,0.8)",
                color: "white",
              }}
            >
              FACE UP
            </div>
          </div>

          <h2
            className="text-xl font-black text-white tracking-wide leading-tight"
            style={{ textShadow: "0 0 20px rgba(139,92,246,0.8)" }}
          >
            วางระเบิดกลับเข้ากอง
          </h2>
          <p
            className="text-xs"
            style={{ color: "rgba(196,181,253,0.6)" }}
          >
            การ์ดนี้หงายหน้าขึ้น — เลือกตำแหน่งที่ต้องการ
          </p>
          <p
            className="text-[11px]"
            style={{ color: "rgba(255,160,160,0.5)" }}
          >
            กองมี {deckCount} ใบ
          </p>
        </div>

        {/* Position badge */}
        <div
          className="px-5 py-2 rounded-full text-sm font-black text-white tracking-wide"
          style={{
            background: "rgba(139,92,246,0.25)",
            border: "1px solid rgba(139,92,246,0.6)",
          }}
        >
          {positionLabel}
        </div>

        {/* Deck visual */}
        <div className="relative w-full flex items-end justify-center" style={{ height: "100px" }}>
          {Array.from({ length: totalSlots }).map((_, i) => {
            const isInsertPoint = i === insertSlot;
            const centerIndex = (totalSlots - 1) / 2;
            const offset = (i - centerIndex) * 26;
            const zIdx = isInsertPoint ? 20 : totalSlots - Math.abs(i - centerIndex);
            const scale = 1 - Math.abs(i - centerIndex) * 0.025;

            return (
              <div
                key={i}
                className="absolute rounded-xl transition-all duration-200"
                style={{
                  width: "44px",
                  height: isInsertPoint ? "88px" : "58px",
                  left: `calc(50% + ${offset}px - 22px)`,
                  bottom: 0,
                  transform: isInsertPoint
                    ? `scale(${scale}) translateY(-24px)`
                    : `scale(${scale})`,
                  background: isInsertPoint
                    ? "linear-gradient(180deg, #7c3aed 0%, #3b0764 100%)"
                    : "linear-gradient(180deg, #1e3a5f 0%, #0f1f33 100%)",
                  border: isInsertPoint
                    ? "2px solid rgba(167,139,250,0.9)"
                    : "1px solid rgba(99,132,200,0.35)",
                  boxShadow: isInsertPoint
                    ? "0 0 20px rgba(139,92,246,0.8), 0 4px 12px rgba(0,0,0,0.5)"
                    : "0 2px 6px rgba(0,0,0,0.4)",
                  zIndex: zIdx,
                }}
              >
                {!isInsertPoint && (
                  <div
                    className="absolute inset-1 rounded-lg opacity-20"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)",
                      backgroundSize: "5px 5px",
                    }}
                  />
                )}
                {isInsertPoint && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                    <span style={{ fontSize: "1.3rem" }}>🐱</span>
                    <div
                      className="text-[7px] font-black tracking-wide text-center leading-none"
                      style={{ color: "rgba(196,181,253,0.9)" }}
                    >
                      FACE
                      <br />
                      UP
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Slider controls */}
        <div className="w-full flex flex-col gap-2 px-1">
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={() => setSelectedPosition(Math.max(0, selectedPosition - 1))}
              className="w-11 h-11 rounded-full flex items-center justify-center text-2xl font-black text-white shrink-0 transition-all hover:scale-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
                border: "2px solid rgba(167,139,250,0.7)",
                boxShadow: "0 4px 0 #2e1065",
              }}
            >
              −
            </button>

            <input
              type="range"
              min={0}
              max={safeMax}
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(parseInt(e.target.value, 10))}
              className="flex-1 h-2 rounded-full appearance-none cursor-pointer outline-none"
              style={{
                background: `linear-gradient(to right, #8b5cf6 ${(selectedPosition / safeMax) * 100}%, #374151 ${(selectedPosition / safeMax) * 100}%)`,
                accentColor: "#8b5cf6",
              }}
            />

            <button
              onClick={() => setSelectedPosition(Math.min(safeMax, selectedPosition + 1))}
              className="w-11 h-11 rounded-full flex items-center justify-center text-2xl font-black text-white shrink-0 transition-all hover:scale-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
                border: "2px solid rgba(167,139,250,0.7)",
                boxShadow: "0 4px 0 #2e1065",
              }}
            >
              +
            </button>
          </div>

          <div
            className="flex justify-between text-xs font-bold px-1"
            style={{ color: "rgba(196,181,253,0.4)" }}
          >
            <span>บนสุด (Top)</span>
            <span>ล่างสุด (Bottom)</span>
          </div>
        </div>

        {/* Warning notice */}
        <div
          className="w-full px-4 py-2.5 rounded-2xl text-xs text-center"
          style={{
            background: "rgba(220,38,38,0.1)",
            border: "1px solid rgba(220,38,38,0.3)",
            color: "rgba(255,160,160,0.75)",
            lineHeight: "1.5",
          }}
        >
          ⚠️ หลังจากนี้การ์ดจะหงายหน้า — ผู้เล่นทุกคนจะรู้ตำแหน่งมัน!
          <br />
          <span style={{ color: "rgba(196,181,253,0.6)" }}>
            ถ้าจั่วได้ครั้งหน้า = ตายทันที ไม่สามารถ Defuse ได้
          </span>
        </div>

        {/* Confirm button */}
        <button
          onClick={() => onConfirm(selectedPosition)}
          className="w-full py-4 rounded-2xl font-black text-white text-lg tracking-wider uppercase transition-all hover:scale-[1.02] active:scale-95"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
            border: "2px solid rgba(167,139,250,0.6)",
            boxShadow: "0 5px 0 #2e1065, 0 8px 20px rgba(139,92,246,0.35)",
            fontFamily: "'Fredoka One', cursive",
          }}
        >
          ยืนยัน (CONFIRM)
          <div className="text-xs font-normal opacity-60 mt-0.5">
            วางการ์ดคืนกอง (PLACE BACK IN DECK)
          </div>
        </button>
      </div>
    </div>
  );
}