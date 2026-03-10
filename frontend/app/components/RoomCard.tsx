"use client";

import React from "react";

interface RoomCardProps {
  id: string;
  name: string;
  deck: number;
  addon: boolean;
  players: number;
  maxPlayers: number;
  status: "waiting" | "playing";
  onClick: () => void;
}

export default function RoomCard({
  id,
  name,
  deck,
  addon,
  players,
  maxPlayers,
  status,
  onClick,
}: RoomCardProps) {
  const isClickable = status === "waiting";

  return (
    <div
      className={[
        "bg-white/10 backdrop-blur-2xl",
        "border border-white/20 rounded-3xl",
        "px-4 py-4 flex items-center gap-4 shrink-0",
        "transition-all duration-300 animate-slide-in",
        "shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
        isClickable
          ? "cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(255,170,0,0.5)] hover:border-orange-400/50"
          : "opacity-60 cursor-not-allowed grayscale-[50%]",
      ].join(" ")}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Deck badge */}
      <div className="bg-gradient-to-br from-orange-400 to-red-600 border border-white/30 rounded-2xl flex flex-col items-center justify-center gap-0.5 w-25 h-25 shrink-0 relative overflow-hidden shadow-inner">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,#ffffff_0%,transparent_70%)]" />
        <span className="text-2xl relative z-10">🎴</span>
        <span className="font-bold text-[9px] text-black leading-tight relative z-10">
          สำรับ {deck}
        </span>
        {addon ? (
          <span className="font-bold text-[8px] text-black leading-tight relative z-10">
            +ADD-ON
          </span>
        ) : (
          <span className="text-[7px] text-black/50 leading-tight relative z-10">
            ไม่ADD-ON
          </span>
        )}
      </div>

      {/* Room name */}
      <div className="bg-linear-to-r from-gray-200 to-gray-300 border-2 border-black rounded-[20px] px-5 h-15 flex-1 flex items-center justify-center relative shadow-inner min-w-0">
        <span className="absolute left-2 top-1 text-xs opacity-20">🐾</span>
        <span className="absolute right-2 bottom-1 text-xs opacity-20">🐾</span>
        <span className="text-sm font-bold text-black text-center truncate">
          ❄ {id}.{name} ❄
        </span>
      </div>

      {/* Players circle */}
      <div className="bg-linear-to-br from-[#2c3e50] to-[#34495e] border-2 border-white rounded-full w-17.5 h-17.5 flex flex-col items-center justify-center text-white relative shrink-0">
        <span className="absolute -top-1.5 -right-1.5 text-sm animate-float">
          💥
        </span>
        <span className="text-[8px] font-bold opacity-70 uppercase">
          Players
        </span>
        <span className="text-base font-bold">
          {players}/{maxPlayers}
        </span>
      </div>

      {/* Status */}
      <div
        className={[
          status === "waiting"
            ? "bg-linear-to-br from-[#ea580c] to-[#dc2626]"
            : "bg-linear-to-br from-[#d97706] to-[#a16207]",
          "border-2 border-black rounded-xl px-4 w-27.5 h-19 flex items-center justify-center relative shrink-0",
          status === "waiting" ? "animate-pulse-custom" : "",
        ].join(" ")}
      >
        <span className="absolute -top-1.5 left-2 text-sm text-yellow-300 animate-pulse-custom">
          ★
        </span>
        <span className="text-xs font-bold text-black italic uppercase tracking-wide">
          {status === "waiting" ? "WAITING" : "PLAYING"}
        </span>
        <span className="absolute -bottom-1.5 right-2 text-sm text-yellow-300 animate-pulse-custom">
          ★
        </span>
      </div>
    </div>
  );
}
