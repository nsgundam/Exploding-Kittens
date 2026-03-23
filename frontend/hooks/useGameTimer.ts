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
  lastPlayedCard: { cardCode: string; playedByDisplayName: string } | null,
) => {
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const timeLeftRef = useRef(30);
  const hasAutoDrawnThisTurnRef = useRef(false);

  useEffect(() => {
    const resetTimeuot = setTimeout(() => {
      setTimeLeft(30);
    }, 0);

    let interval: NodeJS.Timeout;
    if (gamePhase === "PLAYING" && currentTurnPlayerId) {
      interval = setInterval(() => {
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
      clearTimeout(resetTimeuot);
    };
  }, [currentTurnPlayerId, gamePhase, roomId, socket, roomDataRef, lastPlayedCard]);

  return { timeLeft };
};
