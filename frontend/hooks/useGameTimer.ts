import { useEffect, useState, useRef, RefObject } from "react";
import { Socket } from "socket.io-client";
import { GamePhase } from "./useGameState";
import { Player, RoomData } from "@/types";

export const useGameTimer = (
  socket: Socket | null,
  roomId: string,
  gamePhase: GamePhase,
  currentTurnPlayerId: string | null,
  roomDataRef: RefObject<RoomData | null>,
  turnNumber: number,
  serverRemainingTime?: number | null,
) => {
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const timeLeftRef = useRef(30);
  const hasAutoDrawnThisTurnRef = useRef(false);

  // cardPlayedRef — เพิ่ม counter ทุกครั้งที่มีการเล่นการ์ด
  // ใช้ reset timer โดยไม่ต้อง re-mount effect ทั้งหมด
  const cardPlayedCountRef = useRef(0);
  const lastCardPlayedCountRef = useRef(0);

  useEffect(() => {
    // Reset timer เมื่อ turn เปลี่ยนหรือ phase เปลี่ยน
    // หรือใช้ค่า remainingTime จาก Server ถ้ามีการส่งมา (กรณี reconnect)
    const initialTime = serverRemainingTime !== null && serverRemainingTime !== undefined ? serverRemainingTime : 30;
    timeLeftRef.current = initialTime;
    hasAutoDrawnThisTurnRef.current = false;
    lastCardPlayedCountRef.current = cardPlayedCountRef.current;

    const resetTimeout = setTimeout(() => {
      setTimeLeft(initialTime);
    }, 0);

    let interval: NodeJS.Timeout;
    if (gamePhase === "PLAYING" && currentTurnPlayerId) {
      interval = setInterval(() => {
        // ถ้ามีการเล่นการ์ดใหม่ (cardPlayedCountRef เปลี่ยน) → reset timer
        if (cardPlayedCountRef.current !== lastCardPlayedCountRef.current) {
          lastCardPlayedCountRef.current = cardPlayedCountRef.current;
          timeLeftRef.current = 30;
          hasAutoDrawnThisTurnRef.current = false;
          setTimeLeft(30);
          return;
        }

        if (timeLeftRef.current > 0) {
          timeLeftRef.current -= 1;
          setTimeLeft(timeLeftRef.current);
        }

        if (timeLeftRef.current === 0 && !hasAutoDrawnThisTurnRef.current) {
          const myToken = localStorage.getItem("player_token");
          const myPlayer = roomDataRef.current?.players?.find(
            (p: Player) => p.player_token === myToken
          );

          if (
            myPlayer &&
            myPlayer.player_id === currentTurnPlayerId &&
            myPlayer.is_alive !== false
          ) {
            hasAutoDrawnThisTurnRef.current = true;
            socket?.emit("drawCard", {
              roomId,
              playerToken: myToken,
              isAutoDraw: true,
            });
          }
        }
      }, 1000);
    }
    return () => {
      clearInterval(interval);
      clearTimeout(resetTimeout);
    };
  }, [currentTurnPlayerId, gamePhase, roomId, socket, roomDataRef, turnNumber, serverRemainingTime]);

  // cardPlayed — เรียกจากภายนอกเพื่อ reset timer เมื่อมีการเล่นการ์ด
  const onCardPlayed = () => {
    cardPlayedCountRef.current += 1;
  };

  return { timeLeft, onCardPlayed };
};