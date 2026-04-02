import React, { useState, useRef } from "react";
import { Card } from "./Card";

interface AlterTheFutureModalProps {
  cards: string[];       // top 3 cards [index0 = top of deck]
  isOpen: boolean;
  onConfirm: (newOrder: string[]) => void;
}

export function AlterTheFutureModal({ cards, isOpen, onConfirm }: AlterTheFutureModalProps) {
  const [order, setOrder] = useState<string[]>(cards);
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  // sync ถ้า cards prop เปลี่ยน (เช่น modal เปิดใหม่)
  React.useEffect(() => {
    if (isOpen) setOrder(cards);
  }, [isOpen, cards]);

  // ── Drag handlers ──────────────────────────────────────────
  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverIndex.current = index;
    if (dragIndex.current === null || dragIndex.current === index) return;
    const next = [...order];
    const dragged = next.splice(dragIndex.current, 1)[0]!;
    next.splice(index, 0, dragged);
    dragIndex.current = index;
    setOrder(next);
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    dragOverIndex.current = null;
  };

  // ── Click-to-swap (mobile friendly) ───────────────────────
  const selectedIndex = useRef<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleCardClick = (index: number) => {
    if (selectedIndex.current === null) {
      selectedIndex.current = index;
      setSelectedIdx(index);
    } else {
      if (selectedIndex.current !== index) {
        const next = [...order];
        const tmp = next[selectedIndex.current]!;
        next[selectedIndex.current] = next[index]!;
        next[index] = tmp;
        setOrder(next);
      }
      selectedIndex.current = null;
      setSelectedIdx(null);
    }
  };

  if (!isOpen || cards.length === 0) return null;

  const positionLabel = ["บนสุด", "ที่ 2", "ที่ 3"];

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[2000] backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900/95 border-2 border-purple-500 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-[0_0_60px_rgba(168,85,247,0.45)] max-w-2xl w-full mx-4 animate-scale-in">

        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-3">✨</div>
          <h2 className="text-3xl font-bold text-purple-400 font-bungee drop-shadow-md tracking-wide">
            ALTER THE FUTURE
          </h2>
          <p className="text-gray-300 mt-2 text-sm font-medium">
            จัดลำดับไพ่ 3 ใบบนสุดของกอง — แค่คุณเท่านั้นที่เห็น
          </p>
          <p className="text-purple-400/70 text-xs mt-1">
            ลาก หรือ แตะ 2 ใบเพื่อสลับตำแหน่ง
          </p>
        </div>

        {/* Cards */}
        <div className="flex justify-center gap-6 my-2 w-full select-none">
          {order.map((cardCode, index) => (
            <div
              key={`${cardCode}-${index}`}
              className={`flex flex-col items-center gap-2 transition-transform duration-150 ${
                selectedIdx === index ? "scale-110" : "hover:scale-105"
              }`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => handleCardClick(index)}
              style={{ cursor: "grab" }}
            >
              {/* Position badge */}
              <span
                className={`text-xs font-bold px-2 py-1 rounded transition-colors ${
                  selectedIdx === index
                    ? "bg-purple-500 text-white"
                    : "bg-purple-500/15 text-purple-400"
                }`}
              >
                {positionLabel[index]}
              </span>

              {/* Card with highlight ring if selected */}
              <div
                className={`rounded-xl transition-all duration-150 ${
                  selectedIdx === index
                    ? "ring-4 ring-purple-400 ring-offset-2 ring-offset-zinc-900"
                    : ""
                }`}
              >
                <Card
                  cardCode={cardCode}
                  className="scale-125 mx-4 shadow-xl shadow-purple-500/20 pointer-events-none"
                />
              </div>

              {/* Drag hint icon */}
              <span className="text-purple-500/50 text-lg mt-1">⠿</span>
            </div>
          ))}
        </div>

        {/* Arrow indicators */}
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <span className="text-purple-500">←</span>
          <span>บนสุดของกอง</span>
          <span className="flex-1 border-t border-dashed border-gray-700 mx-2" />
          <span>ล่างสุด</span>
          <span className="text-purple-500">→</span>
        </div>

        {/* Confirm button */}
        <button
          onClick={() => onConfirm(order)}
          className="mt-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bungee py-3 px-14 rounded-xl text-lg shadow-lg transition-all hover:scale-105 active:scale-95 border-2 border-purple-400"
        >
          ยืนยันลำดับ ✨
        </button>
      </div>
    </div>
  );
}