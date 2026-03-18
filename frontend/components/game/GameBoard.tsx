"use client";

import { Player } from "@/hooks/useRoomSocket";
import { PlayerAvatar } from "./PlayerAvatar";

export interface GameBoardProps {
  roomData: any; // Type accurately mapped to Room schema in actual usage
  myProfilePicture: string | null;
  myDisplayName: string | null;
  currentTurnSeat: number | null;
  selectSeat: (seat_number: number) => void;
  drawCard: () => void;
  isMySeat: (seat: number) => boolean;
  gameLogs: string[];
}

export function GameBoard({
  roomData,
  myProfilePicture,
  myDisplayName,
  currentTurnSeat,
  selectSeat,
  drawCard,
  isMySeat,
  gameLogs
}: GameBoardProps) {

  const getPlayerAtSeat = (seat: number) =>
    roomData.players.find((p: Player) => p.seat_number === seat);

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-4 relative">
      <div className="absolute left-2 top-1/4 text-5xl opacity-5 float" style={{ animationDelay: "1s" }}>🐱</div>
      <div className="absolute right-2 bottom-1/4 text-5xl opacity-5 float" style={{ animationDelay: "2s" }}>💥</div>

      {/* ── LOG PANEL — แสดงเฉพาะตอน playing ── */}
      {["playing", "PLAYING"].includes(roomData.status) && gameLogs.length > 0 && (
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
      <div className="w-full relative" style={{ height: "520px" }}>
        {[5, 1, 2, 4, 3].map((seatNum) => {
          let left, top, right, transform;
          if (seatNum === 5) { left = "50%"; top = "-8%"; transform = "translateX(-50%)"; }
          else if (seatNum === 1) { left = "17%"; top = "20%"; }
          else if (seatNum === 2) { left = "17%"; top = "68%"; }
          else if (seatNum === 4) { right = "16%"; top = "20%"; left = undefined; }
          else if (seatNum === 3) { right = "16%"; top = "68%"; left = undefined; }
          
          let styleProps: any = { top };
          if (left) styleProps.left = left;
          if (right) styleProps.right = right;
          if (transform) styleProps.transform = transform;

          return (
            <div key={seatNum} className="absolute flex justify-center" style={styleProps}>
              <PlayerAvatar
                seat={seatNum}
                player={getPlayerAtSeat(seatNum)}
                onSelect={() => selectSeat(seatNum)}
                onLeaveSeat={isMySeat(seatNum) ? () => selectSeat(-1) : undefined}
                myPicture={myProfilePicture}
                myDisplayName={myDisplayName}
                isHost={!!roomData.host_token && (getPlayerAtSeat(seatNum))?.player_token === roomData.host_token}
                isCurrentTurn={currentTurnSeat === seatNum}
                timeLeft={roomData.time_left}
              />
            </div>
          );
        })}

        {/* DECK + PLAY CARD — center of oval — แสดงเฉพาะตอน playing */}
        {["playing", "PLAYING"].includes(roomData.status) && (
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
                💣 <span>{roomData.deck_count ?? 56} ใบ</span>
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
      </div>
    </main>
  );
}
