import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export interface Player {
  player_id: string;
  player_token: string;
  display_name: string;
  seat_number: number | null;
  role: string;
  profile_picture?: string | null;
}

export interface CardHand {
  hand_id: string;
  player_id: string;
  session_id: string;
  cards: string[];
  card_count: number;
}

interface RoomData {
  room_id: string;
  room_name: string;
  status: string;
  max_players: number;
  host_token: string;
  players: Player[];
  current_turn_player_id?: string | null;
}

export const useRoomSocket = (roomId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const currentTurnPlayerIdRef = useRef<string | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [cardHands, setCardHands] = useState<CardHand[]>([]);
  const [myCards, setMyCards] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [lastPlayedCard, setLastPlayedCard] = useState<{ cardCode: string; playedByDisplayName: string } | null>(null);
  const [gameLogs, setGameLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // รีเซ็ต timer เมื่อเปลี่ยน turn
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(30);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          const myToken = localStorage.getItem("player_token");
          const sock = socketRef.current;
          if (sock && myToken && currentTurnPlayerIdRef.current) {
            sock.emit("drawCard", { roomId, playerToken: myToken });
            console.log("⏰ Auto draw (time out)");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [roomId]);

  const myPlayerToken = typeof window !== "undefined" ? localStorage.getItem("player_token") : null;

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
        socketRef.current = newSocket;
      }, 0);
    }
    if (!newSocket) return;

    newSocket.on("connect", () => {
      console.log("🟢 Socket Connected!");
      setIsConnected(true);
      const displayName = localStorage.getItem("display_name") || "Player_" + Math.floor(Math.random() * 1000);
      newSocket.emit("joinRoom", { roomId, playerToken, displayName });
    });

    newSocket.on("roomUpdated", (updatedRoom: RoomData) => {
      console.log("🔄 Room Updated:", updatedRoom);
      setRoomData(prev => {
        if (updatedRoom.current_turn_player_id &&
            updatedRoom.current_turn_player_id !== prev?.current_turn_player_id) {
          setCurrentTurnPlayerId(updatedRoom.current_turn_player_id);
          currentTurnPlayerIdRef.current = updatedRoom.current_turn_player_id ?? null;
          resetTimer();
        }
        return updatedRoom;
      });
    });

    newSocket.on("gameStarted", (data: any) => {
      console.log("🎮 Game Started:", data);
      if (data?.room) setRoomData(data.room);
      if (data?.session_id) setSessionId(data.session_id);
      if (data?.first_turn_player_id) {
        setCurrentTurnPlayerId(data.first_turn_player_id);
        currentTurnPlayerIdRef.current = data.first_turn_player_id;
        resetTimer();
      }
      setGameLogs(["🎮 เกมเริ่มต้นแล้ว!"]);
      if (data?.cardHands && Array.isArray(data.cardHands)) {
        setCardHands(data.cardHands);
        const myToken = localStorage.getItem("player_token");
        const myPlayer = data.room?.players?.find((p: Player) => p.player_token === myToken);
        if (myPlayer) {
          const myHand = data.cardHands.find((h: CardHand) => h.player_id === myPlayer.player_id);
          if (myHand) {
            console.log("🃏 My Cards:", myHand.cards);
            setMyCards(myHand.cards);
          }
        }
      }
    });

    newSocket.on("cardPlayed", (data: any) => {
      console.log("🎴 Card Played:", data);
      if (data?.hand?.cards && data?.playedByPlayerId) {
        const myToken = localStorage.getItem("player_token");
        setRoomData(prev => {
          if (!prev) return prev;
          const me = prev.players.find((p: any) => p.player_token === myToken);
          if (me && (me as any).player_id === data.playedByPlayerId) {
            setMyCards(data.hand.cards);
          }
          return prev;
        });
      }
      if (data?.cardCode) {
        setLastPlayedCard({
          cardCode: data.cardCode,
          playedByDisplayName: data.playedByDisplayName ?? "",
        });
      }
      if (data?.cardCode && data?.playedByDisplayName) {
        setGameLogs(prev => [...prev.slice(-19), `🎴 ${data.playedByDisplayName} เล่น ${data.cardCode}`]);
      }
    });

    newSocket.on("cardDrawn", (data: any) => {
      console.log("🃏 Card Drawn:", data);
      if (data?.hand?.cards && data?.drawnByPlayerId) {
        const myToken = localStorage.getItem("player_token");
        setRoomData(prev => {
          if (!prev) return prev;
          const me = prev.players.find((p: any) => p.player_token === myToken);
          if (me && (me as any).player_id === data.drawnByPlayerId) {
            setMyCards(data.hand.cards);
          }
          return prev;
        });
      }
      if (data?.nextTurn?.player_id) {
        setCurrentTurnPlayerId(data.nextTurn.player_id);
        currentTurnPlayerIdRef.current = data.nextTurn.player_id;
        resetTimer();
      }
      if (data?.success) {
        const nextTurnDisplay = data.nextTurn?.display_name ?? "";
        const logMsg = data.action === "TURN_ADVANCED"
          ? `🃏 จั่วไพ่ → ตา ${nextTurnDisplay}`
          : data.action === "DREW_EXPLODING_KITTEN"
            ? data.hasDefuse ? `💣 จั่ว EK! มี Defuse!` : `💥 จั่ว EK! ไม่มี Defuse!`
            : `🃏 จั่วไพ่`;
        setGameLogs(prev => [...prev.slice(-19), logMsg]);
      }
    });

    newSocket.on("errorMessage", (msg: string) => {
      console.error("❌ Socket Error:", msg);
      setError(msg);
      alert(`แจ้งเตือน: ${msg}`);
    });

    newSocket.on("disconnect", () => {
      console.log("🔴 Socket Disconnected");
      setIsConnected(false);
    });

    return () => {
      newSocket.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roomId]);

  const selectSeat = useCallback((seatNumber: number) => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    if (seatNumber < 0) {
      socket.emit("unseatPlayer", { roomId, playerToken });
    } else {
      socket.emit("selectSeat", { roomId, playerToken, seatNumber });
    }
  }, [socket, roomId]);

  const startGame = useCallback(() => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    socket.emit("startGame", { roomId, playerToken });
  }, [socket, roomId]);

  const drawCard = useCallback(() => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    socket.emit("drawCard", { roomId, playerToken });
  }, [socket, roomId]);

  const playCard = useCallback((cardCode: string, targetPlayerToken?: string) => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    socket.emit("playCard", { roomId, playerToken, cardCode, targetPlayerToken });
  }, [socket, roomId]);

  return {
    roomData,
    isConnected,
    error,
    cardHands,
    myCards,
    gameLogs,
    sessionId,
    currentTurnPlayerId,
    timeLeft,
    lastPlayedCard,
    selectSeat,
    startGame,
    drawCard,
    playCard,
  };
};