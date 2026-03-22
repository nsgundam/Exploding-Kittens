"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Player, RoomData } from "@/types";
import { getCardConfig } from "@/types/cards";
import { PlayerAvatar } from "./PlayerAvatar";
import { EKBombSequence } from "./EKBombSequence";
import { InsertEKModal } from "./InsertEKModal";
import { SeeTheFutureModal } from "./SeeTheFutureModal";
import { GamePhase, EKBombState } from "@/hooks/useRoomSocket";

function WinnerPopup({
  isMe,
  displayName,
}: {
  isMe: boolean;
  displayName: string;
}) {
  useEffect(() => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
    };
    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-2000 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 flex flex-col items-center gap-4 p-8 rounded-3xl text-center"
        style={{
          width: "420px",
          background: "rgba(0,10,0,0.95)",
          border: "2px solid rgba(250,204,21,0.6)",
          boxShadow:
            "0 0 80px rgba(250,204,21,0.3), 0 24px 60px rgba(0,0,0,0.8)",
        }}
      >
        <div className="text-7xl animate-bounce">🏆</div>
        <h2
          className="text-4xl font-black text-yellow-400 font-bungee uppercase tracking-wider"
          style={{ textShadow: "0 0 30px rgba(250,204,21,0.8)" }}
        >
          {isMe ? "คุณชนะ!" : `${displayName} ชนะ!`}
        </h2>
        <p className="text-gray-300 text-base">
          {isMe
            ? "เยี่ยมมาก! คุณเป็นผู้รอดชีวิตคนสุดท้าย 🎉"
            : `${displayName} เป็นผู้รอดชีวิตคนสุดท้าย`}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-8 py-3 rounded-2xl font-black text-black font-bungee text-lg transition-all hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #fbbf24, #d97706)",
            border: "2px solid rgba(250,204,21,0.8)",
            boxShadow: "0 4px 0 #92400e",
          }}
        >
          กลับสู่ห้อง
        </button>
      </div>
    </div>
  );
}

export interface GameBoardProps {
  roomData: RoomData;
  myProfilePicture: string | null;
  myDisplayName: string | null;
  currentTurnSeat: number | null;
  gamePhase: GamePhase;
  ekBombState: EKBombState | null;
  seeTheFutureCards: string[];
  gameLogs: string[];
  onCloseSeeTheFuture: () => void;
  selectSeat: (seat_number: number) => void;
  drawCard: (isAutoDraw?: boolean) => void;
  playCard: (cardCode: string, target?: string) => void;
  defuseCard: () => void;
  eliminatePlayer: () => void;
  closeInsertEK: () => void;
  eliminatedPlayerId: string | null;
  dismissEliminated: () => void;
  winner: { player_id: string; display_name: string } | null;
  myPlayerToken: string | null;
  isMySeat: (seat: number) => boolean;
  timeLeft?: number;
  lastPlayedCard?: { cardCode: string; playedByDisplayName: string } | null;
  deckCount?: number | null;
}

