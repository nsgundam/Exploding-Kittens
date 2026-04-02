"use client";

import { useRoomSocket } from "@/hooks/useRoomSocket";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { GameBoard } from "@/components/game/GameBoard";
import { PlayerHand } from "@/components/game/PlayerHand";
import DeckConfigModal from "@/components/game/DeckConfigModal";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();

  const {
    roomData,
    selectSeat,
    startGame,
    drawCard,
    playCard,
    defuseCard,
    eliminatePlayer,
    eliminatedPlayerId,
    dismissEliminated,
    winner,
    leaveRoom,
    updateDeckConfig,
    favorState,
    selectFavorTarget,
    pickFavorCard,
    myCards,
    gameLogs,
    gamePhase,
    ekBombState,
    seeTheFutureCards,
    closeSeeTheFuture,
    insertEK,
    placeIKBack,
    error,
    timeLeft,
    lastPlayedCard,
    currentTurnPlayerId,
    pendingAttacks,
    deckCount,
    playCombo,
    emitCombo,
    cancelCombo,
    cancelFavor,
    comboState,
    pendingAction,
    nopeState,
    playNope,
    selectTATarget,
    cancelTA,
    direction,
    commitAlterTheFuture,
    setGamePhase,
    ikOnTop,
  } = useRoomSocket(roomId);

  const [isMounted, setIsMounted] = useState(false);
  const [showDeckConfig, setShowDeckConfig] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsMounted(true), 0);
  }, []);

  useEffect(() => {
    if (error) {
      setTimeout(() => router.push("/Lobby"), 3000);
    }
  }, [error, router]);

  if (!isMounted) return null;

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,#3d1f0a_0%,#1a0d04_100%)] font-bungee">
        <div className="text-6xl mb-4">😿</div>
        <p className="text-red-500 text-2xl tracking-widest">{error}</p>
        <p className="text-orange-300 mt-4 animate-pulse">
          กำลังกลับสู่ Lobby...
        </p>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#3d1f0a_0%,#1a0d04_100%)] font-bungee">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">💣</div>
          <div className="flex items-center justify-center gap-3 text-[#f5a623] text-xl tracking-widest animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin" />
            กำลังเชื่อมต่อห้อง {roomId}…
          </div>
        </div>
      </div>
    );
  }

  const getPlayerAtSeat = (seat: number) =>
    roomData.players?.find((p) => p.seat_number === seat);
  const myPlayer = roomData.players?.find((p) => p.role === "ME");

  const mySessionId = localStorage.getItem("session_id");
  const myPlayerToken = localStorage.getItem("player_token");
  const myProfilePicture = localStorage.getItem("profile_picture");
  const myDisplayName = localStorage.getItem("display_name");

  // Check if seat is mine
  const isMySeat = (seat: number): boolean => {
    const p = getPlayerAtSeat(seat);
    if (!p) return false;
    if (myPlayer && p.player_id === myPlayer.player_id) return true;
    if (mySessionId && p.session_id === mySessionId) return true;
    if (myPlayerToken && p.player_token === myPlayerToken) return true;
    if (p.role === "ME") return true;
    return false;
  };

  const isHost = !!myPlayerToken && myPlayerToken === roomData.host_token;
  const currentTurnSeat =
    roomData.players?.find((p) => p.player_id === currentTurnPlayerId)
      ?.seat_number ?? null;
  const isMyTurn = currentTurnSeat !== null && isMySeat(currentTurnSeat);

  // ชื่อผู้เล่นที่เป็น current turn (ใช้ใน IKRevealModal)
  const ikDrawerName =
    roomData.players?.find((p) => p.player_id === currentTurnPlayerId)?.display_name ?? "ผู้เล่น";

  const handleLeaveRoom = () => {
    leaveRoom();
    router.push("/Lobby");
  };

  const handlePlayCombo = (cardCodes: string[]) => {
    playCombo(cardCodes);
  };

  // หลัง IKRevealModal reveal จบ → transition ไป phase ถัดไปตาม ekBombState
  // hasDefuse = true → IK face-down (คว่ำหน้า) → current player ไป IK_INSERT
  // hasDefuse = false → IK face-up (หงายหน้า) → ทุกคนไป EK_DRAWN
  const handleIKRevealDone = () => {
    if (!ekBombState || ekBombState.drawnCard !== "IK") return;
    if (ekBombState.hasDefuse) {
      setGamePhase(isMyTurn ? "IK_INSERT" : "PLAYING");
    } else {
      setGamePhase("EK_DRAWN");
    }
  };

  const canStartGame =
    !!roomData.players &&
    roomData.players.filter((p) => p.seat_number !== null).length >= 2;

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

        @keyframes startPulse {
          0%, 100% { box-shadow: 0 4px 0 #14532d, 0 0 20px rgba(74,222,128,0.4); }
          50%       { box-shadow: 0 4px 0 #14532d, 0 0 40px rgba(74,222,128,0.9), 0 0 60px rgba(74,222,128,0.4); }
        }
        .start-pulse { animation: startPulse 1.6s ease-in-out infinite; }
        .card-shadow {
          box-shadow: 4px 4px 0 rgba(0,0,0,0.5), 8px 8px 20px rgba(0,0,0,0.4);
        }
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
          className="flex items-center justify-between px-5 py-4 relative z-50"
          style={{
            background: "transparent",
            borderBottom: "1px solid rgba(150,100,20,0.2)",
          }}
        >
          {/* Left: Leave button */}
          <div className="flex-1 flex items-center">
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black tracking-wider uppercase transition-all duration-150"
              style={{
                fontFamily: "'Fredoka One', cursive",
                background: "linear-gradient(135deg, #c0392b 0%, #922b21 100%)",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 4px 0 #641e16, 0 6px 12px rgba(0,0,0,0.3)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "translateY(-2px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 6px 0 #641e16, 0 8px 16px rgba(0,0,0,0.4)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "translateY(0)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 4px 0 #641e16, 0 6px 12px rgba(0,0,0,0.3)";
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "translateY(2px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 2px 0 #641e16";
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "translateY(-2px)";
              }}
            >
              ← ออกจากห้อง
            </button>
          </div>

          {/* Center: Room info */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5"
            style={{ top: "60%" }}
          >
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
          </div>

          {/* Right: Status + Deck config */}
          <div className="flex-1 flex items-center justify-end gap-3">
            <div
              className="px-3 py-1.5 rounded-full text-xs font-bold tracking-wider"
              style={{
                background:
                  roomData.status === "PLAYING"
                    ? "rgba(22,163,74,0.25)"
                    : "rgba(180,100,20,0.25)",
                border:
                  roomData.status === "PLAYING"
                    ? "1px solid rgba(22,163,74,0.6)"
                    : "1px solid rgba(180,100,20,0.6)",
                color: "#fff",
                boxShadow:
                  roomData.status === "PLAYING"
                    ? "0 3px 0 #14532d"
                    : "0 3px 0 #7a2f00",
              }}
            >
              {roomData.status === "PLAYING" ? "🎮 Playing" : "⏳ Waiting"}
            </div>

            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
              style={{
                background: "rgba(120,70,10,0.18)",
                border: "1px solid rgba(120,70,10,0.5)",
                color: "#5c2d00",
              }}
            >
              <span style={{ fontFamily: "'Fredoka One',cursive" }}>
                {roomData.deck_config?.card_version ?? "classic"}
                {roomData.deck_config?.expansions.length
                  ? " + " + roomData.deck_config.expansions.join(", ")
                  : ""}
              </span>
            </div>

            <button
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{
                background: "rgba(120,70,10,0.18)",
                border: "2px solid rgba(120,70,10,0.45)",
                color: isHost ? "#5c2d00" : "rgba(120,70,10,0.3)",
                cursor:
                  isHost && roomData.status !== "PLAYING"
                    ? "pointer"
                    : "not-allowed",
                opacity: isHost ? 1 : 0.5,
              }}
              onClick={() => {
                if (isHost && roomData.status !== "PLAYING") {
                  setShowDeckConfig(true);
                }
              }}
              title={
                !isHost
                  ? "เฉพาะหัวหน้าห้องเท่านั้น"
                  : roomData.status === "PLAYING"
                    ? "ไม่สามารถเปลี่ยนได้หลังเริ่มเกม"
                    : "ตั้งค่าสำรับไพ่"
              }
            >
              ⚙️
            </button>
          </div>
        </header>

        {/* ── MAIN GAME AREA ───────────────────────────────────────────── */}
        <div className="flex-1 relative z-10 w-full mx-auto flex items-center justify-center pt-8">
          <GameBoard
            roomData={roomData}
            myProfilePicture={myProfilePicture}
            myDisplayName={myDisplayName}
            currentTurnSeat={currentTurnSeat}
            gamePhase={gamePhase}
            ekBombState={ekBombState}
            seeTheFutureCards={seeTheFutureCards}
            onCloseSeeTheFuture={closeSeeTheFuture}
            selectSeat={selectSeat}
            drawCard={drawCard}
            playCard={playCard}
            onPlayCombo={handlePlayCombo}
            defuseCard={defuseCard}
            eliminatePlayer={eliminatePlayer}
            insertEK={insertEK}
            placeIKBack={placeIKBack}
            eliminatedPlayerId={eliminatedPlayerId}
            dismissEliminated={dismissEliminated}
            winner={winner}
            myPlayerToken={myPlayerToken}
            favorState={favorState}
            selectFavorTarget={selectFavorTarget}
            pickFavorCard={pickFavorCard}
            myCards={myCards}
            isMySeat={isMySeat}
            gameLogs={gameLogs}
            timeLeft={timeLeft}
            lastPlayedCard={lastPlayedCard}
            pendingAttacks={pendingAttacks}
            comboState={comboState}
            emitCombo={emitCombo}
            cancelCombo={cancelCombo}
            cancelFavor={cancelFavor}
            deckCount={deckCount}
            pendingAction={pendingAction}
            nopeState={nopeState}
            playNope={playNope}
            selectTATarget={selectTATarget}
            cancelTA={cancelTA}
            direction={direction}
            commitAlterTheFuture={commitAlterTheFuture}
            ikDrawerName={ikDrawerName}
            onIKRevealDone={handleIKRevealDone}
            ikOnTop={ikOnTop}
          />
        </div>

        {/* ── FOOTER / PLAYER HAND AREA ────────────────────────────────── */}
        <footer
          className="px-6 py-4 flex items-end justify-between gap-4 z-50 relative h-48"
          style={{
            background: "transparent",
            borderTop: "1px solid rgba(150,100,20,0.25)",
          }}
        >
          {/* Top Center: Start Game Button */}
          {isHost && roomData.status === "WAITING" && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1">
              <button
                onClick={() => canStartGame && startGame()}
                disabled={!canStartGame}
                className={`px-10 py-3 rounded-2xl text-white font-black tracking-widest text-base uppercase ${canStartGame ? "start-pulse" : ""}`}
                style={{
                  fontFamily: "'Fredoka One', cursive",
                  background: canStartGame
                    ? "linear-gradient(135deg, #4ade80 0%, #16a34a 100%)"
                    : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                  cursor: canStartGame ? "pointer" : "not-allowed",
                  opacity: canStartGame ? 1 : 0.55,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!canStartGame) return;
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-3px) scale(1.04)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0) scale(1)";
                }}
                onMouseDown={(e) => {
                  if (!canStartGame) return;
                  (e.currentTarget as HTMLElement).style.transform = "translateY(2px) scale(0.97)";
                }}
                onMouseUp={(e) => {
                  if (!canStartGame) return;
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-3px) scale(1.04)";
                }}
              >
                🚀 เริ่มเกม
              </button>
              {!canStartGame && (
                <div
                  className="text-xs"
                  style={{ color: "rgba(180,100,20,1)", fontFamily: "'Fredoka One', cursive" }}
                >
                  ต้องการผู้เล่นอย่างน้อย 2 คน
                </div>
              )}
            </div>
          )}

          {/* Left: Player Profile */}
          <div className="absolute left-6 bottom-4 flex items-center gap-3 shrink-0 z-50">
            <div
              className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl border-4"
              style={{
                borderColor: "#f5a623",
                background: "#f5a62322",
                boxShadow: "0 0 16px #f5a62366",
              }}
            >
              {myProfilePicture || myPlayer?.avatar_url ? (
                <Image
                  src={myProfilePicture || myPlayer?.avatar_url || ""}
                  alt={myDisplayName || myPlayer?.display_name || "Avatar"}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span
                  className="text-lg font-black"
                  style={{ color: "#f5a623" }}
                >
                  {(myDisplayName || myPlayer?.display_name || "?")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div
                className="text-xs uppercase tracking-wider"
                style={{ color: "#7a4000" }}
              >
                My Profile
              </div>
              <div
                className="text-lg leading-tight font-bold"
                style={{ color: "#3d1a00" }}
              >
                {myDisplayName || myPlayer?.display_name || "USER"}
              </div>
              <div className="text-xs" style={{ color: "#7a4000" }}>
                {myCards.length} cards left
              </div>
            </div>
          </div>

          {/* Center: Hand cards */}
          <PlayerHand
            myCards={myCards}
            status={roomData.status}
            isMyTurn={isMyTurn}
            players={roomData.players ?? []}
            myPlayerToken={myPlayerToken}
            cardVersion={roomData.deck_config?.card_version ?? "classic"}
            expansions={roomData.deck_config?.expansions ?? []}
            onPlayCard={playCard}
            onPlayCombo={handlePlayCombo}
            nopeWindowActive={gamePhase === "NOPE_WINDOW"}
            onPlayNope={playNope}
          />

        </footer>
      </div>

      {/* ── DECK CONFIG MODAL ────────────────────────────────────────── */}
      {showDeckConfig && (
        <DeckConfigModal
          isOpen={showDeckConfig}
          roomId={roomId}
          currentCardVersion={roomData.deck_config?.card_version ?? "classic"}
          currentExpansions={roomData.deck_config?.expansions ?? []}
          onClose={() => setShowDeckConfig(false)}
          onSave={(cardVersion, expansions) =>
            updateDeckConfig(cardVersion, expansions)
          }
          onSaved={(cardVersion: string, expansions: string[]) => {
            console.log("Deck config updated", cardVersion, expansions);
            setShowDeckConfig(false);
          }}
        />
      )}

      {/* ── LEAVE CONFIRM MODAL ──────────────────────────────────────── */}
      {showLeaveConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowLeaveConfirm(false)}
        >
          <div
            className="flex flex-col items-center gap-6 rounded-2xl px-10 py-8"
            style={{
              background: "linear-gradient(160deg, #3d1f0a 0%, #1a0d04 100%)",
              border: "2px solid rgba(245,166,35,0.35)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
              fontFamily: "'Fredoka One', cursive",
              minWidth: 320,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-2xl font-black text-[#f5a623] mb-1">
                ออกจากห้อง?
              </div>
              <div className="text-sm text-[#c8a06a]">
                คุณจะถูกพาออกไปที่ Lobby
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <button
                className="flex-1 py-2.5 rounded-xl text-sm font-black tracking-wider uppercase transition-all"
                style={{
                  background: "rgba(120,70,10,0.25)",
                  border: "2px solid rgba(245,166,35,0.3)",
                  color: "#c8a06a",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(120,70,10,0.45)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(120,70,10,0.25)";
                }}
                onClick={() => setShowLeaveConfirm(false)}
              >
                ยกเลิก
              </button>
              <button
                className="flex-1 py-2.5 rounded-xl text-sm font-black tracking-wider uppercase transition-all"
                style={{
                  background: "linear-gradient(135deg, #c0392b 0%, #922b21 100%)",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 4px 0 #641e16",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "translateY(-2px)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 6px 0 #641e16";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "translateY(0)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 4px 0 #641e16";
                }}
                onMouseDown={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "translateY(2px)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 2px 0 #641e16";
                }}
                onMouseUp={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "translateY(-2px)";
                }}
                onClick={handleLeaveRoom}
              >
                ออกเลย
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}