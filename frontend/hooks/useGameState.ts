import { useEffect, useState, useRef } from "react";
import { Socket } from "socket.io-client";
import type {
  Player,
  RoomData,
  CardHand,
  GameStartedPayload,
  CardDrawnPayload,
  CardPlayedPayload,
  DeckConfigChangedPayload,
  CardDefusedPayload,
  PlayerEliminatedPayload,
  EKInsertedPayload,
} from "@/types";

export type GamePhase =
  | "WAITING"
  | "PLAYING"
  | "EK_DRAWN"
  | "DEFUSE_INSERT"
  | "SEE_FUTURE"
  | "GAME_OVER";

export interface EKBombState {
  drawnCard: string;
  hasDefuse: boolean;
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
  const [lastPlayedCard, setLastPlayedCard] = useState<{ cardCode: string; playedByDisplayName: string } | null>(null);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [deckCount, setDeckCount] = useState<number | null>(null);

  const roomDataRef = useRef<RoomData | null>(null);
  const currentTurnPlayerIdRef = useRef<string | null>(null);
  const pendingNextTurnRef = useRef<string | null>(null);

  useEffect(() => { roomDataRef.current = roomData; }, [roomData]);
  useEffect(() => { currentTurnPlayerIdRef.current = currentTurnPlayerId; }, [currentTurnPlayerId]);

  useEffect(() => {
    if (!socket || !roomId) return;

    // ── roomUpdated ──
    const handleRoomUpdated = (updatedRoom: RoomData) => {
      console.log("🔄 Room Updated:", updatedRoom);
      setRoomData(updatedRoom);
      if (updatedRoom.status === "WAITING") {
        setGamePhase("WAITING");
      } else if (updatedRoom.status === "PLAYING" && gamePhase === "WAITING") {
        setGamePhase("PLAYING");
      }
    };

    // ── gameStarted ──
    const handleGameStarted = (data: GameStartedPayload & { deck_count?: number }) => {
      console.log("🎮 Game Started:", data);
      if (data?.room) setRoomData(data.room);
      if (data?.session_id) setSessionId(data.session_id);
      if (data?.first_turn_player_id) setCurrentTurnPlayerId(data.first_turn_player_id);
      if (data?.deck_count !== undefined) setDeckCount(data.deck_count);
      setGamePhase("PLAYING");
      setGameLogs(["🎮 เกมเริ่มต้นแล้ว!"]);

      if (data?.cardHands && Array.isArray(data.cardHands)) {
        setCardHands(data.cardHands);
        const myPlayerToken = localStorage.getItem("player_token");
        const myPlayer = data.room?.players?.find((p: Player) => p.player_token === myPlayerToken);
        if (myPlayer) {
          const myHand = data.cardHands.find((h: CardHand) => h.player_id === myPlayer.player_id);
          if (myHand) {
            console.log("🃏 My Cards:", myHand.cards);
            setMyCards(myHand.cards);
          }
        }
      }
    };

    // ── cardDrawn ──
    const handleCardDrawn = (data: CardDrawnPayload & { deck_count?: number }) => {
      console.log("🃏 Card Drawn:", data);
      if (data?.deck_count !== undefined) setDeckCount(data.deck_count);
      
      if (data?.player_id) {
        setCardHands((prev) =>
          prev.map((hand) => {
            if (hand.player_id === data.player_id) {
              return { ...hand, card_count: hand.card_count + 1, cards: data.hand?.cards ?? hand.cards };
            }
            return hand;
          }),
        );
        const myPlayerToken = localStorage.getItem("player_token");
        const myPlayer = roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);
        if (myPlayer && myPlayer.player_id === data.player_id && data.hand?.cards) {
          setMyCards(data.hand.cards);
        }
      }

      const drawnPlayer = roomDataRef.current?.players?.find((p: Player) => p.player_id === data.player_id);
      const displayName = data.drawnByDisplayName || drawnPlayer?.display_name || "ผู้เล่น";
      
      if (data?.action === "DREW_EXPLODING_KITTEN") {
        setEkBombState({ drawnCard: data.drawnCard ?? "EK", hasDefuse: data.hasDefuse ?? false });
        setGamePhase("EK_DRAWN");
        setGameLogs((prev) => [...prev.slice(-19), `💣 ${displayName} จั่วได้ Exploding Kitten!`]);
      } else if (data?.success) {
        const logMsg = data.isExplodingKitten
          ? data.eliminated ? `💥 ${displayName} ระเบิด!` : `🛡️ ${displayName} defuse ได้!`
          : data.isAutoDraw ? `⏱️ ${displayName} จั่วไพ่อัตโนมัติ (หมดเวลา)` : `🃏 ${displayName} จั่วไพ่`;
        setGameLogs((prev) => [...prev.slice(-19), logMsg]);
      }

      if (data?.nextTurn) {
        setGamePhase("PLAYING");
        setEkBombState(null);
        setCurrentTurnPlayerId(data.nextTurn.player_id);
      }
    };

    // ── cardPlayed ──
    const handleCardPlayed = (data: CardPlayedPayload & { nextTurn?: { player_id: string } }) => {
      console.log("🎴 Card Played:", data);
      if (data?.playedBy) {
        setCardHands((prev) =>
          prev.map((hand) => {
            if (hand.player_id === data.playedBy) {
              return { ...hand, card_count: Math.max(0, hand.card_count - 1) };
            }
            return hand;
          }),
        );
      }
      if (data?.success) {
        const playedPlayer = roomDataRef.current?.players?.find((p: Player) => p.player_id === data.playedBy);
        const displayName = data.playedByDisplayName || playedPlayer?.display_name || "ผู้เล่น";
        const logMsg = data.message || `${displayName} เล่นไพ่ ${data.cardCode}`;
        
        setGameLogs((prev) => [...prev.slice(-19), `🎴 ${logMsg}`]);
        setLastPlayedCard({ cardCode: data.cardCode, playedByDisplayName: displayName });
        
        if (data?.nextTurn?.player_id) {
          setCurrentTurnPlayerId(data.nextTurn.player_id);
        }

        if (data.effect?.type === "SEE_THE_FUTURE" && data.effect.topCards && data.effect.topCards.length > 0) {
          setSeeTheFutureCards(data.effect.topCards);
          setGamePhase("SEE_FUTURE");
        }
      }
    };

    // ── deck_config_changed ──
    const handleDeckConfigChanged = (data: DeckConfigChangedPayload) => {
      console.log("⚙️ Deck Config Changed:", data);
      const versionName = data.card_version === "good_and_evil" ? "Good vs. Evil" : "Original";
      const addonLabel = data.expansions?.addons?.includes("imploding_kittens") ? " + Imploding Kittens" : "";
      setGameLogs((prev) => [...prev.slice(-19), `⚙️ Deck เปลี่ยนเป็น ${versionName}${addonLabel}`]);
    };

    // ── cardDefused ──
    const handleCardDefused = (data: CardDefusedPayload) => {
      console.log("🛡️ Card Defused:", data);
      setEkBombState(null);
      
      const myPlayerToken = localStorage.getItem("player_token");
      const me = roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);
      const defuserPlayerId = currentTurnPlayerIdRef.current;
      const isMe = me && me.player_id === defuserPlayerId;

      if (isMe) {
        setGamePhase("DEFUSE_INSERT");
        pendingNextTurnRef.current = data?.nextTurn?.player_id ?? null;
        setMyCards((prev) => {
          const dfCode = prev.includes("GVE_DF") ? "GVE_DF" : "DF";
          const idx = prev.indexOf(dfCode);
          if (idx !== -1) {
            const next = [...prev];
            next.splice(idx, 1);
            return next;
          }
          return prev;
        });
      } else {
        setGamePhase("PLAYING");
        if (data?.nextTurn?.player_id) setCurrentTurnPlayerId(data.nextTurn.player_id);
      }

      const defusingPlayer = roomDataRef.current?.players?.find((p: Player) => p.player_id === defuserPlayerId);
      const displayName = defusingPlayer?.display_name ?? "ผู้เล่น";
      setGameLogs((prev) => [...prev.slice(-19), `🛡️ ${displayName} กู้ระเบิดสำเร็จ!`]);
    };

