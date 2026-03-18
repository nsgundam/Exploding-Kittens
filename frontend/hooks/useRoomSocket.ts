import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type {
  Player,
  RoomData,
  CardHand,
  GameStartedPayload,
  CardDrawnPayload,
  CardPlayedPayload,
  DeckConfigChangedPayload,
} from "@/types";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
// ── Game Phase — tracks current UI state during gameplay ──
export type GamePhase =
  | "WAITING"
  | "PLAYING"
  | "EK_DRAWN"       // Player drew Exploding Kitten — show bomb sequence
  | "DEFUSE_INSERT"   // Player used Defuse — choosing where to insert EK
  | "SEE_FUTURE"      // Player played See The Future — showing top 3 cards
  | "GAME_OVER";      // Game ended — show winner
export interface EKBombState {
  drawnCard: string;
  hasDefuse: boolean;
}
export const useRoomSocket = (roomId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [cardHands, setCardHands] = useState<CardHand[]>([]);
  const [myCards, setMyCards] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameLogs, setGameLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gamePhase, setGamePhase] = useState<GamePhase>("WAITING");
  const [ekBombState, setEkBombState] = useState<EKBombState | null>(null);
  const [seeTheFutureCards, setSeeTheFutureCards] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [lastPlayedCard, setLastPlayedCard] = useState<{ cardCode: string; playedByDisplayName: string } | null>(null);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [deckCount, setDeckCount] = useState<number | null>(null);
  // Store roomData in a ref to avoid callback dependency loops or double-invocations in Strict Mode
  const roomDataRef = useRef<RoomData | null>(null);
  useEffect(() => {
    roomDataRef.current = roomData;
  }, [roomData]);
  useEffect(() => {
    if (!roomId) return;
    const playerToken = localStorage.getItem("player_token");
    if (!playerToken) {
      setTimeout(() => {
        setError("ไม่พบ Token ของผู้เล่น กรุณารีเฟรชหน้าเว็บ");
      }, 0);
      return;
    }
    const newSocket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      upgrade: false,
    });
    if (newSocket) {
      setTimeout(() => {
        setSocket(newSocket);
      }, 0);
    }
    if (!newSocket) return;
    // ── connect ──
    newSocket.on("connect", () => {
      console.log("🟢 Socket Connected!");
      setIsConnected(true);
      const displayName = localStorage.getItem("display_name") || "Player_" + Math.floor(Math.random() * 1000);
      newSocket.emit("joinRoom", {
        roomId,
        playerToken,
        displayName,
      });
    });
    // ── roomUpdated ──
    newSocket.on("roomUpdated", (updatedRoom: RoomData) => {
      console.log("🔄 Room Updated:", updatedRoom);
      setRoomData(updatedRoom);
      // Update game phase based on room status
      if (updatedRoom.status === "WAITING") {
        setGamePhase("WAITING");
      } else if (updatedRoom.status === "PLAYING" && gamePhase === "WAITING") {
        setGamePhase("PLAYING");
      }
    });
    // ── gameStarted ──
    newSocket.on("gameStarted", (data: GameStartedPayload & { deck_count?: number }) => {
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
        const myPlayer = data.room?.players?.find(
          (p: Player) => p.player_token === myPlayerToken
        );
        if (myPlayer) {
          const myHand = data.cardHands.find(
            (h: CardHand) => h.player_id === myPlayer.player_id
          );
          if (myHand) {
            console.log("🃏 My Cards:", myHand.cards);
            setMyCards(myHand.cards);
          }
        }
      }
    });
    // ── cardDrawn ──
    newSocket.on("cardDrawn", (data: CardDrawnPayload & { deck_count?: number }) => {
      console.log("🃏 Card Drawn:", data);
      if (data?.deck_count !== undefined) setDeckCount(data.deck_count);
      // Track card hands changes
      if (data?.player_id) {
        setCardHands(prev => prev.map(hand => {
          if (hand.player_id === data.player_id) {
            return {
              ...hand,
              card_count: hand.card_count + 1,
              cards: data.hand?.cards ?? hand.cards
            };
          }
          return hand;
        }));
      }
      const drawnPlayer = roomDataRef.current?.players?.find((p: Player) => p.player_id === data.player_id);
      const displayName = data.drawnByDisplayName || drawnPlayer?.display_name || "ผู้เล่น";
      if (data?.action === "DREW_EXPLODING_KITTEN") {
        setEkBombState({
          drawnCard: data.drawnCard ?? "EK",
          hasDefuse: data.hasDefuse ?? false,
        });
        setGamePhase("EK_DRAWN");
        setGameLogs(prevLogs => [...prevLogs.slice(-19), `💣 ${displayName} จั่วได้ Exploding Kitten!`]);
      } else if (data?.success) {
        const logMsg = data.isExplodingKitten
          ? data.eliminated
            ? `💥 ${displayName} ระเบิด!`
            : `🛡️ ${displayName} defuse ได้!`
          : `🃏 ${displayName} จั่วไพ่`;
        setGameLogs(prevLogs => [...prevLogs.slice(-19), logMsg]);
      }
      // Advance turn if provided
      if (data?.nextTurn) {
        setGamePhase("PLAYING");
        setEkBombState(null);
        setCurrentTurnPlayerId(data.nextTurn.player_id);
      }
    });
    // ── cardPlayed ──
    newSocket.on("cardPlayed", (data: CardPlayedPayload & { nextTurn?: { player_id: string } }) => {
      console.log("🎴 Card Played:", data);
      // Update opponent card hands (reduce card count)
      if (data?.playedBy) {
        setCardHands(prev => prev.map(hand => {
          if (hand.player_id === data.playedBy) {
            return { ...hand, card_count: Math.max(0, hand.card_count - 1) };
          }
          return hand;
        }));
      }
      if (data?.success) {
        const playedPlayer = roomDataRef.current?.players?.find((p: Player) => p.player_id === data.playedBy);
        const displayName = data.playedByDisplayName || playedPlayer?.display_name || "ผู้เล่น";
        const logMsg = data.message || `${displayName} เล่นไพ่ ${data.cardCode}`;
        setGameLogs(prevLogs => [...prevLogs.slice(-19), `🎴 ${logMsg}`]);
        setLastPlayedCard({ cardCode: data.cardCode, playedByDisplayName: displayName });
        if (data?.nextTurn?.player_id) {
          setCurrentTurnPlayerId(data.nextTurn.player_id);
        }
      }
    });
    // ── deck_config_changed ──
    newSocket.on("deck_config_changed", (data: DeckConfigChangedPayload) => {
      console.log("⚙️ Deck Config Changed:", data);
      const versionName = data.card_version === "good_and_evil" ? "Good vs. Evil" : "Original";
      const addonLabel = data.expansions?.addons?.includes("imploding_kittens")
        ? " + Imploding Kittens"
        : "";
      setGameLogs(prev => [...prev.slice(-19), `⚙️ Deck เปลี่ยนเป็น ${versionName}${addonLabel}`]);
    });
    // ── errorMessage ──
    newSocket.on("errorMessage", (msg: string) => {
      console.error("❌ Socket Error:", msg);
      // Removed setError(msg) to prevent fatal Lobby redirect loop for normal game alerts
      alert(`แจ้งเตือน: ${msg}`);
    });
    // ── disconnect ──
    newSocket.on("disconnect", () => {
      console.log("🔴 Socket Disconnected");
      setIsConnected(false);
    });
    return () => {
      newSocket.off("connect");
      newSocket.off("roomUpdated");
      newSocket.off("gameStarted");
      newSocket.off("cardDrawn");
      newSocket.off("cardPlayed");
      newSocket.off("deck_config_changed");
      newSocket.off("errorMessage");
      newSocket.off("disconnect");
      newSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);
  // ── selectSeat / unseatPlayer ──
  const selectSeat = useCallback((seatNumber: number) => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    if (seatNumber < 0) {
      socket.emit("unseatPlayer", { roomId, playerToken });
    } else {
      socket.emit("selectSeat", { roomId, playerToken, seatNumber });
    }
  }, [socket, roomId]);
  // ── startGame (host only) ──
  const startGame = useCallback(() => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    socket.emit("startGame", { roomId, playerToken });
  }, [socket, roomId]);
  // ── drawCard ──
  const drawCard = useCallback(() => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    socket.emit("drawCard", { roomId, playerToken });
  }, [socket, roomId]);
  // ── playCard ──
  const playCard = useCallback((cardCode: string, targetPlayerToken?: string) => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    socket.emit("playCard", { roomId, playerToken, cardCode, targetPlayerToken });
    // Optimistically remove the card from our own hand
    setMyCards(prev => {
      const idx = prev.indexOf(cardCode);
      if (idx !== -1) {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      return prev;
    });
  }, [socket, roomId]);
  // Handle timer
  useEffect(() => {
    setTimeLeft(30);
    let interval: NodeJS.Timeout;
    if (gamePhase === "PLAYING" && currentTurnPlayerId) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentTurnPlayerId, gamePhase]);
  // ── leaveRoom ──
  const leaveRoom = useCallback(() => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    socket.emit("leaveRoom", { roomId, playerToken });
  }, [socket, roomId]);
  // Merge dynamic hand_count into roomData before returning
  const augmentedRoomData = roomData ? {
    ...roomData,
    players: roomData.players?.map(p => ({
      ...p,
      hand_count: cardHands.find(h => h.player_id === p.player_id)?.card_count ?? p.hand_count ?? 0
    }))
  } : null;
  return {
    roomData: augmentedRoomData,
    isConnected,
    error,
    cardHands,
    myCards,
    gameLogs,
    sessionId,
    gamePhase,
    ekBombState,
    seeTheFutureCards,
    setSeeTheFutureCards,
    selectSeat,
    startGame,
    drawCard,
    playCard,
    leaveRoom,
    timeLeft,
    currentTurnPlayerId,
    lastPlayedCard,
    deckCount,
  };
};