"use client";

import Image from "next/image";

interface RoomCardProps {
  id: string;
  name: string;
  deck: number;
  addon: boolean;
  players: number;
  maxPlayers: number;
  status: "waiting" | "playing";
  cardVersion?: string;
  onClick: () => void;
}

export default function RoomCard({
  id,
  name,
  addon,
  players,
  maxPlayers,
  status,
  cardVersion,
  onClick,
}: RoomCardProps) {
  const isClickable = status === "waiting";
  const isGoodEvil = cardVersion === "Good vs. Evil";
  const deckImage = isGoodEvil ? "/images/Goodandevil.png" : "/images/Nuke.png";

  return (
    <div
      className={[
        "border-2 border-black rounded-3xl bg-[#FAF2DF]",
        "px-4 py-4 flex items-center gap-4 shrink-0",
        "transition-all duration-300 animate-slide-in",
        "shadow-[0_4px_16px_rgba(0,0,0,0.1)]",
        isClickable
          ? "cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(180,120,60,0.3)] hover:border-orange-400/60"
          : "opacity-60 cursor-not-allowed grayscale-50",
      ].join(" ")}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Deck badge — รูปภาพ */}
      <div className="rounded-2xl w-20 h-20 shrink-0 relative overflow-hidden shadow-md border-2 border-[#d4b896]/50">
        <Image
          src={deckImage}
          alt={isGoodEvil ? "Good and Evil" : "Original"}
          width={300}
          height={300}
          className="w-full h-full object-cover scale-110"
        />
        {addon && (
          <span className="absolute bottom-0.5 right-0 font-bold text-[15px] text-white/90 leading-tight drop-shadow">
            +ADD
          </span>
        )}
      </div>

      {/* Room name + Players */}
      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
        <span className="text-base font-black text-[#3d1a00] truncate">
          {name}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">👥</span>
          <span className="text-xs font-bold text-[#8b5e3c]">
            {players}/{maxPlayers} Players
          </span>
        </div>
      </div>

      {/* Status */}
      <div
        className={[
          status === "waiting"
            ? "bg-linear-to-br from-[#ea580c] to-[#dc2626]"
            : "bg-linear-to-br from-[#d97706] to-[#a16207]",
          "border-2 border-black/20 rounded-xl px-4 w-28 h-14 flex items-center justify-center relative shrink-0",
          status === "waiting" ? "animate-pulse" : "",
        ].join(" ")}
      >
        <span className="text-md font-bold text-white italic uppercase tracking-wide">
          {status === "waiting" ? "WAITING" : "PLAYING"}
        </span>
      </div>
    </div>
  );
}
