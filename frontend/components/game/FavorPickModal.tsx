"use client";

import { Card } from "./Card";

interface FavorPickModalProps {
  isOpen: boolean;
  requesterName: string;
  requesterPlayerId: string;
  myCards: string[];
  onPickCard: (cardCode: string, requesterPlayerId: string) => void;
}

export function FavorPickModal({
  isOpen,
  requesterName,
  requesterPlayerId,
  myCards,
  onPickCard,
}: FavorPickModalProps) {
  if (!isOpen) return null;

  const givableCards = myCards.filter(
    (c) => c !== "EK" && c !== "GVE_EK" && c !== "DF" && c !== "GVE_DF"
  );

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 flex flex-col items-center gap-5 p-7 rounded-3xl"
        style={{
          width: "520px",
          maxWidth: "95vw",
          background: "rgba(0,5,26,0.75)",
          backdropFilter: "blur(20px)",
          border: "2px solid rgba(59,130,246,0.5)",
          boxShadow: "0 0 60px rgba(59,130,246,0.2), 0 24px 60px rgba(0,0,0,0.9)",
          fontFamily: "'Fredoka One', cursive",
        }}
      >
        <div className="text-center">
          <div className="text-4xl mb-2">🃏</div>
          <h2
            className="text-2xl font-black text-white tracking-wide"
            style={{ textShadow: "0 0 20px rgba(59,130,246,0.6)" }}
          >
            {requesterName} ขอการ์ดจากคุณ!
          </h2>
          <p className="text-sm mt-1" style={{ color: "rgba(147,197,253,0.7)" }}>
            เลือก 1 ใบที่จะให้
          </p>
        </div>

        {givableCards.length === 0 ? (
          <div
            className="w-full py-8 rounded-2xl text-center text-sm"
            style={{ color: "rgba(255,255,255,0.4)", border: "1px dashed rgba(255,255,255,0.15)" }}
          >
            ไม่มีการ์ดที่ให้ได้
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-3 w-full max-h-64 overflow-y-auto py-2">
            {givableCards.map((cardCode, i) => (
              <div
                key={`${i}-${cardCode}`}
                onClick={() => onPickCard(cardCode, requesterPlayerId)}
                className="cursor-pointer transition-all hover:scale-110 hover:-translate-y-2 active:scale-95"
              >
                <Card cardCode={cardCode} />
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
          * EK และ DEFUSE ไม่สามารถให้ได้
        </p>
      </div>
    </div>
  );
}