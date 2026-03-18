import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export interface Player {
  player_id: string;
  player_token: string;
  display_name: string;
  seat_number: number | null;
  role: string;
  profile_picture?: string | null;
  avatar_url?: string | null;
  hand_count?: number;
  session_id?: string;
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
  deck_name?: string;
  time_left?: number;
  deck_count?: number;
  current_turn_seat?: number | null;
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

    newSocket.on("roomUpdated", (updatedRoom: RoomData) => {
      console.log("🔄 Room Updated:", updatedRoom);
      setRoomData(updatedRoom);
    });

    newSocket.on("gameStarted", (data: { room: RoomData, session_id: string, first_turn_player_id: string, cardHands: CardHand[] }) => {
      console.log("🎮 Game Started:", data);

      if (data?.room) setRoomData(data.room);
      if (data?.session_id) setSessionId(data.session_id);

      // Reset logs และเพิ่ม log เริ่มเกม
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

    newSocket.on("cardDrawn", (data: { hand?: { cards: string[] }, success?: boolean, drawnByDisplayName?: string, isExplodingKitten?: boolean, eliminated?: boolean }) => {
      console.log("🃏 Card Drawn:", data);
      if (data?.hand?.cards) {
        setMyCards(data.hand.cards);
      }
      // อัปเดต log
      if (data?.success) {
        const displayName = data.drawnByDisplayName || localStorage.getItem("display_name") || "ผู้เล่น";
        const logMsg = data.isExplodingKitten
          ? data.eliminated
            ? `💥 ${displayName} ระเบิด!`
            : `🛡️ ${displayName} defuse ได้!`
          : `🃏 ${displayName} จั่วไพ่`;
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
    };
  }, [roomId]);

  // นั่ง / ลุกจากที่นั่ง
  const selectSeat = useCallback((seatNumber: number) => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");

    if (seatNumber < 0) {
      socket.emit("unseatPlayer", { roomId, playerToken });
    } else {
      socket.emit("selectSeat", { roomId, playerToken, seatNumber });
    }
  }, [socket, roomId]);

  // เริ่มเกม (เฉพาะ host)
  const startGame = useCallback(() => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    socket.emit("startGame", { roomId, playerToken });
  }, [socket, roomId]);

  // จั่วไพ่
  const drawCard = useCallback(() => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    socket.emit("drawCard", { roomId, playerToken });
  }, [socket, roomId]);

  return {
    roomData,
    isConnected,
    error,
    cardHands,
    myCards,
    gameLogs,
    sessionId,
    selectSeat,
    startGame,
    drawCard,
  };
};