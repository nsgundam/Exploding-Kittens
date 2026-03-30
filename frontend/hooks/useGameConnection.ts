import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:4000";

export const useGameConnection = (roomId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const playerToken = localStorage.getItem("player_token");
    if (!playerToken) {
      setTimeout(() => setError("ไม่พบ Token ของผู้เล่น กรุณารีเฟรชหน้าเว็บ"), 0);
      return;
    }

    const newSocket = io(BACKEND_URL, {
      reconnectionAttempts: 5,
    });

    if (newSocket) {
      setTimeout(() => setSocket(newSocket), 0);
    }

    newSocket.on("connect", () => {
      console.log("🟢 Socket Connected!");
      setIsConnected(true);
      const displayName =
        localStorage.getItem("display_name") ||
        "Player_" + Math.floor(Math.random() * 1000);
      newSocket.emit("joinRoom", {
        roomId,
        playerToken,
        displayName,
      });
    });

    newSocket.on("errorMessage", (msg: string) => {
      console.error("❌ Socket Error:", msg);
      alert(`แจ้งเตือน: ${msg}`);
    });

    newSocket.on("disconnect", () => {
      console.log("🔴 Socket Disconnected");
      setIsConnected(false);
    });

    return () => {
      newSocket.off("connect");
      newSocket.off("errorMessage");
      newSocket.off("disconnect");
      setTimeout(() => {
        newSocket.disconnect();
      }, 100);
    };
  }, [roomId]);

  return { socket, isConnected, error };
};