export function GameBoard({
  roomData,
  myProfilePicture,
  myDisplayName,
  currentTurnSeat,
  gamePhase,
  ekBombState,
  seeTheFutureCards,
  gameLogs,
  onCloseSeeTheFuture,
  selectSeat,
  drawCard,
  defuseCard,
  eliminatePlayer,
  closeInsertEK,
  eliminatedPlayerId,
  dismissEliminated,
  winner,
  myPlayerToken,
  isMySeat,
  timeLeft,
  lastPlayedCard,
  deckCount,
}: GameBoardProps) {
  const getPlayerAtSeat = (seat: number) =>
    roomData.players?.find((p: Player) => p.seat_number === seat);

  const handleDefuse = () => {
    defuseCard();
  };
  const handleExplode = () => {
    eliminatePlayer();
  };
  const handleInsertEK = (position: number) => {
    console.log("Inserting EK at position", position);
    closeInsertEK();
  };

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-4 relative">
      <div
        className="absolute left-2 top-1/4 text-5xl opacity-5 animate-float"
        style={{ animationDelay: "1s" }}
      >
        🐱
      </div>
      <div
        className="absolute right-2 bottom-1/4 text-5xl opacity-5 animate-float"
        style={{ animationDelay: "2s" }}
      >
        💥
      </div>

      {/* ── MODALS & SEQUENCES ── */}
      <EKBombSequence
        active={gamePhase === "EK_DRAWN" && !!ekBombState}
        drawnCard={ekBombState?.drawnCard || "EK"}
        hasDefuse={ekBombState?.hasDefuse || false}
        onDefuse={handleDefuse}
        onExplode={handleExplode}
        isMyBomb={currentTurnSeat !== null && isMySeat(currentTurnSeat)}
      />

      <InsertEKModal
        isOpen={gamePhase === "DEFUSE_INSERT"}
        drawnCard={ekBombState?.drawnCard || "EK"}
        deckCount={roomData.deck_count || 56}
        onConfirm={handleInsertEK}
      />

      <SeeTheFutureModal
        isOpen={gamePhase === "SEE_FUTURE"}
        cards={seeTheFutureCards}
        onClose={onCloseSeeTheFuture}
      />

      {/* ── ELIMINATED POPUP ── แสดงเฉพาะคนที่แพ้เท่านั้น */}
      {eliminatedPlayerId &&
        !winner &&
        (() => {
          const eliminatedPlayer = roomData.players?.find(
            (p: Player) => p.player_id === eliminatedPlayerId,
          );
          const isMe = eliminatedPlayer?.player_token === myPlayerToken;
          if (!isMe) return null;
          const displayName = eliminatedPlayer?.display_name ?? "ผู้เล่น";
          return (
            <div className="fixed inset-0 z-2000 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <div
                className="relative z-10 flex flex-col items-center gap-4 p-8 rounded-3xl text-center"
                style={{
                  width: "380px",
                  background: "rgba(10,0,0,0.93)",
                  border: "2px solid rgba(239,68,68,0.5)",
                  boxShadow:
                    "0 0 60px rgba(239,68,68,0.3), 0 24px 60px rgba(0,0,0,0.8)",
                }}
              >
                <div className="text-6xl animate-bounce">💥</div>
                <h2
                  className="text-3xl font-black text-white font-bungee uppercase tracking-wider"
                  style={{ textShadow: "0 0 20px rgba(239,68,68,0.8)" }}
                >
                  {isMe ? "คุณแพ้แล้ว!" : `${displayName} แพ้แล้ว!`}
                </h2>
                <p className="text-gray-400 text-base">
                  {isMe
                    ? "คุณถูกระเบิด Exploding Kitten!"
                    : `${displayName} ถูกระเบิดหลุดออกจากเกม`}
                </p>
                <button
                  onClick={dismissEliminated}
                  className="mt-2 px-8 py-3 rounded-2xl font-black text-white font-bungee text-lg transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
                    border: "2px solid rgba(239,68,68,0.5)",
                    boxShadow: "0 4px 0 #450a0a",
                  }}
                >
                  ตกลง
                </button>
              </div>
            </div>
          );
        })()}

      {/* ── WINNER POPUP ── */}
      {winner &&
        (() => {
          const isMe =
            roomData.players?.find(
              (p: Player) => p.player_id === winner.player_id,
            )?.player_token === myPlayerToken;
          return <WinnerPopup isMe={isMe} displayName={winner.display_name} />;
        })()}

      {/* ── LOG PANEL ── */}
      {roomData.status === "PLAYING" && gameLogs.length > 0 && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-60 z-20">
          <div
            className="rounded-2xl px-3 py-3 flex flex-col gap-1.5"
            style={{
              background: "rgba(240,220,170,0.72)",
              backdropFilter: "blur(18px)",
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
            {gameLogs.slice(-7).map((log, i, arr) => (
              <div
                key={i}
                className="text-xs leading-snug"
                style={{
                  color:
                    i === arr.length - 1
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

      {/* ── BOARD LAYOUT ── */}
      <div className="w-full relative h-130">
        {[5, 1, 2, 4, 3].map((seatNum) => {
          let positionClasses = "";
          if (seatNum === 5)
            positionClasses = "left-1/2 -top-[8%] -translate-x-1/2";
          else if (seatNum === 1) positionClasses = "left-[17%] top-[20%]";
          else if (seatNum === 2) positionClasses = "left-[17%] top-[68%]";
          else if (seatNum === 4) positionClasses = "right-[16%] top-[20%]";
          else if (seatNum === 3) positionClasses = "right-[16%] top-[68%]";

          const player = getPlayerAtSeat(seatNum);
          const isHost =
            !!roomData.host_token &&
            player?.player_token === roomData.host_token;

          return (
            <div
              key={seatNum}
              className={`absolute flex justify-center ${positionClasses}`}
            >
              <PlayerAvatar
                seat={seatNum}
                player={player}
                onSelect={() => selectSeat(seatNum)}
                onLeaveSeat={
                  isMySeat(seatNum) ? () => selectSeat(-1) : undefined
                }
                myPicture={myProfilePicture}
                myDisplayName={myDisplayName}
                isHost={isHost}
                isCurrentTurn={currentTurnSeat === seatNum}
                timeLeft={timeLeft}
              />
            </div>
          );
        })}

        {/* ── CENTER AREA (DECK & DISCARD) ── */}
        {roomData.status === "PLAYING" && (
          <div className="absolute left-1/2 top-[53.5%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-10">
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
                💣 <span>{deckCount ?? roomData.deck_count} ใบ</span>
              </div>
              <div
                className={`relative w-28 h-40 rounded-xl card-shadow transition-transform ${currentTurnSeat !== null && isMySeat(currentTurnSeat) ? "cursor-pointer hover:scale-110 active:scale-95" : "cursor-not-allowed opacity-60"}`}
                onClick={() => {
                  if (currentTurnSeat !== null && isMySeat(currentTurnSeat))
                    drawCard();
                }}
                style={{
                  background: "linear-gradient(135deg, #8b4a1a, #5c2d0a)",
                  border:
                    currentTurnSeat !== null && isMySeat(currentTurnSeat)
                      ? "3px solid #f5a623"
                      : "3px solid #c47a3a",
                  boxShadow:
                    currentTurnSeat !== null && isMySeat(currentTurnSeat)
                      ? "0 0 20px rgba(245,166,35,0.6)"
                      : "none",
                }}
              >
                <div
                  className="absolute inset-1 rounded-lg opacity-30"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)",
                    backgroundSize: "6px 6px",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-5xl">
                  💣
                </div>
                <div className="absolute bottom-2 inset-x-0 flex justify-center">
                  <span
                    className="text-[9px] tracking-wider"
                    style={{ color: "rgba(245,166,35,0.8)" }}
                  >
                    TAP TO DRAW
                  </span>
                </div>
              </div>
              <span
                className="text-xs tracking-widest uppercase font-bold"
                style={{
                  color: "#fff8f0",
                  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                }}
              >
                DECK
              </span>
            </div>

            {/* ARROW */}
            <div
              className="text-4xl"
              style={{ color: "rgba(255,240,200,0.7)" }}
            >
              ⟳
            </div>

            {/* PLAY CARD ZONE */}
            <div className="flex flex-col items-center gap-2">
              <div className="h-7" />
              <div
                className="w-28 h-40 rounded-xl flex items-center justify-center relative overflow-hidden"
                style={{
                  border: lastPlayedCard
                    ? `2px solid ${getCardConfig(lastPlayedCard.cardCode).color}88`
                    : "2px dashed rgba(255,220,150,0.5)",
                  background: lastPlayedCard
                    ? `linear-gradient(160deg, ${getCardConfig(lastPlayedCard.cardCode).color}22, rgba(0,0,0,0.4))`
                    : "rgba(0,0,0,0.15)",
                  boxShadow: lastPlayedCard
                    ? `0 0 16px ${getCardConfig(lastPlayedCard.cardCode).color}44`
                    : undefined,
                }}
              >
                {lastPlayedCard ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 p-2">
                    <span className="text-5xl">
                      {getCardConfig(lastPlayedCard.cardCode).emoji}
                    </span>
                    <span
                      className="text-xs font-black tracking-wider text-center leading-none"
                      style={{
                        color: getCardConfig(lastPlayedCard.cardCode).color,
                      }}
                    >
                      {getCardConfig(lastPlayedCard.cardCode).label}
                    </span>
                    <span
                      className="text-[9px] text-center"
                      style={{ color: "rgba(255,240,200,0.5)" }}
                    >
                      {lastPlayedCard.playedByDisplayName}
                    </span>
                  </div>
                ) : (
                  <span
                    className="text-sm text-center leading-tight px-2"
                    style={{ color: "rgba(255,240,200,0.4)" }}
                  >
                    PLAY
                    <br />
                    CARD
                  </span>
                )}
              </div>
              <span
                className="text-xs tracking-widest uppercase font-bold"
                style={{
                  color: "rgba(255,240,200,0.6)",
                  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                }}
              >
                PLAY CARD
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
