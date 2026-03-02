import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export const useRoomSocket = (roomId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomData, setRoomData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!roomId) return;

    const playerToken = localStorage.getItem("player_token");
    if (!playerToken) {
      setError("ไม่พบ Token ของผู้เล่น กรุณารีเฟรชหน้าเว็บ");
      return;
    }

    const newSocket = io(BACKEND_URL, {
      transports: ["websocket"],
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("🟢 Socket Connected!");
      setIsConnected(true);

      const displayName = localStorage.getItem("display_name") || "Player_" + Math.floor(Math.random() * 1000);
      
      newSocket.emit("joinRoom", { 
        roomId, 
        playerToken, 
        displayName 
      });
    });

    newSocket.on("roomUpdated", (updatedRoom) => {
      console.log("🔄 Room Updated:", updatedRoom);
      setRoomData(updatedRoom);
    });
    newSocket.on("errorMessage", (msg) => {
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

  const selectSeat = useCallback((seatNumber: number) => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    socket.emit("selectSeat", { roomId, playerToken, seatNumber });
  }, [socket, roomId]);

  return { 
    roomData, 
    isConnected, 
    error, 
    selectSeat 
  };
};