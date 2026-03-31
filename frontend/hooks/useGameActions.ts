import { useCallback, RefObject } from "react";
import { Socket } from "socket.io-client";
import { GamePhase } from "./useGameState";

export interface ComboState {
  comboCards: string[];
  isThreeCard: boolean;
}

export interface GameActionSetters {
  setMyCards: React.Dispatch<React.SetStateAction<string[]>>;
  setGamePhase: React.Dispatch<React.SetStateAction<GamePhase>>;
  setCurrentTurnPlayerId: React.Dispatch<React.SetStateAction<string | null>>;
  pendingNextTurnRef: RefObject<string | null>;
  setSeeTheFutureCards: React.Dispatch<React.SetStateAction<string[]>>;
  setEliminatedPlayerId: React.Dispatch<React.SetStateAction<string | null>>;
  setFavorState: React.Dispatch<React.SetStateAction<FavorState | null>>;
  setComboState: React.Dispatch<React.SetStateAction<ComboState | null>>;
}

export interface FavorState {
  requesterPlayerId: string;
  requesterName: string;
  targetPlayerId?: string;
  cardCode?: string;
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
    setFavorState,
    setComboState,
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
      socket.emit("drawCard", { roomId, playerToken, isAutoDraw: isAutoDraw ?? false });
    },
    [socket, roomId]
  );

  const playCard = useCallback(
    (cardCode: string, targetPlayerToken?: string) => {
      if (!socket) return;
      const playerToken = localStorage.getItem("player_token");

      // FV intercept — เปิด modal เลือก target ก่อน ไม่ emit backend
      const normalizedCode = cardCode.replace(/^GVE_/, "");
      if (normalizedCode === "FV" && !targetPlayerToken) {
        setFavorState({
          requesterPlayerId: playerToken ?? "",
          requesterName: localStorage.getItem("display_name") ?? "คุณ",
          cardCode,
        });
        setGamePhase("FAVOR_SELECT_TARGET");
        return;
      }

      socket.emit("playCard", { roomId, playerToken, cardCode, targetPlayerToken });
      setMyCards((prev) => {
        const idx = prev.indexOf(cardCode);
        if (idx !== -1) { const next = [...prev]; next.splice(idx, 1); return next; }
        return prev;
      });
    },
    [socket, roomId, setMyCards, setFavorState, setGamePhase]
  );

  /**
   * playCombo — เริ่ม combo flow: set phase ให้เลือก target บน board
   */
  const playCombo = useCallback(
    (comboCards: string[]) => {
      setComboState({ comboCards, isThreeCard: comboCards.length >= 3 });
      setGamePhase("COMBO_SELECT_TARGET");
    },
    [setComboState, setGamePhase]
  );

  /**
   * emitCombo — emit socket หลังเลือก target แล้ว (และ demandedCard สำหรับ 3-card)
   */
  const emitCombo = useCallback(
    (comboCards: string[], targetPlayerToken: string, demandedCard?: string) => {
      if (!socket) return;
      const playerToken = localStorage.getItem("player_token");

      // Optimistic UI: ลบการ์ด combo ออกจาก hand ทันที
      setMyCards((prev) => {
        const next = [...prev];
        for (const cardCode of comboCards) {
          const idx = next.indexOf(cardCode);
          if (idx !== -1) next.splice(idx, 1);
        }
        return next;
      });

      setComboState(null);
      setGamePhase("PLAYING");

      socket.emit("playCombo", {
        roomId,
        playerToken,
        comboCards,
        targetPlayerToken,
        demandedCard,
      });
    },
    [socket, roomId, setMyCards, setComboState, setGamePhase]
  );

  const cancelCombo = useCallback(() => {
    setComboState(null);
    setGamePhase("PLAYING");
  }, [setComboState, setGamePhase]);

  const cancelFavor = useCallback(() => {
    setFavorState(null);
    setGamePhase("PLAYING");
  }, [setFavorState, setGamePhase]);

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

  const insertIK = useCallback(
    (position: number) => {
      if (!socket) return;
      const playerToken = localStorage.getItem("player_token");
      socket.emit("insertIK", { roomId, playerToken, position });
      setGamePhase("PLAYING");
    },
    [socket, roomId, setGamePhase]
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
      if (idx !== -1) { const next = [...prev]; next.splice(idx, 1); return next; }
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

  const updateDeckConfig = useCallback(
    (cardVersion: string, expansions: string[]) => {
      if (!socket) return;
      const playerToken = localStorage.getItem("player_token");
      socket.emit("updateDeckConfig", { roomId, playerToken, cardVersion, expansions });
    },
    [socket, roomId]
  );

  // ── Favor: เลือก target → emit playCard ไป backend ──
  const selectFavorTarget = useCallback(
    (targetPlayerToken: string) => {
      if (!targetPlayerToken) return;
      const playerToken = localStorage.getItem("player_token");

      socket?.emit("playCard", { roomId, playerToken, cardCode: "FV", targetPlayerToken });

      setMyCards((prev) => {
        const fvCode = prev.includes("GVE_FV") ? "GVE_FV" : "FV";
        const idx = prev.indexOf(fvCode);
        if (idx !== -1) { const next = [...prev]; next.splice(idx, 1); return next; }
        return prev;
      });

      setFavorState(null);
      setGamePhase("PLAYING");
    },
    [socket, roomId, setMyCards, setFavorState, setGamePhase]
  );

  // ── Favor: เลือกการ์ดที่จะให้ ──
  const pickFavorCard = useCallback(
    (cardCode: string, requesterPlayerId?: string) => {
      const playerToken = localStorage.getItem("player_token");
      socket?.emit("favorPickCard", { roomId, playerToken, cardCode, requesterPlayerId });

      setMyCards((prev) => {
        const idx = prev.indexOf(cardCode);
        if (idx !== -1) { const next = [...prev]; next.splice(idx, 1); return next; }
        return prev;
      });
      setFavorState(null);
      setGamePhase("PLAYING");
    },
    [socket, roomId, setMyCards, setFavorState, setGamePhase]
  );

  // ── Play Nope ──
  const playNope = useCallback(() => {
    if (!socket) return;
    const playerToken = localStorage.getItem("player_token");
    socket.emit("playNope", { roomId, playerToken });

    setMyCards((prev) => {
      const gveNope = prev.includes("GVE_NP") ? "GVE_NP" : null;
      const nopeType = gveNope || (prev.includes("NP") ? "NP" : null);
      if (nopeType) {
        const idx = prev.indexOf(nopeType);
        if (idx !== -1) {
          const next = [...prev];
          next.splice(idx, 1);
          return next;
        }
      }
      return prev;
    });
  }, [socket, roomId, setMyCards]);

  return {
    selectSeat,
    startGame,
    drawCard,
    playCard,
    playCombo,
    emitCombo,
    cancelCombo,
    cancelFavor,
    insertEK,
    insertIK,
    closeInsertEK,
    closeSeeTheFuture,
    dismissEliminated,
    defuseCard,
    eliminatePlayer,
    leaveRoom,
    updateDeckConfig,
    selectFavorTarget,
    pickFavorCard,
    playNope,
  };
};