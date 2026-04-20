"use client";

import { Player } from "@/types";
import { resolveAvatarSrc } from "@/lib/avatar";

interface FavorTargetModalProps {
  isOpen: boolean;
  players: Player[];
  myPlayerToken: string | null;
  onSelectTarget: (targetPlayer: Player) => void;
  onCancel: () => void;
}

const avatarColors: Record<number, string> = {
  1: "#e07b39",
  2: "#c0392b",
  3: "#8e44ad",
  4: "#2980b9",
  5: "#27ae60",
};

export function FavorTargetModal({
  isOpen,
  players,
  myPlayerToken,
  onSelectTarget,
  onCancel,
}: FavorTargetModalProps) {
  if (!isOpen) return null;

  // แสดงเฉพาะผู้เล่นที่ alive และไม่ใช่ตัวเอง
  const targets = players.filter(
    (p) => p.player_token !== myPlayerToken && p.is_alive !== false && p.seat_number !== null
  );

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 flex flex-col items-center gap-5 p-7 rounded-3xl"
        style={{
          width: "min(460px, calc(100vw - 2rem))",
          maxHeight: "calc(100dvh - 2rem)",
          overflowY: "auto",
          background: "linear-gradient(160deg, #1a0a00 0%, #0d0500 100%)",
          border: "2px solid rgba(245,166,35,0.5)",
          boxShadow: "0 0 60px rgba(245,166,35,0.2), 0 24px 60px rgba(0,0,0,0.9)",
          fontFamily: "'Fredoka One', cursive",
        }}
      >
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">🤝</div>
          <h2
            className="text-2xl font-black text-white tracking-wide"
            style={{ textShadow: "0 0 20px rgba(245,166,35,0.6)" }}
          >
            เลือกผู้เล่นที่จะขโมยการ์ด
          </h2>
          <p className="text-sm mt-1" style={{ color: "rgba(245,166,35,0.6)" }}>
            FAVOR — เลือก 1 คน
          </p>
        </div>

        {/* Player list */}
        <div className="flex flex-wrap justify-center gap-4 w-full">
          {targets.map((player) => {
            const color = avatarColors[player.seat_number ?? 1] ?? "#f5a623";
            const avatarSrc = resolveAvatarSrc(player.avatar_url || player.profile_picture);
            return (
              <button
                key={player.player_id}
                onClick={() => onSelectTarget(player)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:scale-105 active:scale-95"
                style={{
                  background: `${color}22`,
                  border: `2px solid ${color}66`,
                  boxShadow: `0 0 16px ${color}33`,
                  minWidth: "100px",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `${color}44`;
                  (e.currentTarget as HTMLElement).style.border = `2px solid ${color}`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${color}66`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `${color}22`;
                  (e.currentTarget as HTMLElement).style.border = `2px solid ${color}66`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${color}33`;
                }}
              >
                {/* Avatar */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center border-4 text-2xl font-black"
                  style={{
                    borderColor: color,
                    background: `${color}33`,
                    color,
                  }}
                >
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarSrc}
                      alt={player.display_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    player.display_name.charAt(0).toUpperCase()
                  )}
                </div>
                {/* Name */}
                <span className="text-sm font-black text-white text-center leading-tight max-w-[90px] truncate">
                  {player.display_name}
                </span>
                {/* Card count */}
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background: `${color}22`,
                    border: `1px solid ${color}66`,
                    color,
                  }}
                >
                  🃏 {player.hand_count ?? 0}
                </div>
              </button>
            );
          })}
        </div>

        {/* Cancel */}
        <button
          onClick={onCancel}
          className="w-full py-3 rounded-2xl font-black text-sm tracking-wider uppercase transition-all hover:scale-[1.02] active:scale-95"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
