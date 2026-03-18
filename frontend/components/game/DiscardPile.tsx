import React from "react";
import { getCardConfig } from "@/types/cards";

interface DiscardPileProps {
  topCard?: string | null;
  count?: number;
}

export function DiscardPile({ topCard, count = 0 }: DiscardPileProps) {
  if (count === 0 || !topCard) {
    return (
      <div className="w-24 h-36 border-2 border-dashed border-white/30 rounded-2xl flex flex-col items-center justify-center bg-black/20 text-white/40">
        <span className="text-2xl mb-1">🗑️</span>
        <span className="font-bungee text-xs">Discard</span>
      </div>
    );
  }

  const config = getCardConfig(topCard);

  return (
    <div className="relative w-24 h-36 group">
      {/* Decorative cards underneath to look like a stack */}
      {count > 1 && (
        <div className="absolute top-1 left-1 w-full h-full rounded-2xl border-2 border-gray-600 bg-gray-200 rotate-3 z-0" />
      )}
      {count > 2 && (
        <div className="absolute top-2 left-2 w-full h-full rounded-2xl border-2 border-gray-500 bg-gray-300 -rotate-2 z-10" />
      )}

      {/* Top Card */}
      <div
        className="w-full h-full rounded-2xl border-[3px] flex flex-col items-center justify-center p-2 shadow-lg bg-white relative z-20 transition-transform duration-300 group-hover:-translate-y-1"
        style={{
          background: `linear-gradient(135deg, ${config.color}20 0%, #ffffff 100%)`,
          borderColor: config.color,
        }}
      >
        <div className="absolute top-1 right-1.5 text-xs font-bold text-gray-800 bg-white/80 rounded px-1">
          {count}
        </div>
        <div className="text-4xl mb-1 filter drop-shadow-md">
          {config.emoji}
        </div>
        <div
          className="w-full text-center font-bold text-[8px] uppercase leading-tight font-bungee"
          style={{ color: config.color }}
        >
          {config.label}
        </div>
      </div>
    </div>
  );
}
