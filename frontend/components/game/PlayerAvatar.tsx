"use client";

import { Player } from "@/types";

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
  myPicture,
  myDisplayName,
  isHost: isHostSeat,
  isCurrentTurn,
  timeLeft,
}: PlayerAvatarProps) {
  const occupied = !!player;
  const color = avatarColors[seat];
  const isMe = !!onLeaveSeat;

  return (
    <div className="flex flex-col items-center gap-1 z-10 w-24">
      {/* Avatar + timer ring */}
      <div className="relative">
        {/* Crown for host */}
        {isHostSeat && occupied && (
          <div
            className="absolute -top-4 left-1/2 z-20 text-lg drop-shadow-md"
            style={{ transform: "translateX(-50%)" }}
          >
            👑
          </div>
        )}

        {/* Turn timer ring (SVG circle) — วงนอก avatar */}
        {isCurrentTurn && (
          <svg
            className="absolute"
            viewBox="0 0 84 84"
            style={{
              width: "84px",
              height: "84px",
              top: "-10px",
              left: "-10px",
              transform: "rotate(-90deg)",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            <circle cx="42" cy="42" r="38" fill="none" stroke="rgba(245,166,35,0.2)" strokeWidth="3" />
            <circle
              cx="42" cy="42" r="38" fill="none"
              stroke={timeLeft && timeLeft <= 10 ? "#ef4444" : "#3b82f6"}
              strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 38}`}
              strokeDashoffset={`${2 * Math.PI * 38 * (1 - (timeLeft ?? 30) / 30)}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
            />
          </svg>
        )}

        {/* Main Avatar Button */}
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
            ((player as any).avatar_url || (player as any).profile_picture || (myPicture && (isMe || player!.display_name === myDisplayName))) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(player as any).avatar_url || (player as any).profile_picture || myPicture!}
                alt={player!.display_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-lg font-black select-none font-bungee" style={{ color }}>
                {player!.display_name?.charAt(0)?.toUpperCase() ?? "?"}
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
      </div>

      {/* Name */}
      <span
        className="text-xs font-bold tracking-wider truncate w-[80px] text-center"
        style={{
          color: occupied ? color : "rgba(80,40,0,0.45)",
          fontFamily: "'Fredoka One', cursive",
          textShadow: occupied ? `0 0 8px ${color}99` : "none",
        }}
      >
        {occupied ? player.display_name : `ที่นั่ง ${seat}`}
      </span>

      {/* Card count badge */}
      {occupied && (
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5"
          style={{
            background: `${color}22`,
            border: `1px solid ${color}66`,
            color,
            fontFamily: "'Fredoka One', cursive",
          }}
        >
          <span>🃏</span>
          <span>{(player as any).hand_count ?? 0}</span>
        </div>
      )}

      {/* Leave seat button */}
      {onLeaveSeat && occupied && (
        <button
          className="mt-1 px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase"
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
