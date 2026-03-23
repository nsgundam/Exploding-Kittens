import { useCallback, RefObject } from "react";
import { Socket } from "socket.io-client";
import { GamePhase } from "./useGameState";

export interface GameActionSetters {
  setMyCards: React.Dispatch<React.SetStateAction<string[]>>;
  setGamePhase: React.Dispatch<React.SetStateAction<GamePhase>>;
  setCurrentTurnPlayerId: React.Dispatch<React.SetStateAction<string | null>>;
  pendingNextTurnRef: RefObject<string | null>;
  setSeeTheFutureCards: React.Dispatch<React.SetStateAction<string[]>>;
  setEliminatedPlayerId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useGameActions = (
  socket: Socket | null,
  roomId: string,
  setters: GameActionSetters
) => {
  const {
    setMyCards,
    setGamePhase,
    setCurrentTurnPlayerId,
    pendingNextTurnRef,
    setSeeTheFutureCards,
    setEliminatedPlayerId,
  } = setters;

  const selectSeat = useCallback(
    (seatNumber: number) => {
      if (!socket) return;
      const playerToken = localStorage.getItem("player_token");
      if (seatNumber < 0) {
        socket.emit("unseatPlayer", { roomId, playerToken });
      } else {
        socket.emit("selectSeat", { roomId, playerToken, seatNumber });
      }
    },
    [socket, roomId]
  );

  const startGame = useCallback(() => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    socket.emit("startGame", { roomId, playerToken });
  }, [socket, roomId]);

  const drawCard = useCallback(
    (isAutoDraw?: boolean) => {
      if (!socket) return;
      const playerToken = localStorage.getItem("player_token");
      socket.emit("drawCard", {
        roomId,
        playerToken,
        isAutoDraw: isAutoDraw ?? false,
      });
    },
    [socket, roomId]
  );

  const playCard = useCallback(
    (cardCode: string, targetPlayerToken?: string) => {
      if (!socket) return;
      const playerToken = localStorage.getItem("player_token");
      socket.emit("playCard", {
        roomId,
        playerToken,
        cardCode,
        targetPlayerToken,
      });
      // Optimistically remove the card from our own hand
      setMyCards((prev) => {
        const idx = prev.indexOf(cardCode);
        if (idx !== -1) {
          const next = [...prev];
          next.splice(idx, 1);
          return next;
        }
        return prev;
      });
    },
    [socket, roomId, setMyCards]
  );

  const insertEK = useCallback(
    (position: number) => {
      if (!socket) return;
      const playerToken = localStorage.getItem("player_token");
      socket.emit("insertEK", { roomId, playerToken, position });

      setGamePhase("PLAYING");
      if (pendingNextTurnRef.current) {
        setCurrentTurnPlayerId(pendingNextTurnRef.current);
        pendingNextTurnRef.current = null;
      }
    },
    [socket, roomId, setGamePhase, setCurrentTurnPlayerId, pendingNextTurnRef]
  );

  const closeInsertEK = useCallback(() => {
    setGamePhase("PLAYING");
    if (pendingNextTurnRef.current) {
      setCurrentTurnPlayerId(pendingNextTurnRef.current);
      pendingNextTurnRef.current = null;
    }
  }, [setGamePhase, setCurrentTurnPlayerId, pendingNextTurnRef]);

  const closeSeeTheFuture = useCallback(() => {
    setSeeTheFutureCards([]);
    setGamePhase("PLAYING");
  }, [setSeeTheFutureCards, setGamePhase]);

  const dismissEliminated = useCallback(() => {
    setEliminatedPlayerId(null);
  }, [setEliminatedPlayerId]);

  const defuseCard = useCallback(() => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    socket.emit("defuseCard", { roomId, playerToken });
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
  }, [socket, roomId, setMyCards]);

  const eliminatePlayer = useCallback(() => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    socket.emit("eliminatePlayer", { roomId, playerToken });
  }, [socket, roomId]);

  const leaveRoom = useCallback(() => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    socket.emit("leaveRoom", { roomId, playerToken });
  }, [socket, roomId]);

  return {
    selectSeat,
    startGame,
    drawCard,
    playCard,
    insertEK,
    closeInsertEK,
    closeSeeTheFuture,
    dismissEliminated,
    defuseCard,
    eliminatePlayer,
    leaveRoom,
  };
};
