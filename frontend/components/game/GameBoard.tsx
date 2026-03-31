"use client";
import React from "react";
import { Player, RoomData } from "@/types";
import { getCardConfig } from "@/types/cards";
import { PlayerAvatar } from "./PlayerAvatar";
import { EKBombSequence } from "./EKBombSequence";
import { CatComboModal } from "./CatComboModal";
import { InsertEKModal } from "./InsertEKModal";
import { SeeTheFutureModal } from "./SeeTheFutureModal";
import { FavorPickModal } from "./FavorPickModal";
import { NopeToast } from "./NopeWindow";
import { GamePhase, EKBombState } from "@/hooks/useRoomSocket";

// ── Newly Decomposed Components ──
import { WinnerModal } from "./WinnerModal";
import { EliminatedModal } from "./EliminatedModal";
import { GameLogPanel } from "./GameLogPanel";
import { ActionBanners } from "./ActionBanners";

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
  insertEK: (position: number) => void;
  eliminatedPlayerId: string | null;
  dismissEliminated: () => void;
  winner: { player_id: string; display_name: string } | null;
  myPlayerToken: string | null;
  favorState: { requesterPlayerId: string; requesterName: string; targetPlayerId?: string } | null;
  selectFavorTarget: (targetPlayerToken: string) => void;
  pickFavorCard: (cardCode: string, requesterPlayerId: string) => void;
  myCards: string[];
  isMySeat: (seat: number) => boolean;
  timeLeft?: number;
  lastPlayedCard?: { cardCode: string; playedByDisplayName: string } | null;
  deckCount?: number | null;
  pendingAttacks?: number;
  comboState?: { comboCards: string[]; isThreeCard: boolean } | null;
  emitCombo?: (comboCards: string[], targetPlayerToken: string, demandedCard?: string) => void;
  cancelCombo?: () => void;
  cancelFavor?: () => void;
  onPlayCombo?: (cardCodes: string[]) => void;
  pendingAction?: { playedByDisplayName: string; cardCode?: string; comboCards?: string[]; target?: string | null } | null;
  nopeState?: { nopeCount: number; isCancel: boolean; lastPlayedByDisplayName: string } | null;
  playNope?: () => void;
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
  insertEK,
  eliminatedPlayerId,
  dismissEliminated,
  winner,
  myPlayerToken,
  favorState,
  selectFavorTarget,
  pickFavorCard,
  myCards,
  isMySeat,
  timeLeft,
  lastPlayedCard,
  deckCount,
  pendingAttacks = 0,
  comboState,
  emitCombo,
  cancelCombo,
  cancelFavor,
  pendingAction,
  nopeState,
}: GameBoardProps) {
  const getPlayerAtSeat = (seat: number) =>
    roomData.players?.find((p: Player) => p.seat_number === seat);

  const handleDefuse = () => defuseCard();
  const handleExplode = () => eliminatePlayer();
  const handleInsertEK = (position: number) => insertEK(position);

  const [pendingComboTarget, setPendingComboTarget] = React.useState<string | null>(null);

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

      {/* ── BANNERS ── */}
      <ActionBanners 
        gamePhase={gamePhase}
        pendingAttacks={pendingAttacks}
        currentTurnSeat={currentTurnSeat}
        isMySeat={isMySeat}
        cancelCombo={cancelCombo}
        cancelFavor={cancelFavor}
      />

      {/* ── NOPE TOAST ── */}
      <NopeToast
        isOpen={gamePhase === "NOPE_WINDOW"}
        pendingAction={pendingAction ?? null}
        nopeState={nopeState ?? null}
        targetDisplayName={
          pendingAction?.target
            ? roomData.players?.find((p: Player) => p.player_token === pendingAction.target)?.display_name
            : undefined
        }
      />

      {/* ── MODALS & SEQUENCES ── */}
      <EKBombSequence
        active={gamePhase === "EK_DRAWN" && !!ekBombState}
        drawnCard={ekBombState?.drawnCard || "EK"}
        hasDefuse={ekBombState?.hasDefuse || false}
        onDefuse={handleDefuse}
        onExplode={handleExplode}
        isMyBomb={currentTurnSeat !== null && isMySeat(currentTurnSeat)}
      />

      {pendingComboTarget && comboState?.isThreeCard && (
        <CatComboModal
          isOpen={true}
          comboCards={comboState.comboCards}
          players={roomData.players ?? []}
          myPlayerToken={myPlayerToken}
          startAtDemandStep={true}
          preselectedTarget={pendingComboTarget}
          onConfirm={(_token, demandedCard) => {
            if (emitCombo && comboState) {
              emitCombo(comboState.comboCards, pendingComboTarget, demandedCard);
            }
            setPendingComboTarget(null);
          }}
          onCancel={() => setPendingComboTarget(null)}
        />
      )}

      <InsertEKModal
        key={gamePhase === "DEFUSE_INSERT" ? "open" : "closed"}
        isOpen={gamePhase === "DEFUSE_INSERT"}
        drawnCard={ekBombState?.drawnCard || "EK"}
        deckCount={deckCount ?? roomData.deck_count ?? 0}
        onConfirm={handleInsertEK}
      />

      <SeeTheFutureModal
        isOpen={gamePhase === "SEE_FUTURE"}
        cards={seeTheFutureCards}
        onClose={onCloseSeeTheFuture}
      />

      <FavorPickModal
        isOpen={gamePhase === "FAVOR_PICK_CARD"}
        requesterName={favorState?.requesterName ?? "ผู้เล่น"}
        requesterPlayerId={favorState?.requesterPlayerId ?? ""}
        myCards={myCards}
        onPickCard={pickFavorCard}
      />

      {/* ── ELIMINATION & ENDGAME MODALS ── */}
      {eliminatedPlayerId && !winner && (() => {
        const eliminatedPlayer = roomData.players?.find((p: Player) => p.player_id === eliminatedPlayerId);
        const isMe = eliminatedPlayer?.player_token === myPlayerToken;
        const displayName = eliminatedPlayer?.display_name ?? "ผู้เล่น";
        return <EliminatedModal isMe={isMe} displayName={displayName} onDismiss={dismissEliminated} />;
      })()}

      {winner && (() => {
        const isMe = roomData.players?.find((p: Player) => p.player_id === winner.player_id)?.player_token === myPlayerToken;
        return <WinnerModal isMe={isMe} displayName={winner.display_name} />;
      })()}

      {/* ── GAME LOG PANEL ── */}
      {roomData.status === "PLAYING" && (
        <GameLogPanel gameLogs={gameLogs} />
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
          const isMyAvatar = isMySeat(seatNum);

          return (
            <div
              key={seatNum}
              className={`absolute flex justify-center ${positionClasses}`}
            >
              <PlayerAvatar
                seat={seatNum}
                player={player}
                onSelect={() => selectSeat(seatNum)}
                onLeaveSeat={isMyAvatar ? () => selectSeat(-1) : undefined}
                myPicture={myProfilePicture}
                myDisplayName={myDisplayName}
                isHost={isHost}
                isCurrentTurn={currentTurnSeat === seatNum}
                timeLeft={timeLeft}
                isFavorTargetMode={gamePhase === "FAVOR_SELECT_TARGET"}
                isComboTargetMode={gamePhase === "COMBO_SELECT_TARGET"}
                onComboSelect={() => {
                  const p = getPlayerAtSeat(seatNum);
                  if (!p || !comboState || !emitCombo) return;
                  if (comboState.isThreeCard) {
                    setPendingComboTarget(p.player_token);
                  } else {
                    emitCombo(comboState.comboCards, p.player_token);
                  }
                }}
                isMe={isMyAvatar}
                onFavorSelect={
                  player && !isMyAvatar
                    ? () => selectFavorTarget(player.player_token)
                    : undefined
                }
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
              ⟲
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