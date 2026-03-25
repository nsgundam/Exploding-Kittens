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
  // Favor
  isFavorTargetMode?: boolean; // gamePhase === "FAVOR_SELECT_TARGET"
  isMe?: boolean;              // ตัวเอง → ห้ามเลือก
  onFavorSelect?: () => void;  // กดเลือกเป็น target
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
  isFavorTargetMode,
  isMe,
  onFavorSelect,
}: PlayerAvatarProps) {
  const occupied = !!player;
  const color = avatarColors[seat];
  const isDead = occupied && player?.is_alive === false;
  const afkCount = player?.afk_count ?? 0;
  const isAfk = occupied && !isDead && afkCount >= 1;
  const isDisconnected = occupied && !isDead && afkCount >= 2;

  // Favor target mode — เฉพาะ player ที่ alive และไม่ใช่ตัวเอง
  const isValidFavorTarget = isFavorTargetMode && occupied && !isDead && !isMe;

  const handleClick = () => {
    if (isValidFavorTarget && onFavorSelect) {
      onFavorSelect();
      return;
    }
    onSelect();
  };

  return (
    <div className="flex flex-col items-center gap-1 z-10 w-24">
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

        {/* Favor target frame — กรอบ target แทน emoji */}
        {isValidFavorTarget && (
          <>
            {/* outer pulsing ring */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: "-8px",
                border: "2.5px solid #ef4444",
                borderRadius: "9999px",
                boxShadow: "0 0 12px #ef444466, inset 0 0 8px #ef444422",
                animation: "pulse 1.2s ease-in-out infinite",
              }}
            />
            {/* crosshair lines — top */}
            <div className="absolute pointer-events-none" style={{ top: "-14px", left: "50%", transform: "translateX(-50%)", width: "2px", height: "10px", background: "#ef4444", borderRadius: "1px" }} />
            {/* crosshair lines — bottom */}
            <div className="absolute pointer-events-none" style={{ bottom: "-14px", left: "50%", transform: "translateX(-50%)", width: "2px", height: "10px", background: "#ef4444", borderRadius: "1px" }} />
            {/* crosshair lines — left */}
            <div className="absolute pointer-events-none" style={{ left: "-14px", top: "50%", transform: "translateY(-50%)", width: "10px", height: "2px", background: "#ef4444", borderRadius: "1px" }} />
            {/* crosshair lines — right */}
            <div className="absolute pointer-events-none" style={{ right: "-14px", top: "50%", transform: "translateY(-50%)", width: "10px", height: "2px", background: "#ef4444", borderRadius: "1px" }} />
            {/* corner brackets — top left */}
            <div className="absolute pointer-events-none" style={{ top: "-6px", left: "-6px", width: "10px", height: "10px", borderTop: "2.5px solid #ef4444", borderLeft: "2.5px solid #ef4444", borderRadius: "2px 0 0 0" }} />
            {/* corner brackets — top right */}
            <div className="absolute pointer-events-none" style={{ top: "-6px", right: "-6px", width: "10px", height: "10px", borderTop: "2.5px solid #ef4444", borderRight: "2.5px solid #ef4444", borderRadius: "0 2px 0 0" }} />
            {/* corner brackets — bottom left */}
            <div className="absolute pointer-events-none" style={{ bottom: "-6px", left: "-6px", width: "10px", height: "10px", borderBottom: "2.5px solid #ef4444", borderLeft: "2.5px solid #ef4444", borderRadius: "0 0 0 2px" }} />
            {/* corner brackets — bottom right */}
            <div className="absolute pointer-events-none" style={{ bottom: "-6px", right: "-6px", width: "10px", height: "10px", borderBottom: "2.5px solid #ef4444", borderRight: "2.5px solid #ef4444", borderRadius: "0 0 2px 0" }} />
          </>
        )}

        {/* Turn timer ring */}
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
          onClick={handleClick}
          className="relative w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all duration-200 group focus:outline-none hover:scale-110"
          disabled={occupied && !isMe && !isValidFavorTarget}
          style={{
            borderColor: isValidFavorTarget
              ? "#ef4444"
              : isDead
                ? "#6b7280"
                : isCurrentTurn
                  ? "#f5a623"
                  : occupied
                    ? color
                    : "rgba(255,255,255,0.2)",
            background: isValidFavorTarget
              ? "rgba(239,68,68,0.15)"
              : isDead
                ? "rgba(0,0,0,0.5)"
                : occupied
                  ? `${color}33`
                  : "rgba(0,0,0,0.3)",
            boxShadow: isValidFavorTarget
              ? "0 0 24px #ef444466"
              : isDead
                ? "none"
                : isCurrentTurn
                  ? `0 0 24px #f5a62399`
                  : occupied
                    ? `0 0 18px ${color}88`
                    : "none",
            opacity: isDead ? 0.5 : 1,
            filter: isDead ? "grayscale(100%)" : "none",
            cursor: isValidFavorTarget ? "crosshair" : undefined,
          }}
        >
          {/* Dead overlay */}
          {isDead && (
            <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 z-10">
              <span className="text-2xl">💀</span>
            </div>
          )}

          {/* AFK / Disconnect overlay */}
          {isDisconnected && !isValidFavorTarget && (
            <div className="absolute inset-0 rounded-full flex items-center justify-center z-10" style={{ background: "rgba(220,38,38,0.55)" }}>
              <span className="text-2xl">📵</span>
            </div>
          )}

          {/* Avatar image */}
          {occupied ? (
            player!.avatar_url || player!.profile_picture || (myPicture && (isMe || player!.display_name === myDisplayName)) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player!.avatar_url || player!.profile_picture || myPicture!}
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
              style={{ background: isDisconnected ? "#dc2626" : isAfk ? "#f59e0b" : "#4ade80" }}
            />
          )}
        </button>
      </div>

      {/* Name */}
      <span
        className="text-xs font-bold tracking-wider truncate w-20 text-center"
        style={{
          color: isValidFavorTarget ? "#ef4444" : occupied ? color : "rgba(80,40,0,0.45)",
          fontFamily: "'Fredoka One', cursive",
          textShadow: occupied ? `0 0 8px ${isValidFavorTarget ? "#ef444499" : `${color}99`}` : "none",
        }}
      >
        {occupied ? player.display_name : `ที่นั่ง ${seat}`}
      </span>

      {/* Favor hint text */}
      {isValidFavorTarget && (
        <span className="text-[9px] font-bold tracking-wider text-red-400 animate-pulse">
          กดเพื่อเลือก
        </span>
      )}

      {/* Card count badge */}
      {occupied && !isValidFavorTarget && (
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
          <span>{player!.hand_count ?? 0}</span>
        </div>
      )}

      {/* Leave seat button */}
      {onLeaveSeat && occupied && !isFavorTargetMode && (
        <button
          className="mt-1 px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase"
          style={{
            background: "rgba(180,30,10,0.18)",
            border: "2px solid rgba(180,30,10,0.55)",
            color: "#b91c1c",
            fontFamily: "'Fredoka One',cursive",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(180,30,10,0.35)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(180,30,10,0.18)"; }}
          onClick={() => onLeaveSeat()}
        >
          🚪 ลุกจากที่นั่ง
        </button>
      )}
    </div>
  );
}