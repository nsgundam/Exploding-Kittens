import { useEffect, useState, useRef, useMemo } from "react";
import { Socket } from "socket.io-client";
import type { RoomData, CardHand } from "@/types";
import { FavorState, ComboState } from "./useGameActions";
import { useGameSocketEvents } from "./useGameSocketEvents";

export type GamePhase =
  | "WAITING"
  | "PLAYING"
  | "EK_DRAWN"
  | "DEFUSE_INSERT"
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
  const [lastPlayedCard, setLastPlayedCard] = useState<{ cardCode: string; playedByDisplayName: string } | null>(null);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [deckCount, setDeckCount] = useState<number | null>(null);
  const [turnNumber, setTurnNumber] = useState<number>(0);
  const [pendingAttacks, setPendingAttacks] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);

  const roomDataRef = useRef<RoomData | null>(null);
  const currentTurnPlayerIdRef = useRef<string | null>(null);
  const pendingNextTurnRef = useRef<string | null>(null);
  const gamePhaseRef = useRef<GamePhase>("WAITING");
  const onCardPlayedRef = useRef<(() => void) | null>(null);

  useEffect(() => { roomDataRef.current = roomData; }, [roomData]);
  useEffect(() => { currentTurnPlayerIdRef.current = currentTurnPlayerId; }, [currentTurnPlayerId]);
  useEffect(() => { gamePhaseRef.current = gamePhase; }, [gamePhase]);

  const setters = useMemo(() => ({
    setRoomData, setCardHands, setMyCards, setSessionId, setGameLogs,
    setGamePhase, setEkBombState, setSeeTheFutureCards, setEliminatedPlayerId,
    setWinner, setFavorState, setComboState, setPendingAction, setNopeState,
    setLastPlayedCard, setCurrentTurnPlayerId, setDeckCount, setTurnNumber,
    setPendingAttacks, setDirection, roomDataRef, currentTurnPlayerIdRef, pendingNextTurnRef,
    gamePhaseRef, onCardPlayedRef
    
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
    lastPlayedCard, setLastPlayedCard,
    currentTurnPlayerId, setCurrentTurnPlayerId,
    pendingAttacks,
    direction, setDirection,
    deckCount, setDeckCount,
    turnNumber, setTurnNumber,
    currentTurnPlayerIdRef, pendingNextTurnRef, roomDataRef,
    setOnCardPlayed,
  };
};