    // ── ekInserted ──
    const handleEkInserted = (data: EKInsertedPayload) => {
      console.log("💣 EK Inserted:", data);
      if (data?.deck_count !== undefined) setDeckCount(data.deck_count);
      setGamePhase("PLAYING");
      setEkBombState(null);
      if (data?.nextTurn?.player_id) setCurrentTurnPlayerId(data.nextTurn.player_id);
      setGameLogs((prev) => [...prev.slice(-19), `💣 Exploding Kitten ถูกใส่กลับคืนกอง!`]);
    };

    // ── playerEliminated ──
    const handlePlayerEliminated = (data: PlayerEliminatedPayload) => {
      console.log("💀 Player Eliminated:", data);
      setEkBombState(null);
      setGamePhase(data.action === "GAME_OVER" ? "GAME_OVER" : "PLAYING");

      const eliminatedId = currentTurnPlayerIdRef.current;
      if (eliminatedId) {
        setEliminatedPlayerId(eliminatedId);
        setRoomData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            players: prev.players?.map((p: Player) =>
              p.player_id === eliminatedId ? { ...p, is_alive: false } : p,
            ),
          };
        });
      }

      if (data.action === "GAME_OVER" && data?.winner) setWinner(data.winner);
      if (data?.nextTurn?.player_id) setCurrentTurnPlayerId(data.nextTurn.player_id);

      const eliminatedPlayer = roomDataRef.current?.players?.find((p: Player) => p.player_id === eliminatedId);
      const displayName = eliminatedPlayer?.display_name ?? "ผู้เล่น";
      setGameLogs((prev) => [...prev.slice(-19), `💥 ${displayName} ระเบิด!`]);
    };

    socket.on("roomUpdated", handleRoomUpdated);
    socket.on("gameStarted", handleGameStarted);
    socket.on("cardDrawn", handleCardDrawn);
    socket.on("cardPlayed", handleCardPlayed);
    socket.on("deck_config_changed", handleDeckConfigChanged);
    socket.on("cardDefused", handleCardDefused);
    socket.on("ekInserted", handleEkInserted);
    socket.on("playerEliminated", handlePlayerEliminated);

    return () => {
      socket.off("roomUpdated", handleRoomUpdated);
      socket.off("gameStarted", handleGameStarted);
      socket.off("cardDrawn", handleCardDrawn);
      socket.off("cardPlayed", handleCardPlayed);
      socket.off("deck_config_changed", handleDeckConfigChanged);
      socket.off("cardDefused", handleCardDefused);
      socket.off("ekInserted", handleEkInserted);
      socket.off("playerEliminated", handlePlayerEliminated);
    };
  }, [socket, roomId, gamePhase]); // gamePhase needed for conditional handling in roomUpdated

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
    lastPlayedCard, setLastPlayedCard,
    currentTurnPlayerId, setCurrentTurnPlayerId,
    deckCount, setDeckCount,
    currentTurnPlayerIdRef, pendingNextTurnRef, roomDataRef
  };
};
