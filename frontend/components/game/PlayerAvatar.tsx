"use client";

import Image from "next/image";
import { Player } from "@/hooks/useRoomSocket";

const avatarColors: Record<number, string> = {
  1: "#e07b39",
  2: "#c0392b",
  3: "#8e44ad",
  4: "#2980b9",
  5: "#27ae60",
};

export interface PlayerAvatarProps {
  seat: number;
  player?: Player;
  onSelect: () => void;
  onLeaveSeat?: () => void;
  isMe?: boolean;
  myPicture?: string | null;
  myDisplayName?: string | null;
  isHost?: boolean;
  isCurrentTurn?: boolean;
  timeLeft?: number;
}

export function PlayerAvatar({
  seat,
  player,
  onSelect,
  onLeaveSeat,
  isMe,
  myPicture,
  myDisplayName,
  isHost: isHostSeat,
  isCurrentTurn,
  timeLeft,
}: PlayerAvatarProps) {
  const occupied = !!player;
  const color = avatarColors[seat];

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Avatar + timer ring */}
      <div className="relative">
        {/* Crown for host */}
        {isHostSeat && occupied && (
          <div
            className="absolute -top-8 left-1/2 z-20 text-lg"
            style={{ transform: "translateX(-50%)", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }}
          >
            👑
          </div>
        )}
        {/* Turn timer ring (SVG circle) */}
        {isCurrentTurn && (
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 72 72"
            style={{ transform: "rotate(-90deg)" }}
          >
            <circle cx="36" cy="36" r="32" fill="none" stroke="rgba(245,166,35,0.15)" strokeWidth="4" />
            <circle
              cx="36" cy="36" r="32" fill="none"
              stroke="#f5a623" strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 32}`}
              strokeDashoffset={`${2 * Math.PI * 32 * (1 - (timeLeft ?? 30) / 30)}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
        )}

        <button
          onClick={onSelect}
          className="relative w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all duration-200 group focus:outline-none hover:scale-110"
          disabled={occupied && !isMe}
          style={{
            borderColor: isCurrentTurn ? "#f5a623" : occupied ? color : "rgba(255,255,255,0.2)",
            background: occupied ? `${color}33` : "rgba(0,0,0,0.3)",
            boxShadow: isCurrentTurn
              ? `0 0 24px #f5a62399`
              : occupied ? `0 0 18px ${color}88` : "none",
          }}
        >
          {/* Avatar image */}
          {occupied ? (
            (player.avatar_url || player.profile_picture || (myPicture && (isMe || player.display_name === myDisplayName))) ? (
              <Image
                src={player.avatar_url || player.profile_picture || myPicture!}
                alt={player.display_name || "Avatar"}
                width={64}
                height={64}
                className="w-full h-full rounded-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-lg font-black select-none" style={{ color }}>
                {player.display_name?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            )
          ) : (
            <span className="text-white/30 text-xl group-hover:text-white/70 transition-colors">+</span>
          )}

          {/* Online dot */}
          {occupied && (
            <span
              className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-[#2a1a0a]"
              style={{ background: "#4ade80" }}
            />
          )}
        </button>

        {/* Timer countdown badge */}
        {isCurrentTurn && (
          <div
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2"
            style={{
              background: "#f5a623",
              borderColor: "#2a1a0a",
              color: "#1a0a02",
              fontFamily: "'Fredoka One',cursive",
            }}
          >
            {timeLeft ?? 30}
          </div>
        )}
      </div>

      {/* Name */}
      <span
        className="text-xs font-bold tracking-wider"
        style={{
          color: occupied ? color : "rgba(80,40,0,0.45)",
          fontFamily: "'Fredoka One', cursive",
          textShadow: occupied ? `0 0 8px ${color}99` : "none",
          maxWidth: "80px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {occupied ? player.display_name : `ที่นั่ง ${seat}`}
      </span>

      {/* Card count badge */}
      {occupied && (
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{
            background: `${color}22`,
            border: `1px solid ${color}66`,
            color,
            fontFamily: "'Fredoka One', cursive",
          }}
        >
          <span>🃏</span>
          <span>{player.hand_count ?? 0} cards</span>
        </div>
      )}

      {/* Leave seat button — shown when onLeaveSeat is provided (= this is my seat) */}
      {onLeaveSeat && occupied && (
        <button
          className="mt-0.5 px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase"
          style={{
            background: "rgba(180,30,10,0.18)",
            border: "2px solid rgba(180,30,10,0.55)",
            color: "#b91c1c",
            fontFamily: "'Fredoka One',cursive",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(180,30,10,0.35)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(180,30,10,0.18)";
          }}
          onClick={() => onLeaveSeat()}
        >
          🚪 ลุกจากที่นั่ง
        </button>
      )}
    </div>
  );
}
