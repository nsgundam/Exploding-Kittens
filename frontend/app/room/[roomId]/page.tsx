"use client";

import { useRoomSocket, Player } from "@/hooks/useRoomSocket";
import { useParams } from "next/navigation";

const avatarColors: Record<number, string> = {
  1: "#e07b39",
  2: "#c0392b",
  3: "#8e44ad",
  4: "#2980b9",
  5: "#27ae60",
};

// ── PlayerSlot ────────────────────────────────────────────────────────────────
function PlayerSlot({
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
}: {
  seat: number;
  player?: Player;
  onSelect: () => void;
  onLeaveSeat?: () => void;
  isMe?: boolean;
  myPicture?: string | null;
  myDisplayName?: string | null;
  isHost?: boolean; // แสดงมงกุฎถ้าเป็น host
  isCurrentTurn?: boolean;
  timeLeft?: number;
}) {
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
            ((player as any).avatar_url || (player as any).profile_picture || (myPicture && (isMe || player!.display_name === myDisplayName))) ? (
              <img
                src={(player as any).avatar_url || (player as any).profile_picture || myPicture!}
                alt={player!.display_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-lg font-black select-none" style={{ color }}>
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
        {occupied ? player!.display_name : `ที่นั่ง ${seat}`}
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
          <span>{(player as any).hand_count ?? 0} cards</span>
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

// ── RoomPage ──────────────────────────────────────────────────────────────────
export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { roomData, isConnected, selectSeat, startGame, drawCard, myCards, gameLogs } = useRoomSocket(roomId);

  if (!roomData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "radial-gradient(ellipse at center, #3d1f0a 0%, #1a0d04 100%)",
          fontFamily: "'Fredoka One', cursive",
        }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">💣</div>
          <p className="text-[#f5a623] text-xl tracking-widest animate-pulse">
            กำลังเชื่อมต่อห้อง {roomId}…
          </p>
        </div>
      </div>
    );
  }

  const getPlayerAtSeat = (seat: number) =>
    roomData.players.find(
      (p: Player) => p.seat_number === seat
    );

  const myPlayer = roomData.players.find((p: Player) => p.role === "ME");
  const mySessionId = typeof window !== "undefined" ? localStorage.getItem("session_id") : null;
  const myPlayerToken = typeof window !== "undefined" ? localStorage.getItem("player_token") : null;
  const myProfilePicture = typeof window !== "undefined" ? localStorage.getItem("profile_picture") : null;
  const myDisplayName = typeof window !== "undefined" ? localStorage.getItem("display_name") : null;

  // เช็คว่าที่นั่งนั้นเป็นของเราหรือเปล่า
  const isMySeat = (seat: number): boolean => {
    const p = getPlayerAtSeat(seat) as any;
    if (!p) return false;
    if (myPlayer && p.player_id === myPlayer.player_id) return true;
    if (mySessionId && p.session_id === mySessionId) return true;
    if (myPlayerToken && p.player_token === myPlayerToken) return true;
    if (p.role === "ME") return true;
    return false;
  };


  // Map card_code → emoji, label, color
  const CARD_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
    DF:         { emoji: "🛡️",  label: "DEFUSE",      color: "#4ade80" },
    GVE_DF:     { emoji: "🛡️",  label: "DEFUSE",      color: "#4ade80" },
    EK:         { emoji: "💣",  label: "EK",           color: "#ef4444" },
    GVE_EK:     { emoji: "💣",  label: "EK",           color: "#ef4444" },
    AT:         { emoji: "⚡",  label: "ATTACK",       color: "#f97316" },
    SK:         { emoji: "⏭️",  label: "SKIP",         color: "#3b82f6" },
    SHF:        { emoji: "🔀",  label: "SHUFFLE",      color: "#8b5cf6" },
    FV:         { emoji: "🔭",  label: "SEE FUTURE",   color: "#06b6d4" },
    NP:         { emoji: "🚫",  label: "NOPE",         color: "#dc2626" },
    CAT_TACO:   { emoji: "🌮",  label: "TACO CAT",     color: "#f59e0b" },
    CAT_BEARD:  { emoji: "🐱",  label: "BEARD CAT",    color: "#a78bfa" },
    CAT_MELO:   { emoji: "🍉",  label: "CATTER MELON", color: "#34d399" },
    CAT_POTATO: { emoji: "🥔",  label: "POTATO CAT",   color: "#fbbf24" },
    CAT_RC:     { emoji: "🚀",  label: "RAINBOW CAT",  color: "#f472b6" },
    SF:         { emoji: "🔮",  label: "SEE FUTURE",   color: "#06b6d4" },
    DR:         { emoji: "🎲",  label: "DRAW",         color: "#84cc16" },
    IK:         { emoji: "💥",  label: "IMPLODING",    color: "#ef4444" },
  };

  // เช็ค host จาก host_token ใน roomData เทียบกับ player_token ใน localStorage
  const isHost = !!myPlayerToken && myPlayerToken === (roomData as any).host_token;
  const currentTurnSeat: number | null = (roomData as any).current_turn_seat ?? null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@700;900&display=swap');

        @keyframes floatUp {
          0%,100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-8px) rotate(2deg); }
        }
        @keyframes glow {
          0%,100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .float { animation: floatUp 4s ease-in-out infinite; }
        .glow  { animation: glow 2s ease-in-out infinite; }

        .card-shadow {
          box-shadow: 4px 4px 0 rgba(0,0,0,0.5), 8px 8px 20px rgba(0,0,0,0.4);
        }
        .btn-red {
          background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
          box-shadow: 0 4px 0 #7b241c, 0 6px 12px rgba(0,0,0,0.4);
          transition: all 0.1s;
        }
        .btn-red:hover  { transform: translateY(-2px); }
        .btn-red:active { transform: translateY(2px); }
      `}</style>

      <div
        className="min-h-screen w-full overflow-hidden flex flex-col"
        style={{
          backgroundImage: "url('/images/cat.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          fontFamily: "'Fredoka One', cursive",
        }}
      >
        {/* ── HEADER ───────────────────────────────────────────────────── */}
        <header
          className="flex items-center justify-between px-5 py-4 relative z-10"
          style={{
            background: "transparent",
            borderBottom: "1px solid rgba(150,100,20,0.2)",
          }}
        >
          {/* Left: Leave button */}
          <div className="flex-1 flex items-center">
            <a
              href="/Lobby"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black tracking-wider uppercase transition-all duration-150"
              style={{
                fontFamily: "'Fredoka One', cursive",
                background: "linear-gradient(135deg, #c0392b 0%, #922b21 100%)",
                border: "none",
                color: "#fff",
                boxShadow: "0 4px 0 #641e16, 0 6px 12px rgba(0,0,0,0.3)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 6px 0 #641e16, 0 8px 16px rgba(0,0,0,0.4)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 0 #641e16, 0 6px 12px rgba(0,0,0,0.3)";
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(2px)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 0 #641e16";
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
              }}
            >
              ← ออกจากห้อง
            </a>
          </div>

          {/* Center: Room info — absolute center */}
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5" style={{ top: "8%" }}>
            <div
              className="text-xs tracking-[0.25em] uppercase"
              style={{ color: "rgba(100,50,0,0.7)" }}
            >
              ห้องเกม
            </div>
            <div
              className="text-2xl leading-none tracking-wide"
              style={{
                color: "#3d1a00",
                textShadow: "0 1px 0 rgba(255,255,255,0.4)",
              }}
            >
              {roomData.room_name}
            </div>
            <div
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(120,60,0,0.15)",
                border: "1px solid rgba(120,60,0,0.35)",
                color: "#7a4000",
                letterSpacing: "0.15em",
              }}
            >
              #{roomId}
            </div>
          </div>

          {/* Right: Status + Deck name + Settings (host only) */}
          <div className="flex-1 flex items-center justify-end gap-3">
            {/* Status badge */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black tracking-wider uppercase"
              style={{
                fontFamily: "'Fredoka One', cursive",
                background: ["playing","PLAYING"].includes((roomData as any).status)
                  ? "linear-gradient(135deg, #4ade80, #16a34a)"
                  : "linear-gradient(135deg, #f5a623, #d45f00)",
                color: "#fff",
                boxShadow: ["playing","PLAYING"].includes((roomData as any).status)
                  ? "0 3px 0 #14532d"
                  : "0 3px 0 #7a2f00",
              }}
            >
              {["playing","PLAYING"].includes((roomData as any).status) ? "🎮 Playing" : "⏳ Waiting"}
            </div>

            {/* Deck/Add-on badge */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
              style={{
                background: "rgba(120,70,10,0.18)",
                border: "1px solid rgba(120,70,10,0.5)",
                color: "#5c2d00",
              }}
            >
              <span>🃏</span>
              <span style={{ fontFamily: "'Fredoka One',cursive" }}>
                {(roomData as any).deck_name ?? "Standard Deck"}
              </span>
            </div>

            {/* Settings — host only */}
            {isHost && (
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{
                  background: "rgba(120,70,10,0.18)",
                  border: "2px solid rgba(120,70,10,0.45)",
                  color: "#5c2d00",
                }}
              >
                ⚙️
              </button>
            )}
          </div>
        </header>

        {/* ── MAIN GAME AREA ───────────────────────────────────────────── */}
        <main className="flex-1 flex items-center justify-center px-6 py-4 relative">
          <div className="absolute left-2 top-1/4 text-5xl opacity-5 float" style={{ animationDelay: "1s" }}>🐱</div>
          <div className="absolute right-2 bottom-1/4 text-5xl opacity-5 float" style={{ animationDelay: "2s" }}>💥</div>

          {/* ── LOG PANEL — แสดงเฉพาะตอน playing ── */}
          {["playing","PLAYING"].includes((roomData as any).status) && gameLogs.length > 0 && (
          <div
            className="absolute left-3 top-1/2 flex flex-col z-20"
            style={{ transform: "translateY(-50%)", width: "240px" }}
          >
            <div
              className="rounded-2xl px-3 py-3 flex flex-col gap-1.5"
              style={{
                background: "rgba(240,220,170,0.72)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                border: "1px solid rgba(120,70,10,0.45)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
                maxHeight: "220px",
                overflowY: "auto",
              }}
            >
              <div
                className="text-[10px] uppercase tracking-widest mb-1 pb-1 font-bold"
                style={{
                  color: "rgba(120,60,0,0.85)",
                  borderBottom: "1px solid rgba(120,60,0,0.2)",
                }}
              >
                📋 Game Log
              </div>
              {gameLogs.slice(-7).map((log: string, i: number, arr) => (
                <div
                  key={i}
                  className="text-xs leading-snug"
                  style={{
                    color: i === arr.length - 1
                      ? "rgba(60,30,0,0.95)"
                      : `rgba(80,40,0,${0.4 + i * 0.12})`,
                  }}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
          )}

          {/* ── BOARD LAYOUT — players around the oval table in bg image ── */}
          {/* Table approx center: 50% x 48%, oval ~700px wide, ~340px tall */}
          <div className="w-full relative" style={{ height: "520px" }}>

            {/* P5 — top center of oval */}
            <div className="absolute flex justify-center" style={{ left: "50%", top: "-8%", transform: "translateX(-50%)" }}>
              <PlayerSlot
                seat={5}
                player={getPlayerAtSeat(5)}
                onSelect={() => selectSeat(5)}
                onLeaveSeat={isMySeat(5) ? () => selectSeat(-1) : undefined}
                myPicture={myProfilePicture}
                myDisplayName={myDisplayName}
                isHost={!!(roomData as any).host_token && (getPlayerAtSeat(5) as any)?.player_token === (roomData as any).host_token}
                isCurrentTurn={currentTurnSeat === 5}
                timeLeft={(roomData as any).time_left}
              />
            </div>

            {/* P1 — left top of oval */}
            <div className="absolute flex justify-center" style={{ left: "17%", top: "20%" }}>
              <PlayerSlot
                seat={1}
                player={getPlayerAtSeat(1)}
                onSelect={() => selectSeat(1)}
                onLeaveSeat={isMySeat(1) ? () => selectSeat(-1) : undefined}
                myPicture={myProfilePicture}
                myDisplayName={myDisplayName}
                isHost={!!(roomData as any).host_token && (getPlayerAtSeat(1) as any)?.player_token === (roomData as any).host_token}
                isCurrentTurn={currentTurnSeat === 1}
                timeLeft={(roomData as any).time_left}
              />
            </div>

            {/* P2 — left bottom of oval */}
            <div className="absolute flex justify-center" style={{ left: "17%", top: "68%" }}>
              <PlayerSlot
                seat={2}
                player={getPlayerAtSeat(2)}
                onSelect={() => selectSeat(2)}
                onLeaveSeat={isMySeat(2) ? () => selectSeat(-1) : undefined}
                myPicture={myProfilePicture}
                myDisplayName={myDisplayName}
                isHost={!!(roomData as any).host_token && (getPlayerAtSeat(2) as any)?.player_token === (roomData as any).host_token}
                isCurrentTurn={currentTurnSeat === 2}
                timeLeft={(roomData as any).time_left}
              />
            </div>

            {/* DECK + PLAY CARD — center of oval — แสดงเฉพาะตอน playing */}
            {["playing","PLAYING"].includes((roomData as any).status) && (
            <div className="absolute flex items-center justify-center gap-10" style={{ left: "50%", top: "54.5%", transform: "translate(-50%,-50%)" }}>
              {/* DECK */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
                  style={{
                    background: "rgba(100,50,0,0.35)",
                    border: "1px solid rgba(150,90,0,0.6)",
                    color: "#fff8f0",
                    fontFamily: "'Fredoka One',cursive",
                  }}
                >
                  💣 <span>{(roomData as any).deck_count ?? 56} ใบ</span>
                </div>
                <div
                  className="relative w-28 h-40 rounded-xl card-shadow cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                  title="จั่วไพ่"
                  onClick={() => drawCard()}
                  style={{
                    background: "linear-gradient(135deg, #8b4a1a, #5c2d0a)",
                    border: "3px solid #c47a3a",
                  }}
                >
                  <div
                    className="absolute inset-1 rounded-lg opacity-30"
                    style={{
                      backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)",
                      backgroundSize: "6px 6px",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-5xl">💣</div>
                  <div className="absolute bottom-2 inset-x-0 flex justify-center">
                    <span className="text-[9px] tracking-wider" style={{ color: "rgba(245,166,35,0.8)" }}>TAP TO DRAW</span>
                  </div>
                </div>
                <span className="text-xs tracking-widest uppercase font-bold" style={{ color: "#fff8f0", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                  DECK
                </span>
              </div>

              {/* Arrow */}
              <div className="text-4xl" style={{ color: "rgba(255,240,200,0.7)" }}>⟳</div>

              {/* PLAY CARD ZONE */}
              <div className="flex flex-col items-center gap-2">
                <div className="h-7" />
                <div
                  className="w-28 h-40 rounded-xl flex items-center justify-center"
                  style={{
                    border: "2px dashed rgba(255,220,150,0.5)",
                    background: "rgba(0,0,0,0.15)",
                  }}
                >
                  <span className="text-sm text-center leading-tight px-2" style={{ color: "rgba(255,240,200,0.4)" }}>
                    PLAY<br />CARD
                  </span>
                </div>
                <span className="text-xs tracking-widest uppercase font-bold" style={{ color: "rgba(255,240,200,0.6)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                  PLAY CARD
                </span>
              </div>
            </div>
            )}

            {/* P4 — right top of oval */}
            <div className="absolute flex justify-center" style={{ right: "16%", top: "20%" }}>
              <PlayerSlot
                seat={4}
                player={getPlayerAtSeat(4)}
                onSelect={() => selectSeat(4)}
                onLeaveSeat={isMySeat(4) ? () => selectSeat(-1) : undefined}
                myPicture={myProfilePicture}
                myDisplayName={myDisplayName}
                isHost={!!(roomData as any).host_token && (getPlayerAtSeat(4) as any)?.player_token === (roomData as any).host_token}
                isCurrentTurn={currentTurnSeat === 4}
                timeLeft={(roomData as any).time_left}
              />
            </div>

            {/* P3 — right bottom of oval */}
            <div className="absolute flex justify-center" style={{ right: "16%", top: "68%" }}>
              <PlayerSlot
                seat={3}
                player={getPlayerAtSeat(3)}
                onSelect={() => selectSeat(3)}
                onLeaveSeat={isMySeat(3) ? () => selectSeat(-1) : undefined}
                myPicture={myProfilePicture}
                myDisplayName={myDisplayName}
                isHost={!!(roomData as any).host_token && (getPlayerAtSeat(3) as any)?.player_token === (roomData as any).host_token}
                isCurrentTurn={currentTurnSeat === 3}
                timeLeft={(roomData as any).time_left}
              />
            </div>
          </div>
        </main>

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <footer
          className="px-6 py-4 flex items-end justify-between gap-4"
          style={{
            background: "transparent",
            borderTop: "1px solid rgba(150,100,20,0.25)",
          }}
        >
          {/* My profile */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl border-4"
              style={{
                borderColor: "#f5a623",
                background: "#f5a62322",
                boxShadow: "0 0 16px #f5a62366",
              }}
            >
              {myProfilePicture || (myPlayer && (myPlayer as any).avatar_url) ? (
                <img src={myProfilePicture || (myPlayer as any).avatar_url} alt={myPlayer?.display_name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-lg font-black" style={{ color: "#f5a623" }}>
                  {myPlayer?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider" style={{color:"#7a4000"}}>My Profile</div>
              <div className="text-lg leading-tight font-bold" style={{color:"#3d1a00"}}>
                {myDisplayName || myPlayer?.display_name || "USER"}
              </div>
              <div className="text-xs" style={{color:"#7a4000"}}>
                {myCards.length} cards left
              </div>
            </div>
          </div>

          {/* Hand cards — แสดงเฉพาะตอน playing */}
          {["playing","PLAYING"].includes((roomData as any).status) && (
          <div className="flex items-end flex-1 justify-center">
            {myCards.map((cardCode, i) => {
              const cfg = CARD_CONFIG[cardCode] ?? { emoji: "🃏", label: cardCode, color: "#f5a623" };
              return (
              <div
                key={i}
                className="relative w-24 h-36 rounded-xl cursor-pointer transition-all duration-200 card-shadow"
                style={{
                  background: `linear-gradient(160deg, ${cfg.color}33, #1a0a02)`,
                  border: `2px solid ${cfg.color}88`,
                  transform: `rotate(${(i - 2) * 5}deg) translateY(${Math.abs(i - 2) * 4}px)`,
                  marginLeft: i === 0 ? 0 : "-16px",
                  zIndex: i === Math.floor(myCards.length/2) ? 5 : i,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = `rotate(0deg) translateY(-24px) scale(1.12)`;
                  (e.currentTarget as HTMLElement).style.zIndex = "10";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = `rotate(${(i - 2) * 5}deg) translateY(${Math.abs(i - 2) * 4}px)`;
                  (e.currentTarget as HTMLElement).style.zIndex = String(i === Math.floor(myCards.length/2) ? 5 : i);
                }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2">
                  <span className="text-4xl">{cfg.emoji}</span>
                  <span
                    className="text-xs font-black tracking-wider text-center leading-none"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                </div>
              </div>
              );
            })}
          </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 shrink-0">
            {/* Start game — host only */}
            {isHost && (
              <button
                className="px-6 py-2 rounded-xl text-white font-black tracking-wider text-sm uppercase drop-shadow-lg"
                style={{
                  fontFamily: "'Fredoka One', cursive",
                  background: "linear-gradient(135deg, #4ade80 0%, #16a34a 100%)",
                  boxShadow: "0 4px 0 #14532d, 0 6px 12px rgba(0,0,0,0.4)",
                  transition: "all 0.1s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 0 #14532d, 0 8px 16px rgba(0,0,0,0.5)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 0 #14532d, 0 6px 12px rgba(0,0,0,0.4)";
                }}
                onMouseDown={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(2px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 0 #14532d";
                }}
                onMouseUp={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                }}
              onClick={() => startGame?.()}
              >
                🚀 เริ่มเกม
              </button>
            )}
          </div>
        </footer>
      </div>
    </>
  );
}