import React from "react";
import { getCardConfig } from "@/types/cards";
import { useCardDescriptions } from "@/hooks/useCardDescriptions";

interface CardProps {
  cardCode: string;
  selected?: boolean;
  disabled?: boolean;
  noHoverTranslate?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Card({
  cardCode,
  selected = false,
  disabled = false,
  noHoverTranslate = false,
  onClick,
  className = "",
}: CardProps) {
  const config = getCardConfig(cardCode);
  const descriptions = useCardDescriptions();

  // ลอง exact match ก่อน ถ้าไม่มีลอง strip GVE_ prefix
  const description =
    descriptions[cardCode] ??
    descriptions[cardCode.replace(/^GVE_/, "")] ??
    "";

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`
        group relative w-22 h-32 rounded-xl border-[3px] flex flex-col items-center justify-center p-2
        transition-all duration-300 shadow-md bg-white select-none
        ${disabled ? "opacity-50 cursor-not-allowed grayscale-50" : `cursor-pointer ${noHoverTranslate ? "" : "hover:-translate-y-4"} hover:shadow-xl hover:z-10`}
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
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/5 to-transparent rounded-b-lg pointer-events-none" />

      {/* ── TOOLTIP ── แสดงตอน hover */}
      {description && (
        <div
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-[999]
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ width: "160px" }}
        >
          <div
            className="rounded-xl px-3 py-2 text-center text-[11px] leading-snug font-medium"
            style={{
              background: "rgba(10,5,20,0.92)",
              border: `1px solid ${config.color}66`,
              boxShadow: `0 4px 16px rgba(0,0,0,0.5), 0 0 12px ${config.color}22`,
              color: "#f0e6d0",
              fontFamily: "'Fredoka One', cursive",
            }}
          >
            {description}
          </div>
          {/* Arrow */}
          <div
            className="mx-auto w-2 h-2 rotate-45 -mt-1"
            style={{
              background: "rgba(10,5,20,0.92)",
              border: `1px solid ${config.color}66`,
              borderTop: "none",
              borderLeft: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}