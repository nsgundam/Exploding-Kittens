import { useEffect, useState, useRef } from "react";
import { Socket } from "socket.io-client";
import type {
  Player,
  RoomData,
  CardHand,
  GameStartedPayload,
  CardDrawnPayload,
  CardPlayedPayload,
  DeckConfigChangedPayload,
  CardDefusedPayload,
  PlayerEliminatedPayload,
  EKInsertedPayload,
} from "@/types";

// ── Toast notification ─────────────────────────────────────
function showToast(message: string, duration = 3500) {
  if (typeof window === "undefined") return;
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed", top: "20px", left: "50%",
    transform: "translateX(-50%) translateY(-80px)",
    background: "rgba(30,20,5,0.95)", color: "#f5e6c8",
    padding: "12px 24px", borderRadius: "12px",
    border: "1.5px solid rgba(245,166,35,0.5)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    fontFamily: "'Fredoka One', cursive", fontSize: "15px",
    zIndex: "9999",
    transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
    opacity: "0", whiteSpace: "nowrap",
  });
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.transform = "translateX(-50%) translateY(0)";
    toast.style.opacity = "1";
  });
  setTimeout(() => {
    toast.style.transform = "translateX(-50%) translateY(-80px)";
    toast.style.opacity = "0";
    setTimeout(() => document.body.removeChild(toast), 400);
  }, duration);
}

import { FavorState } from "./useGameActions";

export type GamePhase =
  | "WAITING"
  | "PLAYING"
  | "EK_DRAWN"
  | "DEFUSE_INSERT"
  | "SEE_FUTURE"
  | "FAVOR_SELECT_TARGET"
  | "FAVOR_PICK_CARD"
  | "GAME_OVER";

export interface EKBombState {
  drawnCard: string;
  hasDefuse: boolean;
}

