"use client";

import { Player, RoomData } from "@/types";
import { PlayerAvatar } from "./PlayerAvatar";
import { EKBombSequence } from "./EKBombSequence";
import { InsertEKModal } from "./InsertEKModal";
import { SeeTheFutureModal } from "./SeeTheFutureModal";
import { GamePhase, EKBombState } from "@/hooks/useRoomSocket";

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
  drawCard: () => void;
  playCard: (cardCode: string, target?: string) => void;
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
  playCard,
  isMySeat,
  timeLeft,
  lastPlayedCard,
  deckCount,
}: GameBoardProps) {
  const CARD_CONFIG: Record<
    string,
    { emoji: string; label: string; color: string }
  > = {
    DF: { emoji: "🛡️", label: "DEFUSE", color: "#4ade80" },
    GVE_DF: { emoji: "🛡️", label: "DEFUSE", color: "#4ade80" },
    EK: { emoji: "💣", label: "EK", color: "#ef4444" },
    GVE_EK: { emoji: "💣", label: "EK", color: "#ef4444" },
    AT: { emoji: "⚡", label: "ATTACK", color: "#f97316" },
    SK: { emoji: "⏭️", label: "SKIP", color: "#3b82f6" },
    SHF: { emoji: "🔀", label: "SHUFFLE", color: "#8b5cf6" },
    FV: { emoji: "🔭", label: "SEE FUTURE", color: "#06b6d4" },
    NP: { emoji: "🚫", label: "NOPE", color: "#dc2626" },
    CAT_TACO: { emoji: "🌮", label: "TACO CAT", color: "#f59e0b" },
    CAT_BEARD: { emoji: "🐱", label: "BEARD CAT", color: "#a78bfa" },
    CAT_MELO: { emoji: "🍉", label: "CATTER MELON", color: "#34d399" },
    CAT_POTATO: { emoji: "🥔", label: "POTATO CAT", color: "#fbbf24" },
    CAT_RC: { emoji: "🚀", label: "RAINBOW CAT", color: "#f472b6" },
    SF: { emoji: "🔮", label: "SEE FUTURE", color: "#06b6d4" },
    DR: { emoji: "🎲", label: "DRAW", color: "#84cc16" },
    IK: { emoji: "💥", label: "IMPLODING", color: "#ef4444" },
  };

  const getPlayerAtSeat = (seat: number) =>
    roomData.players?.find((p: Player) => p.seat_number === seat);

  const handleDefuse = () => {
    // Tells the backend we want to use our Defuse card
    // The backend should then transition us to inserting the EK
    const dfCode =
      roomData.deck_config?.card_version === "good_and_evil" ? "GVE_DF" : "DF";
    playCard(dfCode);
  };

  const handleExplode = () => {
    // If timer runs out or user clicks explode, they just draw the bomb
    // Actually, in our current flow, drawing the card triggers the bomb if we do nothing
    // We can emit an explicit "eliminate/explode" event if needed, or just let timer run out.
    // For now, drawing the card without defusing eliminates.
    drawCard();
  };

  const handleInsertEK = (position: number) => {
    // Custom socket event would go here for S2-39
    // e.g. socket.emit("insertEK", { position })
    console.log("Inserting EK at position", position);
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
                💣 <span>{deckCount ?? roomData.deck_count ?? 56} ใบ</span>
              </div>
              <div
                className={`relative w-28 h-40 rounded-xl card-shadow transition-transform ${currentTurnSeat !== null && isMySeat(currentTurnSeat) ? "cursor-pointer hover:scale-110 active:scale-95" : "cursor-not-allowed opacity-60"}`}
                title={
                  currentTurnSeat !== null && isMySeat(currentTurnSeat)
                    ? "จั่วไพ่"
                    : "ยังไม่ถึงเทิร์นของคุณ"
                }
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
                    ? `2px solid ${CARD_CONFIG[lastPlayedCard.cardCode]?.color ?? "#f5a623"}88`
                    : "2px dashed rgba(255,220,150,0.5)",
                  background: lastPlayedCard
                    ? `linear-gradient(160deg, ${CARD_CONFIG[lastPlayedCard.cardCode]?.color ?? "#f5a623"}22, rgba(0,0,0,0.4))`
                    : "rgba(0,0,0,0.15)",
                  boxShadow: lastPlayedCard
                    ? `0 0 16px ${CARD_CONFIG[lastPlayedCard.cardCode]?.color ?? "#f5a623"}44`
                    : undefined,
                }}
              >
                {lastPlayedCard ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 p-2">
                    <span className="text-5xl">
                      {CARD_CONFIG[lastPlayedCard.cardCode]?.emoji ?? "🃏"}
                    </span>
                    <span
                      className="text-xs font-black tracking-wider text-center leading-none"
                      style={{
                        color:
                          CARD_CONFIG[lastPlayedCard.cardCode]?.color ??
                          "#f5a623",
                      }}
                    >
                      {CARD_CONFIG[lastPlayedCard.cardCode]?.label ??
                        lastPlayedCard.cardCode}
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
