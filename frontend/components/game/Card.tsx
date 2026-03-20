import React from "react";
import { getCardConfig } from "@/types/cards";

interface CardProps {
  cardCode: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Card({
  cardCode,
  selected = false,
  disabled = false,
  onClick,
  className = "",
}: CardProps) {
  const config = getCardConfig(cardCode);

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`
        relative w-22 h-32 rounded-xl border-[3px] flex flex-col items-center justify-center p-2
        transition-all duration-300 shadow-md bg-white select-none
        ${disabled ? "opacity-50 cursor-not-allowed grayscale-[50%]" : "cursor-pointer hover:-translate-y-4 hover:shadow-xl hover:z-10"}
        ${selected ? "border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)] -translate-y-2" : "border-gray-800"}
        ${className}
      `}
      style={{
        background: `linear-gradient(135deg, ${config.color}20 0%, #ffffff 100%)`,
        borderColor: selected ? undefined : config.color,
      }}
    >
      <div className="absolute top-1 left-1.5 text-xs font-bold text-gray-800">
        {cardCode.replace(/^GVE_/, "")}
      </div>
      <div className="text-4xl mb-1 filter drop-shadow-md transition-transform duration-300 hover:scale-110">
        {config.emoji}
      </div>
      <div
        className="w-full text-center font-bold text-[9px] uppercase leading-tight font-bungee"
        style={{ color: config.color }}
      >
        {config.label}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/5 to-transparent rounded-b-lg pointer-events-none" />
    </div>
  );
}
