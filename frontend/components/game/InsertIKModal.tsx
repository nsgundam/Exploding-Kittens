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
  const totalCards = 13;
  const insertSlot = Math.round((selectedPosition / safeMax) * (totalCards - 1));

  const positionLabel =
    selectedPosition === 0
      ? "บนสุด (Top)"
      : selectedPosition >= safeMax
      ? "ล่างสุด (Bottom)"
      : `ใบที่ ${selectedPosition + 1} จากบนสุด`;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      <div
        className="relative z-10 flex flex-col items-center gap-5 p-7 rounded-3xl"
        style={{
          width: "480px",
          background: "linear-gradient(160deg, #0e0518 0%, #080010 100%)",
          border: "2px solid rgba(168,85,247,0.5)",
          boxShadow:
            "0 0 80px rgba(168,85,247,0.3), 0 0 140px rgba(109,40,217,0.15), 0 24px 60px rgba(0,0,0,0.9)",
          fontFamily: "'Fredoka One', cursive",
        }}
      >
        {/* Header */}
        <div className="text-center">
          <h2
            className="text-2xl font-black text-white tracking-wide"
            style={{ textShadow: "0 0 24px rgba(192,132,252,0.8)" }}
          >
            💀 Imploding Kitten
          </h2>
          <p className="text-sm mt-1 font-semibold" style={{ color: "rgba(216,180,254,0.7)" }}>
            เลือกตำแหน่งใส่การ์ดกลับลงกอง (หงายหน้าขึ้น)
          </p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(200,150,255,0.4)" }}>
            กองมี {deckCount} ใบ
          </p>
        </div>

        {/* IK Card face-up display */}
        <div
          className="flex flex-col items-center justify-center rounded-2xl"
          style={{
            width: "90px",
            height: "128px",
            background: "linear-gradient(160deg, #3b0764 0%, #1e0336 100%)",
            border: "2px solid rgba(192,132,252,0.7)",
            boxShadow:
              "0 0 30px rgba(168,85,247,0.6), 0 6px 20px rgba(0,0,0,0.8)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Glow overlay */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background:
                "radial-gradient(ellipse at 50% 30%, rgba(192,132,252,0.25) 0%, transparent 70%)",
            }}
          />
          {/* Card art */}
          <div className="text-4xl z-10 select-none" style={{ filter: "drop-shadow(0 0 10px rgba(216,180,254,0.9))" }}>
            🐱
          </div>
          <div
            className="z-10 text-[10px] font-black tracking-wider mt-1 text-center px-1"
            style={{ color: "rgba(240,220,255,0.9)", textShadow: "0 0 8px rgba(192,132,252,1)" }}
          >
            IMPLODING
            <br />
            KITTEN
          </div>
          {/* Face-up badge */}
          <div
            className="absolute top-1 right-1 rounded-full text-[8px] font-black px-1.5 py-0.5"
            style={{
              background: "rgba(168,85,247,0.6)",
              border: "1px solid rgba(216,180,254,0.7)",
              color: "#f3e8ff",
            }}
          >
            FACE UP
          </div>
          {/* Corner labels */}
          <div
            className="absolute top-1 left-1.5 text-[10px] font-black"
            style={{ color: "rgba(216,180,254,0.8)" }}
          >
            IK
          </div>
          <div
            className="absolute bottom-1 right-1.5 text-[10px] font-black rotate-180"
            style={{ color: "rgba(216,180,254,0.8)" }}
          >
            IK
          </div>
        </div>

        {/* Position label pill */}
        <div
          className="px-5 py-2 rounded-full text-sm font-black text-white tracking-wide"
          style={{
            background: "rgba(168,85,247,0.25)",
            border: "1px solid rgba(168,85,247,0.6)",
            boxShadow: "0 0 12px rgba(168,85,247,0.3)",
          }}
        >
          {positionLabel}
        </div>

        {/* Deck visualization */}
        <div className="relative w-full flex items-end justify-center" style={{ height: "100px" }}>
          {Array.from({ length: totalCards }).map((_, i) => {
            const isInsertPoint = i === insertSlot;
            const centerIndex = (totalCards - 1) / 2;
            const offset = (i - centerIndex) * 26;
            const zIdx = isInsertPoint ? 20 : totalCards - Math.abs(i - centerIndex);
            const scale = 1 - Math.abs(i - centerIndex) * 0.025;

            return (
              <div
                key={i}
                className="absolute rounded-xl transition-all duration-200"
                style={{
                  width: "44px",
                  height: isInsertPoint ? "90px" : "58px",
                  left: `calc(50% + ${offset}px - 22px)`,
                  bottom: 0,
                  transform: isInsertPoint
                    ? `scale(${scale}) translateY(-24px)`
                    : `scale(${scale})`,
                  background: isInsertPoint
                    ? "linear-gradient(180deg, #a855f7 0%, #4c1d95 100%)"
                    : "linear-gradient(180deg, #1e3a5f 0%, #0f1f33 100%)",
                  border: isInsertPoint
                    ? "2px solid #c084fc"
                    : "1px solid rgba(99,132,200,0.35)",
                  boxShadow: isInsertPoint
                    ? "0 0 24px rgba(168,85,247,0.9), 0 4px 12px rgba(0,0,0,0.5)"
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
                  <div className="absolute inset-0 flex items-center justify-center text-xl">
                    🐱
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
                border: "2px solid #a78bfa",
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
                background: `linear-gradient(to right, #a855f7 ${(selectedPosition / safeMax) * 100}%, #374151 ${(selectedPosition / safeMax) * 100}%)`,
                accentColor: "#a855f7",
              }}
            />

            <button
              onClick={() => setSelectedPosition(Math.min(safeMax, selectedPosition + 1))}
              className="w-11 h-11 rounded-full flex items-center justify-center text-2xl font-black text-white shrink-0 transition-all hover:scale-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
                border: "2px solid #a78bfa",
                boxShadow: "0 4px 0 #2e1065",
              }}
            >
              +
            </button>
          </div>

          <div
            className="flex justify-between text-xs font-bold px-1"
            style={{ color: "rgba(200,170,255,0.45)" }}
          >
            <span>บนสุด (Top)</span>
            <span>ล่างสุด (Bottom)</span>
          </div>
        </div>

        {/* Confirm button */}
        <button
          onClick={() => onConfirm(selectedPosition)}
          className="w-full py-4 rounded-2xl font-black text-white text-lg tracking-wider uppercase transition-all hover:scale-[1.02] active:scale-95"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
            border: "2px solid rgba(167,139,250,0.6)",
            boxShadow: "0 5px 0 #2e1065, 0 8px 24px rgba(124,58,237,0.4)",
            fontFamily: "'Fredoka One', cursive",
          }}
        >
          ยืนยัน (CONFIRM)
          <div className="text-xs font-normal opacity-60 mt-0.5">
            ใส่คืนกอง — หงายหน้าขึ้น (INSERT FACE-UP)
          </div>
        </button>
      </div>
    </div>
  );
}