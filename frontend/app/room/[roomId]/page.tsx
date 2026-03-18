"use client";

import { useRoomSocket, Player } from "@/hooks/useRoomSocket";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import { GameBoard } from "@/components/game/GameBoard";
import { PlayerHand } from "@/components/game/PlayerHand";

// ── RoomPage ──────────────────────────────────────────────────────────────────
export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { roomData, selectSeat, startGame, drawCard, myCards, gameLogs } = useRoomSocket(roomId);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsMounted(true), 0);
  }, []);

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
  const mySessionId = isMounted ? localStorage.getItem("session_id") : null;
  const myPlayerToken = isMounted ? localStorage.getItem("player_token") : null;
  const myProfilePicture = isMounted ? localStorage.getItem("profile_picture") : null;
  const myDisplayName = isMounted ? localStorage.getItem("display_name") : null;

  // เช็คว่าที่นั่งนั้นเป็นของเราหรือเปล่า
  const isMySeat = (seat: number): boolean => {
    const p = getPlayerAtSeat(seat);
    if (!p) return false;
    if (myPlayer && p.player_id === myPlayer.player_id) return true;
    if (mySessionId && p.session_id === mySessionId) return true;
    if (myPlayerToken && p.player_token === myPlayerToken) return true;
    if (p.role === "ME") return true;
    return false;
  };


  // เช็ค host จาก host_token ใน roomData เทียบกับ player_token ใน localStorage
  const isHost = !!myPlayerToken && myPlayerToken === roomData.host_token;
  const currentTurnSeat: number | null = roomData.current_turn_seat ?? null;

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
                background: ["playing","PLAYING"].includes(roomData.status)
                  ? "linear-gradient(135deg, #4ade80, #16a34a)"
                  : "linear-gradient(135deg, #f5a623, #d45f00)",
                color: "#fff",
                boxShadow: ["playing","PLAYING"].includes(roomData.status)
                  ? "0 3px 0 #14532d"
                  : "0 3px 0 #7a2f00",
              }}
            >
              {["playing","PLAYING"].includes(roomData.status) ? "🎮 Playing" : "⏳ Waiting"}
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
                {roomData.deck_name ?? "Standard Deck"}
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
        <GameBoard
          roomData={roomData}
          myProfilePicture={myProfilePicture}
          myDisplayName={myDisplayName}
          currentTurnSeat={currentTurnSeat}
          selectSeat={selectSeat}
          drawCard={drawCard}
          isMySeat={isMySeat}
          gameLogs={gameLogs}
        />
        
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
              {myProfilePicture || (myPlayer && myPlayer?.avatar_url) ? (
                <Image src={myProfilePicture || myPlayer?.avatar_url || ""} alt={myPlayer?.display_name || "Avatar"} width={80} height={80} className="w-full h-full object-cover rounded-full" unoptimized />
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
          <PlayerHand myCards={myCards} status={roomData.status} />

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