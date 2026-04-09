import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Socket } from "socket.io-client";
import type { RoomData, CardHand } from "@/types";
import { FavorState, ComboState } from "./useGameActions";
import { useGameSocketEvents } from "./useGameSocketEvents";
import type { DrawAnimState } from "@/components/game/DrawCardAnimation";

export type GamePhase =
  | "WAITING"
  | "PLAYING"
  | "EK_DRAWN"
  | "DEFUSE_INSERT"
  | "IK_REVEAL"
  | "IK_INSERT"
  | "SEE_FUTURE"
  | "FAVOR_SELECT_TARGET"
  | "FAVOR_PICK_CARD"
  | "COMBO_SELECT_TARGET"
  | "COMBO_DEMAND_CARD"
  | "NOPE_WINDOW"
  | "TA_SELECT_TARGET"
  | "ALTER_FUTURE"
  | "GAME_OVER";

export interface EKBombState {
  drawnCard: string;
  hasDefuse: boolean;
}

export interface PendingActionState {
  playedBy: string;
  playedByDisplayName: string;
  cardCode?: string;
  comboCards?: string[];
  target?: string | null;
}

export interface NopeState {
  nopeCount: number;
  isCancel: boolean;
  lastPlayedByDisplayName: string;
}

export const useGameState = (socket: Socket | null, roomId: string) => {
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [cardHands, setCardHands] = useState<CardHand[]>([]);
  const [myCards, setMyCards] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameLogs, setGameLogs] = useState<string[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>("WAITING");
  const [ekBombState, setEkBombState] = useState<EKBombState | null>(null);
  const [seeTheFutureCards, setSeeTheFutureCards] = useState<string[]>([]);
  const [eliminatedPlayerId, setEliminatedPlayerId] = useState<string | null>(null);
  const [winner, setWinner] = useState<{ player_id: string; display_name: string } | null>(null);
  const [favorState, setFavorState] = useState<FavorState | null>(null);
  const [comboState, setComboState] = useState<ComboState | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingActionState | null>(null);
  const [nopeState, setNopeState] = useState<NopeState | null>(null);
  const [lastPlayedCard, setLastPlayedCard] = useState<{ cardCode: string; playedByDisplayName: string; seq?: number; noAnimate?: boolean } | null>(null);
  const lastPlayedCardSeqRef = useRef<number>(0);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [isDrawLocked, setIsDrawLocked] = useState<boolean>(false);

  const [deckCount, setDeckCount] = useState<number | null>(null);
  const [turnNumber, setTurnNumber] = useState<number>(0);
  const [pendingAttacks, setPendingAttacks] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const [ikOnTop, setIkOnTop] = useState<boolean>(false);
  const [drawAnimState, setDrawAnimState] = useState<DrawAnimState | null>(null);

  const roomDataRef = useRef<RoomData | null>(null);
  const currentTurnPlayerIdRef = useRef<string | null>(null);
  const pendingNextTurnRef = useRef<string | null>(null);
  const gamePhaseRef = useRef<GamePhase>("WAITING");
  const onCardPlayedRef = useRef<(() => void) | null>(null);
  // callback to run after DrawCardAnimation completes (used for EK/IK bomb reveal)
  const afterDrawAnimRef = useRef<(() => void) | null>(null);
  // callback to run after hellfire/implosion animation completes (used to defer popup)
  const afterHellfireRef = useRef<(() => void) | null>(null);

  useEffect(() => { roomDataRef.current = roomData; }, [roomData]);
  useEffect(() => { currentTurnPlayerIdRef.current = currentTurnPlayerId; }, [currentTurnPlayerId]);
  useEffect(() => { gamePhaseRef.current = gamePhase; }, [gamePhase]);

  // ── NOPE_WINDOW watchdog ────────────────────────────────────────────────
  // If the server's cardPlayed/actionCancelled event is missed (dropped packet,
  // brief reconnect, etc.) the UI stays frozen in NOPE_WINDOW. We auto-clear it
  // after 5 s so the game can continue. (Backend resolve fires at 3 s, Nope
  // window closes at 2.5 s, so 5 s is a safe upper limit.)
  useEffect(() => {
    if (gamePhase !== "NOPE_WINDOW") return;
    const watchdog = setTimeout(() => {
      if (gamePhaseRef.current === "NOPE_WINDOW") {
        console.warn("⚠️ NOPE_WINDOW watchdog: phase stuck, resetting to PLAYING");
        setGamePhase("PLAYING");
        setPendingAction(null);
        setNopeState(null);
      }
    }, 5000); // 5 s > 3 s backend timer → safe fallback
    return () => clearTimeout(watchdog);
  }, [gamePhase]);

  const setLastPlayedCardWithSeq = useCallback((card: { cardCode: string; playedByDisplayName: string; noAnimate?: boolean } | null) => {
    if (!card) { setLastPlayedCard(null); return; }
    lastPlayedCardSeqRef.current += 1;
    setLastPlayedCard({ ...card, seq: lastPlayedCardSeqRef.current });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setters = useMemo(() => ({
    setRoomData, setCardHands, setMyCards, setSessionId, setGameLogs,
    setGamePhase, setEkBombState, setSeeTheFutureCards, setEliminatedPlayerId,
    setWinner, setFavorState, setComboState, setPendingAction, setNopeState,
    setLastPlayedCard: setLastPlayedCardWithSeq, setCurrentTurnPlayerId, setDeckCount, setTurnNumber,
    setPendingAttacks, setDirection, setIkOnTop, setDrawAnimState, setIsDrawLocked,
    roomDataRef, currentTurnPlayerIdRef, pendingNextTurnRef,
    gamePhaseRef, onCardPlayedRef, afterDrawAnimRef, afterHellfireRef
    
  }), []);

  useGameSocketEvents(socket, roomId, setters);

  const augmentedRoomData = roomData
    ? {
        ...roomData,
        players: roomData.players?.map((p) => ({
          ...p,
          hand_count:
            cardHands.find((h) => h.player_id === p.player_id)?.card_count ??
            p.hand_count ??
            0,
        })),
      }
    : null;

  const setOnCardPlayed = (fn: () => void) => { onCardPlayedRef.current = fn; };

  return {
    roomData: augmentedRoomData,
    cardHands, setCardHands,
    myCards, setMyCards,
    gameLogs, setGameLogs,
    sessionId, setSessionId,
    gamePhase, setGamePhase,
    ekBombState, setEkBombState,
    seeTheFutureCards, setSeeTheFutureCards,
    eliminatedPlayerId, setEliminatedPlayerId,
    winner, setWinner,
    favorState, setFavorState,
    comboState, setComboState,
    pendingAction, setPendingAction,
    nopeState, setNopeState,
    isDrawLocked, setIsDrawLocked,
    lastPlayedCard, setLastPlayedCard,
    currentTurnPlayerId, setCurrentTurnPlayerId,
    pendingAttacks,
    direction, setDirection,
    ikOnTop, setIkOnTop,
    drawAnimState, setDrawAnimState,
    deckCount, setDeckCount,
    turnNumber, setTurnNumber,
    currentTurnPlayerIdRef, pendingNextTurnRef, roomDataRef,
    afterDrawAnimRef,
    afterHellfireRef,
    setOnCardPlayed,
  };
};