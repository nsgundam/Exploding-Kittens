import React, { useState } from "react";

interface InsertEKModalProps {
  drawnCard: string;
  deckCount: number;
  isOpen: boolean;
  onConfirm: (position: number) => void;
}

export function InsertEKModal({ deckCount, isOpen, onConfirm }: InsertEKModalProps) {
  const [selectedPosition, setSelectedPosition] = useState<number>(() => Math.floor(Math.max(deckCount, 1) / 2));

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
    <div className="fixed inset-0 z-3000 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative z-10 flex flex-col items-center gap-5 p-7 rounded-3xl"
        style={{
          width: "min(460px, calc(100vw - 2rem))",
          maxHeight: "calc(100dvh - 2rem)",
          overflowY: "auto",
          background: "linear-gradient(160deg, #1a0505 0%, #0d0000 100%)",
          border: "2px solid rgba(220,38,38,0.5)",
          boxShadow: "0 0 80px rgba(220,38,38,0.25), 0 24px 60px rgba(0,0,0,0.9)",
          fontFamily: "'Fredoka One', cursive",
        }}
      >
        <div className="text-center">
          <h2
            className="text-2xl font-black text-white tracking-wide"
            style={{ textShadow: "0 0 20px rgba(239,68,68,0.6)" }}
          >
            เลือกตำแหน่งระเบิดกลับเข้ากอง
          </h2>
          <p className="text-xs mt-1" style={{ color: "rgba(255,180,180,0.5)" }}>
            กองมี {deckCount} ใบ
          </p>
        </div>

        <div
          className="px-5 py-2 rounded-full text-sm font-black text-white tracking-wide"
          style={{
            background: "rgba(220,38,38,0.3)",
            border: "1px solid rgba(220,38,38,0.6)",
          }}
        >
          {positionLabel}
        </div>

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
                  transform: isInsertPoint ? `scale(${scale}) translateY(-24px)` : `scale(${scale})`,
                  background: isInsertPoint
                    ? "linear-gradient(180deg, #ef4444 0%, #7f1d1d 100%)"
                    : "linear-gradient(180deg, #1e3a5f 0%, #0f1f33 100%)",
                  border: isInsertPoint ? "2px solid #f87171" : "1px solid rgba(99,132,200,0.35)",
                  boxShadow: isInsertPoint
                    ? "0 0 20px rgba(239,68,68,0.8), 0 4px 12px rgba(0,0,0,0.5)"
                    : "0 2px 6px rgba(0,0,0,0.4)",
                  zIndex: zIdx,
                }}
              >
                {!isInsertPoint && (
                  <div
                    className="absolute inset-1 rounded-lg opacity-20"
                    style={{
                      backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)",
                      backgroundSize: "5px 5px",
                    }}
                  />
                )}
                {isInsertPoint && (
                  <div className="absolute inset-0 flex items-center justify-center text-xl">💣</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="w-full flex flex-col gap-2 px-1">
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={() => setSelectedPosition(Math.max(0, selectedPosition - 1))}
              className="w-11 h-11 rounded-full flex items-center justify-center text-2xl font-black text-white shrink-0 transition-all hover:scale-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
                border: "2px solid #f87171",
                boxShadow: "0 4px 0 #450a0a",
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
                background: `linear-gradient(to right, #ef4444 ${(selectedPosition / safeMax) * 100}%, #374151 ${(selectedPosition / safeMax) * 100}%)`,
                accentColor: "#ef4444",
              }}
            />

            <button
              onClick={() => setSelectedPosition(Math.min(safeMax, selectedPosition + 1))}
              className="w-11 h-11 rounded-full flex items-center justify-center text-2xl font-black text-white shrink-0 transition-all hover:scale-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
                border: "2px solid #f87171",
                boxShadow: "0 4px 0 #450a0a",
              }}
            >
              +
            </button>
          </div>

          <div className="flex justify-between text-xs font-bold px-1" style={{ color: "rgba(255,180,180,0.45)" }}>
            <span>บนสุด (Top)</span>
            <span>ล่างสุด (Bottom)</span>
          </div>
        </div>

        <button
          onClick={() => onConfirm(selectedPosition)}
          className="w-full py-4 rounded-2xl font-black text-white text-lg tracking-wider uppercase transition-all hover:scale-[1.02] active:scale-95"
          style={{
            background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
            border: "2px solid rgba(239,68,68,0.6)",
            boxShadow: "0 5px 0 #450a0a, 0 8px 20px rgba(220,38,38,0.3)",
            fontFamily: "'Fredoka One', cursive",
          }}
        >
          ยืนยัน (CONFIRM)
          <div className="text-xs font-normal opacity-60 mt-0.5">ใส่คืนกอง (PUT BACK IN DECK)</div>
        </button>
      </div>
    </div>
  );
}
