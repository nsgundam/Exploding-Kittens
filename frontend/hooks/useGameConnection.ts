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
      const profilePicture = localStorage.getItem("profile_picture");
      newSocket.emit("joinRoom", {
        roomId,
        playerToken,
        displayName,
        profilePicture,
      });
    });

    newSocket.on("errorMessage", (msg: string) => {
      console.error("❌ Socket Error:", msg);
      // Use non-blocking toast instead of alert() to prevent freezing socket event processing
      if (typeof window !== "undefined") {
        const toast = document.createElement("div");
        toast.textContent = `⚠️ ${msg}`;
        Object.assign(toast.style, {
          position: "fixed", top: "20px", left: "50%",
          transform: "translateX(-50%) translateY(-80px)",
          background: "rgba(180,20,20,0.95)", color: "#fff",
          padding: "12px 24px", borderRadius: "12px",
          border: "1.5px solid rgba(255,100,100,0.5)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          fontFamily: "'Fredoka One', cursive", fontSize: "14px",
          zIndex: "99999", transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
          opacity: "0", whiteSpace: "nowrap", maxWidth: "80vw",
        });
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
          toast.style.transform = "translateX(-50%) translateY(0)";
          toast.style.opacity = "1";
        });
        setTimeout(() => {
          toast.style.transform = "translateX(-50%) translateY(-80px)";
          toast.style.opacity = "0";
          setTimeout(() => { if (document.body.contains(toast)) document.body.removeChild(toast); }, 400);
        }, 4000);
      }
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
