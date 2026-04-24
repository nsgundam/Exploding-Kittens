"use client";
import React from "react";
import { Player, RoomData } from "@/types";
import { PlayerAvatar } from "./PlayerAvatar";
import { EKBombSequence } from "./EKBombSequence";
import { CatComboModal } from "./CatComboModal";
import { InsertEKModal } from "./InsertEKModal";
import { InsertIKModal } from "./InsertIKModal";
import { IKRevealModal } from "./IKRevealModal";
import { SeeTheFutureModal } from "./SeeTheFutureModal";
import { AlterTheFutureModal } from "./AlterTheFutureModal";
import { FavorPickModal } from "./FavorPickModal";
import { NopeToast } from "./NopeWindow";
import { GamePhase, EKBombState } from "@/hooks/useRoomSocket";

// ── Newly Decomposed Components ──
import { WinnerModal } from "./WinnerModal";
import { EliminatedModal } from "./EliminatedModal";
import { GameLogPanel } from "./GameLogPanel";
import { ActionBanners } from "./ActionBanners";
import { CardPlayZone } from "./CardPlayZone";

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
  isDrawLocked?: boolean;
  playCard: (cardCode: string, target?: string) => void;
  defuseCard: () => void;
  eliminatePlayer: () => void;
  afterHellfireRef?: React.MutableRefObject<(() => void) | null>;
  insertEK: (position: number) => void;
  placeIKBack: (position: number) => void;
  ikDrawerName?: string; // ชื่อผู้เล่นที่จั่วได้ IK (สำหรับ IKRevealModal)
  onIKRevealDone?: () => void; // callback หลัง reveal จบ
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
  lastPlayedCard?: { cardCode: string; playedByDisplayName: string; seq?: number; noAnimate?: boolean } | null;
  deckCount?: number | null;
  pendingAttacks?: number;
  comboState?: { comboCards: string[]; isThreeCard: boolean } | null;
  emitCombo?: (comboCards: string[], targetPlayerToken: string, demandedCard?: string, targetCardIndex?: number) => void;
  cancelCombo?: () => void;
  cancelFavor?: () => void;
  onPlayCombo?: (cardCodes: string[]) => void;
  pendingAction?: { playedByDisplayName: string; cardCode?: string; comboCards?: string[]; target?: string | null } | null;
  nopeState?: { nopeCount: number; isCancel: boolean; lastPlayedByDisplayName: string } | null;
  playNope?: () => void;
  direction?: number;
  ikOnTop?: boolean; // IK อยู่บนสุดกอง → แสดงหน้า IK บน deck
  cancelTA?: () => void;
  selectTATarget?: (targetPlayerToken: string) => void;
  commitAlterTheFuture?: (newOrder: string[]) => void;
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
  isDrawLocked,
  defuseCard,
  eliminatePlayer,
  afterHellfireRef,
  insertEK,
  placeIKBack,
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
  direction = 1,
  ikOnTop = false,
  cancelTA,
  selectTATarget,
  commitAlterTheFuture,
  ikDrawerName,
  onIKRevealDone,
}: GameBoardProps) {
  const getPlayerAtSeat = (seat: number) =>
    roomData.players?.find((p: Player) => p.seat_number === seat);

  const handleDefuse = () => defuseCard();
  const handleExplode = () => eliminatePlayer();
  const handleInsertEK = (position: number) => insertEK(position);
  const handlePlaceIKBack = (position: number) => placeIKBack(position);

  const [pendingComboTarget, setPendingComboTarget] = React.useState<string | null>(null);
  // spinDir: 0 = idle, 1 = spinning CW (direction became 1), -1 = spinning CCW (direction became -1)
  const [spinDir, setSpinDir] = React.useState<0 | 1 | -1>(0);
  const prevDirectionRef = React.useRef(direction);

  React.useEffect(() => {
    if (prevDirectionRef.current !== direction) {
      prevDirectionRef.current = direction;
      // direction 1 = clockwise (⟲), direction -1 = counter-clockwise (⟳)
      setSpinDir(direction === 1 ? 1 : -1);
      const t = setTimeout(() => setSpinDir(0), 700);
      return () => clearTimeout(t);
    }
  }, [direction]);

  const canDraw = currentTurnSeat !== null && isMySeat(currentTurnSeat) && gamePhase === "PLAYING" && !isDrawLocked;

  return (
    <main className="w-full h-full min-h-0 flex items-center justify-center px-6 py-4 relative">
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
        cancelTA={cancelTA}
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
        isIKFaceUp={ekBombState?.drawnCard === "IK" && !ekBombState?.hasDefuse}
        afterHellfireRef={afterHellfireRef}
      />

      {pendingComboTarget && comboState && (
        <CatComboModal
          isOpen={true}
          comboCards={comboState.comboCards}
          players={roomData.players ?? []}
          myPlayerToken={myPlayerToken}
          startAtDemandStep={true}
          preselectedTarget={pendingComboTarget}
          onConfirm={(token, demandedCard, cardIndex) => {
            if (emitCombo && comboState) {
              emitCombo(comboState.comboCards, pendingComboTarget, demandedCard, cardIndex);
            }
            setPendingComboTarget(null);
          }}
          onCancel={() => setPendingComboTarget(null)}
        />
      )}

      {/* IK Reveal Modal — โชว์ทุกคนก่อนเข้า IK_INSERT หรือ EK_DRAWN */}
      <IKRevealModal
        isOpen={gamePhase === "IK_REVEAL"}
        drawerName={ikDrawerName ?? "ผู้เล่น"}
        isMyTurn={currentTurnSeat !== null && isMySeat(currentTurnSeat)}
        isFaceUp={ekBombState?.drawnCard === "IK" && !ekBombState?.hasDefuse}
        onRevealDone={onIKRevealDone ?? (() => { })}
      />

      {/* EK Insert Modal (after Defuse) */}
      <InsertEKModal
        key={gamePhase === "DEFUSE_INSERT" ? "open" : "closed"}
        isOpen={gamePhase === "DEFUSE_INSERT"}
        drawnCard={ekBombState?.drawnCard || "EK"}
        deckCount={deckCount ?? roomData.deck_count ?? 0}
        onConfirm={handleInsertEK}
      />

      {/* IK Insert Modal (after drawing Imploding Kitten face-down) */}
      <InsertIKModal
        key={gamePhase === "IK_INSERT" ? "ik-open" : "ik-closed"}
        isOpen={gamePhase === "IK_INSERT" && currentTurnSeat !== null && isMySeat(currentTurnSeat)}
        deckCount={deckCount ?? roomData.deck_count ?? 0}
        onConfirm={handlePlaceIKBack}
      />

      <SeeTheFutureModal
        isOpen={gamePhase === "SEE_FUTURE"}
        cards={seeTheFutureCards}
        onClose={onCloseSeeTheFuture}
      />

      <AlterTheFutureModal
        isOpen={gamePhase === "ALTER_FUTURE"}
        cards={seeTheFutureCards}
        ikFaceUp={seeTheFutureCards.includes("IK")}
        onConfirm={(newOrder) => commitAlterTheFuture?.(newOrder)}
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
      <div className="w-full h-full min-h-0 relative">
        {[5, 1, 2, 4, 3].map((seatNum) => {
          let positionClasses = "";
          // Positions tuned to sit "around the table" (like the original layout),
          // and adjusted slightly for very short viewports (phone landscape).
          if (seatNum === 5)
            positionClasses = "left-1/2 top-[6%] -translate-x-1/2 [@media(max-height:450px)]:top-[4%]";
          else if (seatNum === 1)
            positionClasses = "left-[10%] top-[28%] [@media(max-height:450px)]:left-[6%] [@media(max-height:450px)]:top-[18%]";
          else if (seatNum === 2)
            positionClasses = "left-[10%] top-[72%] [@media(max-height:450px)]:left-[6%] [@media(max-height:450px)]:top-[82%]";
          else if (seatNum === 4)
            positionClasses = "right-[10%] top-[28%] [@media(max-height:450px)]:right-[6%] [@media(max-height:450px)]:top-[18%]";
          else if (seatNum === 3)
            positionClasses = "right-[10%] top-[72%] [@media(max-height:450px)]:right-[6%] [@media(max-height:450px)]:top-[82%]";

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
                player={player ?? undefined}
                isHost={isHost}
                isCurrentTurn={currentTurnSeat === seatNum}
                isMe={isMyAvatar}
                myPicture={myProfilePicture}
                myDisplayName={myDisplayName}
                onSelect={() => selectSeat(seatNum)}
                onLeaveSeat={() => selectSeat(-1)}
                timeLeft={timeLeft}
                isFavorTargetMode={gamePhase === "FAVOR_SELECT_TARGET"}
                isTATargetMode={gamePhase === "TA_SELECT_TARGET"}
                isComboTargetMode={gamePhase === "COMBO_SELECT_TARGET"}
                onFavorSelect={
                  player && !isMyAvatar
                    ? () => selectFavorTarget(player.player_token)
                    : undefined
                }
                onTASelect={
                  player && !isMyAvatar && selectTATarget
                    ? () => selectTATarget(player.player_token)
                    : undefined
                }
                onComboSelect={
                  player && !isMyAvatar && comboState
                    ? () => setPendingComboTarget(player.player_token)
                    : undefined
                }
              />
            </div>
          );
        })}

        {/* ── CENTER: DECK + PLAY ZONE ── */}
        {roomData.status === "PLAYING" && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-10"
          >
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
              {/* IK face-up on top of deck */}
              {ikOnTop ? (
                <div
                  className={`relative w-28 h-40 rounded-xl card-shadow transition-transform ${canDraw ? "cursor-pointer hover:scale-110 active:scale-95" : "cursor-not-allowed opacity-60"}`}
                  onClick={() => {
                    if (canDraw) drawCard();
                  }}
                  style={{
                    background: "linear-gradient(160deg, #4c1d95 0%, #1e0a3c 100%)",
                    border: (canDraw)
                      ? "3px solid rgba(167,139,250,0.9)"
                      : "3px solid rgba(139,92,246,0.5)",
                    boxShadow: (canDraw)
                      ? "0 0 24px rgba(139,92,246,0.8)"
                      : "0 0 10px rgba(139,92,246,0.3)",
                    animation: "ikPulse 1.8s ease-in-out infinite",
                  }}
                >
                  <div className="absolute top-2 inset-x-0 tracking-[0.15em] text-center font-black text-[10px] text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                    ☠ FACE UP
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <span style={{ fontSize: "2.8rem" }}>🐱</span>
                    <div
                      className="text-[8px] font-black tracking-wider text-center leading-tight px-1"
                      style={{ color: "rgba(196,181,253,0.9)" }}
                    >
                      IMPLODING
                      <br />
                      KITTEN
                    </div>
                  </div>
                  <div className="absolute bottom-2 inset-x-0 flex justify-center">
                    <span className="text-[9px] tracking-wider" style={{ color: "rgba(196,181,253,0.7)" }}>
                      TAP TO DRAW
                    </span>
                  </div>
                  <style>{`
                    @keyframes ikPulse {
                      0%, 100% { box-shadow: 0 0 16px rgba(139,92,246,0.6); }
                      50%       { box-shadow: 0 0 36px rgba(139,92,246,1), 0 0 60px rgba(139,92,246,0.4); }
                    }
                  `}</style>
                </div>
              ) : (
                <div
                  className={`relative w-28 h-40 rounded-xl card-shadow transition-transform ${canDraw ? "cursor-pointer hover:scale-110 active:scale-95" : "cursor-not-allowed opacity-60"}`}
                  onClick={() => {
                    if (canDraw) drawCard();
                  }}
                  style={{
                    background: "linear-gradient(135deg, #8b4a1a, #5c2d0a)",
                    border: (canDraw)
                      ? "3px solid #f5a623"
                      : "3px solid #c47a3a",
                    boxShadow: (canDraw)
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
              )}
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
            <div className="flex flex-col items-center gap-1">
              <div
                style={{
                  fontSize: "2.5rem",
                  color: direction === -1 ? "rgba(251,146,60,0.9)" : "rgba(255,240,200,0.7)",
                  filter: direction === -1 ? "drop-shadow(0 0 8px rgba(251,146,60,0.7))" : "none",
                  transition: "color 0.4s, filter 0.4s",
                  display: "inline-block",
                  animation: spinDir !== 0
                    ? `${spinDir === 1 ? "spinCW" : "spinCCW"} 0.6s ease-in-out`
                    : "none",
                }}
              >
                {direction === 1 ? "⟲" : "⟳"}
              </div>
              {direction === -1 && (
                <span
                  style={{
                    fontSize: "9px",
                    fontFamily: "'Fredoka One',cursive",
                    color: "rgba(251,146,60,0.9)",
                    fontWeight: "bold",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  REVERSED
                </span>
              )}
              <style>{`
                @keyframes spinCW {
                  0%   { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                @keyframes spinCCW {
                  0%   { transform: rotate(0deg); }
                  100% { transform: rotate(-360deg); }
                }
              `}</style>
            </div>

            {/* PLAY CARD ZONE — Holographic Reveal (Style D) */}
            <CardPlayZone lastPlayedCard={lastPlayedCard ?? null} players={roomData.players} />
          </div>
        )}
      </div>
    </main>
  );
}