export const useGameState = (socket: Socket | null, roomId: string) => {
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [cardHands, setCardHands] = useState<CardHand[]>([]);
  const [myCards, setMyCards] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameLogs, setGameLogs] = useState<string[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>("WAITING");
  const [ekBombState, setEkBombState] = useState<EKBombState | null>(null);
  const [seeTheFutureCards, setSeeTheFutureCards] = useState<string[]>([]);
  const [eliminatedPlayerId, setEliminatedPlayerId] = useState<string | null>(null);
  const [winner, setWinner] = useState<{ player_id: string; display_name: string } | null>(null);
  const [favorState, setFavorState] = useState<FavorState | null>(null);
  const [lastPlayedCard, setLastPlayedCard] = useState<{ cardCode: string; playedByDisplayName: string } | null>(null);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [deckCount, setDeckCount] = useState<number | null>(null);

  const roomDataRef = useRef<RoomData | null>(null);
  const currentTurnPlayerIdRef = useRef<string | null>(null);
  const pendingNextTurnRef = useRef<string | null>(null);
  const gamePhaseRef = useRef<GamePhase>("WAITING");

  useEffect(() => { roomDataRef.current = roomData; }, [roomData]);
  useEffect(() => { currentTurnPlayerIdRef.current = currentTurnPlayerId; }, [currentTurnPlayerId]);
  useEffect(() => { gamePhaseRef.current = gamePhase; }, [gamePhase]);

  useEffect(() => {
    if (!socket || !roomId) return;

    // ── roomUpdated ──
    const handleRoomUpdated = (updatedRoom: RoomData) => {
      console.log("🔄 Room Updated:", updatedRoom);
      setRoomData(updatedRoom);
      if (updatedRoom.status === "WAITING") {
        setGamePhase("WAITING");
      } else if (updatedRoom.status === "PLAYING" && gamePhaseRef.current === "WAITING") {
        setGamePhase("PLAYING");
      }
    };

    // ── gameStarted ──
    const handleGameStarted = (data: GameStartedPayload & { deck_count?: number }) => {
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
        const myPlayer = data.room?.players?.find((p: Player) => p.player_token === myPlayerToken);
        if (myPlayer) {
          const myHand = data.cardHands.find((h: CardHand) => h.player_id === myPlayer.player_id);
          if (myHand) {
            console.log("🃏 My Cards:", myHand.cards);
            setMyCards(myHand.cards);
          }
        }
      }
    };

    // ── cardDrawn ──
    const handleCardDrawn = (data: CardDrawnPayload & { deck_count?: number }) => {
      console.log("🃏 Card Drawn:", data);
      if (data?.deck_count !== undefined) setDeckCount(data.deck_count);
      
      if (data?.player_id) {
        setCardHands((prev) =>
          prev.map((hand) => {
            if (hand.player_id === data.player_id) {
              return { ...hand, card_count: hand.card_count + 1, cards: data.hand?.cards ?? hand.cards };
            }
            return hand;
          }),
        );
        const myPlayerToken = localStorage.getItem("player_token");
        const myPlayer = roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);
        if (myPlayer && myPlayer.player_id === data.player_id && data.hand?.cards) {
          setMyCards(data.hand.cards);
        }
      }

      const drawnPlayer = roomDataRef.current?.players?.find((p: Player) => p.player_id === data.player_id);
      const displayName = data.drawnByDisplayName || drawnPlayer?.display_name || "ผู้เล่น";
      
      if (data?.action === "DREW_EXPLODING_KITTEN") {
        setEkBombState({ drawnCard: data.drawnCard ?? "EK", hasDefuse: data.hasDefuse ?? false });
        setGamePhase("EK_DRAWN");
        setGameLogs((prev) => [...prev.slice(-19), `💣 ${displayName} จั่วได้ Exploding Kitten!`]);
      } else if (data?.success) {
        const logMsg = data.isExplodingKitten
          ? data.eliminated ? `💥 ${displayName} ระเบิด!` : `🛡️ ${displayName} defuse ได้!`
          : data.isAutoDraw ? `⏱️ ${displayName} จั่วไพ่อัตโนมัติ (หมดเวลา)` : `🃏 ${displayName} จั่วไพ่`;
        setGameLogs((prev) => [...prev.slice(-19), logMsg]);
      }

      if (data?.nextTurn) {
        setGamePhase("PLAYING");
        setEkBombState(null);
        setCurrentTurnPlayerId(data.nextTurn.player_id);
      }
    };

    // ── cardPlayed ──
    const handleCardPlayed = (data: CardPlayedPayload & { nextTurn?: { player_id: string } }) => {
      console.log("🎴 Card Played:", data);
      if (data?.playedBy) {
        setCardHands((prev) =>
          prev.map((hand) => {
            if (hand.player_id === data.playedBy) {
              return { ...hand, card_count: Math.max(0, hand.card_count - 1) };
            }
            return hand;
          }),
        );
      }
      if (data?.success) {
        const playedPlayer = roomDataRef.current?.players?.find((p: Player) => p.player_id === data.playedBy);
        const displayName = data.playedByDisplayName || playedPlayer?.display_name || "ผู้เล่น";
        const logMsg = data.message || `${displayName} เล่นไพ่ ${data.cardCode}`;
        
        setGameLogs((prev) => [...prev.slice(-19), `🎴 ${logMsg}`]);
        setLastPlayedCard({ cardCode: data.cardCode, playedByDisplayName: displayName });
        
        if (data?.nextTurn?.player_id) {
          setCurrentTurnPlayerId(data.nextTurn.player_id);
        }

        if (data.effect?.type === "SEE_THE_FUTURE" && data.effect.topCards && data.effect.topCards.length > 0) {
          setSeeTheFutureCards(data.effect.topCards);
          setGamePhase("SEE_FUTURE");
        }

        // FAVOR effect — แจ้ง requester ว่ากำลังรอ target เลือกการ์ด
        if (data.effect?.type === "FAVOR") {
          const myPlayerToken = localStorage.getItem("player_token");
          const me = roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);
          // ถ้าเราเป็น requester → log แจ้งว่ากำลังรอ
          if (me?.player_id === data.playedBy) {
            setGameLogs((prev) => [...prev.slice(-19), `🤝 รอให้ผู้เล่นอื่นเลือกการ์ดให้คุณ...`]);
          }
        }
      }
    };

    // ── deck_config_changed / deckConfigUpdated ──
    const handleDeckConfigChanged = (data: DeckConfigChangedPayload & { deck_config?: { card_version?: string } }) => {
      console.log("⚙️ Deck Config Changed:", data);
      showToast("⚙️ Deck config changed");
      setGameLogs((prev) => [...prev.slice(-19), `⚙️ Deck config changed`]);
    };

    // ── favorRequested ── (backend ส่งตรงมาหา target socket)
    const handleFavorRequested = (data: { requesterPlayerId: string; requesterName: string; availableCards?: string[] }) => {
      console.log("🤝 Favor Requested:", data);
      setFavorState({
        requesterPlayerId: data.requesterPlayerId,
        requesterName: data.requesterName,
      });
      setGamePhase("FAVOR_PICK_CARD");
    };

    // ── favorRequestedBroadcast ── (fallback: broadcast ทั้งห้อง → frontend กรอง player_id เอง)
    const handleFavorRequestedBroadcast = (data: {
      requesterPlayerId: string;
      requesterName: string;
      availableCards?: string[];
      targetPlayerId: string;
    }) => {
      console.log("🤝 Favor Requested Broadcast:", data);
      const myPlayerToken = localStorage.getItem("player_token");
      const me = roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);
      if (me?.player_id === data.targetPlayerId) {
        setFavorState({
          requesterPlayerId: data.requesterPlayerId,
          requesterName: data.requesterName,
        });
        setGamePhase("FAVOR_PICK_CARD");
      }
    };

    // ── favorCompleted ── (backend แจ้งว่า FV เสร็จแล้ว)
    const handleFavorCompleted = (data: { nextTurn?: { player_id: string }; cardCode: string; requesterPlayerId: string }) => {
      console.log("🤝 Favor Completed:", data);
      setFavorState(null);
      setGamePhase("PLAYING");
      if (data?.nextTurn?.player_id) {
        setCurrentTurnPlayerId(data.nextTurn.player_id);
      }
      const myPlayerToken = localStorage.getItem("player_token");
      const me = roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);
      // ถ้าเราเป็น requester → เพิ่มการ์ดเข้ามือ
      if (me?.player_id === data.requesterPlayerId) {
        setMyCards((prev) => [...prev, data.cardCode]);
      }
      setGameLogs((prev) => [...prev.slice(-19), `🤝 Favor เสร็จแล้ว!`]);
    };

    // ── cardDefused ──
    const handleCardDefused = (data: CardDefusedPayload) => {
      console.log("🛡️ Card Defused:", data);
      setEkBombState(null);
      
      const myPlayerToken = localStorage.getItem("player_token");
      const me = roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);
      const defuserPlayerId = currentTurnPlayerIdRef.current;
      const isMe = me && me.player_id === defuserPlayerId;

      if (isMe) {
        setGamePhase("DEFUSE_INSERT");
        pendingNextTurnRef.current = data?.nextTurn?.player_id ?? null;
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
      } else {
        setGamePhase("PLAYING");
        if (data?.nextTurn?.player_id) setCurrentTurnPlayerId(data.nextTurn.player_id);
      }

      const defusingPlayer = roomDataRef.current?.players?.find((p: Player) => p.player_id === defuserPlayerId);
      const displayName = defusingPlayer?.display_name ?? "ผู้เล่น";
      setGameLogs((prev) => [...prev.slice(-19), `🛡️ ${displayName} กู้ระเบิดสำเร็จ!`]);
    };

    // ── ekInserted ──
    const handleEkInserted = (data: EKInsertedPayload) => {
      console.log("💣 EK Inserted:", data);
      if (data?.deck_count !== undefined) setDeckCount(data.deck_count);
      setGamePhase("PLAYING");
      setEkBombState(null);
      if (data?.nextTurn?.player_id) setCurrentTurnPlayerId(data.nextTurn.player_id);
      setGameLogs((prev) => [...prev.slice(-19), `💣 Exploding Kitten ถูกใส่กลับคืนกอง!`]);
    };

    // ── playerEliminated ──
    const handlePlayerEliminated = (data: PlayerEliminatedPayload) => {
      console.log("💀 Player Eliminated:", data);
      setEkBombState(null);
      setGamePhase(data.action === "GAME_OVER" ? "GAME_OVER" : "PLAYING");

      const eliminatedId = currentTurnPlayerIdRef.current;
      if (eliminatedId) {
        setEliminatedPlayerId(eliminatedId);
        setRoomData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            players: prev.players?.map((p: Player) =>
              p.player_id === eliminatedId ? { ...p, is_alive: false } : p,
            ),
          };
        });
      }

      if (data.action === "GAME_OVER" && data?.winner) setWinner(data.winner);
      if (data?.nextTurn?.player_id) setCurrentTurnPlayerId(data.nextTurn.player_id);

      const eliminatedPlayer = roomDataRef.current?.players?.find((p: Player) => p.player_id === eliminatedId);
      const displayName = eliminatedPlayer?.display_name ?? "ผู้เล่น";
      setGameLogs((prev) => [...prev.slice(-19), `💥 ${displayName} ระเบิด!`]);
    };


    // ── comboPlayed ── (backend แจ้งผลการ combo)
    const handleComboPlayed = (data: {
      action: string;
      success: boolean;
      comboType: "TWO_CARD" | "THREE_CARD";
      stolenCard?: string;        // มีแค่คนขโมย (anti-cheat)
      wasVoid: boolean;
      robbedFromDisplayName: string;
      robbedFromPlayerId: string;
      nextTurn?: { player_id: string; display_name: string; turn_number: number };
    }) => {
      console.log("🐱 Combo Played:", data);

      const myPlayerToken = localStorage.getItem("player_token");
      const me = roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);

      // ถ้าเราเป็นคนขโมย → เพิ่มการ์ดที่ได้เข้ามือ
      if (me && data.stolenCard) {
        setMyCards((prev) => [...prev, data.stolenCard!]);
      }

      // อัปเดต hand_count ของ target (ลด 1)
      if (data.robbedFromPlayerId && !data.wasVoid) {
        setCardHands((prev) =>
          prev.map((hand) => {
            if (hand.player_id === data.robbedFromPlayerId) {
              return { ...hand, card_count: Math.max(0, hand.card_count - 1) };
            }
            return hand;
          })
        );
      }

      // อัปเดต turn
      if (data?.nextTurn?.player_id) {
        setCurrentTurnPlayerId(data.nextTurn.player_id);
      }

      // Log
      const myDisplayName = me?.display_name ?? "คุณ";
      if (data.wasVoid) {
        setGameLogs((prev) => [...prev.slice(-19), `🐱 Combo 3 ใบ — ${data.robbedFromDisplayName} ไม่มีการ์ดที่ต้องการ (โมฆะ)`]);
      } else if (data.stolenCard && me) {
        setGameLogs((prev) => [...prev.slice(-19), `🐱 ${myDisplayName} ขโมยการ์ดจาก ${data.robbedFromDisplayName} สำเร็จ!`]);
      } else {
        setGameLogs((prev) => [...prev.slice(-19), `🐱 Combo — ขโมยการ์ดจาก ${data.robbedFromDisplayName}`]);
      }
    };

    socket.on("roomUpdated", handleRoomUpdated);
    socket.on("gameStarted", handleGameStarted);
    socket.on("cardDrawn", handleCardDrawn);
    socket.on("cardPlayed", handleCardPlayed);
    socket.on("deck_config_changed", handleDeckConfigChanged);
    socket.on("deckConfigUpdated", handleDeckConfigChanged);
    socket.on("favorRequested", handleFavorRequested);
    socket.on("favorRequestedBroadcast", handleFavorRequestedBroadcast);
    socket.on("favorCompleted", handleFavorCompleted);
    socket.on("cardDefused", handleCardDefused);
    socket.on("ekInserted", handleEkInserted);
    socket.on("playerEliminated", handlePlayerEliminated);
    socket.on("comboPlayed", handleComboPlayed);

    return () => {
      socket.off("roomUpdated", handleRoomUpdated);
      socket.off("gameStarted", handleGameStarted);
      socket.off("cardDrawn", handleCardDrawn);
      socket.off("cardPlayed", handleCardPlayed);
      socket.off("deck_config_changed", handleDeckConfigChanged);
      socket.off("deckConfigUpdated", handleDeckConfigChanged);
      socket.off("favorRequested", handleFavorRequested);
      socket.off("favorRequestedBroadcast", handleFavorRequestedBroadcast);
      socket.off("favorCompleted", handleFavorCompleted);
      socket.off("cardDefused", handleCardDefused);
      socket.off("ekInserted", handleEkInserted);
      socket.off("playerEliminated", handlePlayerEliminated);
      socket.off("comboPlayed", handleComboPlayed);
    };
  }, [socket, roomId]); // gamePhaseRef used instead of gamePhase to avoid re-registering listeners

  const augmentedRoomData = roomData
    ? {
        ...roomData,
        players: roomData.players?.map((p) => ({
          ...p,
          hand_count:
            cardHands.find((h) => h.player_id === p.player_id)?.card_count ??
            p.hand_count ??
            0,
        })),
      }
    : null;

  return {
    roomData: augmentedRoomData,
    cardHands, setCardHands,
    myCards, setMyCards,
    gameLogs, setGameLogs,
    sessionId, setSessionId,
    gamePhase, setGamePhase,
    ekBombState, setEkBombState,
    seeTheFutureCards, setSeeTheFutureCards,
    eliminatedPlayerId, setEliminatedPlayerId,
    winner, setWinner,
    favorState, setFavorState,
    lastPlayedCard, setLastPlayedCard,
    currentTurnPlayerId, setCurrentTurnPlayerId,
    deckCount, setDeckCount,
    currentTurnPlayerIdRef, pendingNextTurnRef, roomDataRef
  };
};