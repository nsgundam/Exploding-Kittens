import { useEffect } from "react";
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

interface CardEffectResult {
  type: string;
  topCards?: string[];
  shuffled?: boolean;
  extraTurns?: number;
  direction?: number;
}
import { GamePhase, EKBombState, PendingActionState, NopeState } from "./useGameState";
import { FavorState, ComboState } from "./useGameActions";
import type { DrawAnimState } from "@/components/game/DrawCardAnimation";

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

export interface GameStateSetters {
  setRoomData: React.Dispatch<React.SetStateAction<RoomData | null>>;
  setCardHands: React.Dispatch<React.SetStateAction<CardHand[]>>;
  setMyCards: React.Dispatch<React.SetStateAction<string[]>>;
  setSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  setGameLogs: React.Dispatch<React.SetStateAction<string[]>>;
  setGamePhase: React.Dispatch<React.SetStateAction<GamePhase>>;
  setEkBombState: React.Dispatch<React.SetStateAction<EKBombState | null>>;
  setSeeTheFutureCards: React.Dispatch<React.SetStateAction<string[]>>;
  setEliminatedPlayerId: React.Dispatch<React.SetStateAction<string | null>>;
  setWinner: React.Dispatch<React.SetStateAction<{ player_id: string; display_name: string } | null>>;
  setFavorState: React.Dispatch<React.SetStateAction<FavorState | null>>;
  setComboState: React.Dispatch<React.SetStateAction<ComboState | null>>;
  setPendingAction: React.Dispatch<React.SetStateAction<PendingActionState | null>>;
  setNopeState: React.Dispatch<React.SetStateAction<NopeState | null>>;
  setLastPlayedCard: React.Dispatch<React.SetStateAction<{ cardCode: string; playedByDisplayName: string } | null>>;
  setCurrentTurnPlayerId: React.Dispatch<React.SetStateAction<string | null>>;
  setDeckCount: React.Dispatch<React.SetStateAction<number | null>>;
  setTurnNumber: React.Dispatch<React.SetStateAction<number>>;
  setPendingAttacks: React.Dispatch<React.SetStateAction<number>>;
  setDirection: React.Dispatch<React.SetStateAction<number>>;
  setIkOnTop: React.Dispatch<React.SetStateAction<boolean>>;
  setIsDrawLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setDrawAnimState: React.Dispatch<React.SetStateAction<DrawAnimState | null>>;
  roomDataRef: React.MutableRefObject<RoomData | null>;
  currentTurnPlayerIdRef: React.MutableRefObject<string | null>;
  pendingNextTurnRef: React.MutableRefObject<string | null>;
  gamePhaseRef: React.MutableRefObject<GamePhase>;
  onCardPlayedRef: React.MutableRefObject<(() => void) | null>;
  afterDrawAnimRef: React.MutableRefObject<(() => void) | null>;
  afterHellfireRef: React.MutableRefObject<(() => void) | null>;
}

export function useGameSocketEvents(
  socket: Socket | null,
  roomId: string,
  setters: GameStateSetters
) {
  useEffect(() => {
    if (!socket || !roomId) return;

    // AI Rule 5.1: DRY - Get token once per event cycle
    const myPlayerToken = typeof window !== "undefined" ? localStorage.getItem("player_token") : null;

    // ── roomUpdated ──
    const handleRoomUpdated = (updatedRoom: RoomData) => {
      console.log("🔄 Room Updated:", updatedRoom);
      setters.setRoomData(updatedRoom);
      if (updatedRoom.status === "WAITING") {
        setters.setGamePhase("WAITING");
      } else if (updatedRoom.status === "PLAYING" && setters.gamePhaseRef.current === "WAITING") {
        setters.setGamePhase("PLAYING");
      }
      // AI Rule 2.1: The Dumb Frontend - Removed Rogue Manual Winner calculation.
      // Frontend now purely waits for server "GAME_OVER" payload from playerEliminated event.
    };

    // ── gameStarted ──
    const handleGameStarted = (data: GameStartedPayload & { deck_count?: number }) => {
      console.log("🎮 Game Started:", data);
      if (data?.room) setters.setRoomData(data.room);
      if (data?.session_id) setters.setSessionId(data.session_id);
      if (data?.first_turn_player_id) setters.setCurrentTurnPlayerId(data.first_turn_player_id);
      if (data?.deck_count !== undefined) setters.setDeckCount(data.deck_count);
      setters.setGamePhase("PLAYING");
      setters.setGameLogs(["🎮 เกมเริ่มต้นแล้ว!"]);
      setters.setDirection(1); // reset direction on new game

      if (data?.cardHands && Array.isArray(data.cardHands)) {
        setters.setCardHands(data.cardHands);
        const myPlayer = data.room?.players?.find((p: Player) => p.player_token === myPlayerToken);
        if (myPlayer) {
          const myHand = data.cardHands.find((h: CardHand) => h.player_id === myPlayer.player_id);
          if (myHand) {
            setters.setMyCards(myHand.cards);
          }
        }
      }
    };

    // ── cardDrawn ──
    const handleCardDrawn = (data: CardDrawnPayload & {
      deck_count?: number;
      player_id?: string;
      drawnByDisplayName?: string;
      drawnCard?: string;
      hand?: { cards: string[] };
      source?: string;
      ikOnTop?: boolean;
      nextTurn?: { player_id: string; display_name: string; turn_number: number; pending_attacks?: number };
    }) => {
      console.log("🃏 Card Drawn:", data);
      if (data?.deck_count !== undefined) setters.setDeckCount(data.deck_count);
      // อัพเดท ikOnTop ทุกครั้งที่จั่วไพ่ปกติ (IK อาจขึ้นมาบนสุดหลังจั่วไพ่ข้างบนออกไป)
      if (data?.ikOnTop !== undefined) setters.setIkOnTop(data.ikOnTop);

      if (data?.player_id) {
        setters.setCardHands((prev) =>
          prev.map((hand) => {
            if (hand.player_id === data.player_id) {
              return { ...hand, card_count: hand.card_count + 1, cards: data.hand?.cards ?? hand.cards };
            }
            return hand;
          }),
        );
        const myPlayer = setters.roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);
        if (myPlayer && myPlayer.player_id === data.player_id && data.hand?.cards) {
          setters.setMyCards(data.hand.cards);
        }
      }

      const drawnPlayer = setters.roomDataRef.current?.players?.find((p: Player) => p.player_id === data.player_id);
      const displayName = data.drawnByDisplayName || drawnPlayer?.display_name || "ผู้เล่น";

      if (data?.action === "DREW_EXPLODING_KITTEN") {
        const isIK = data.drawnCard === "IK";
        const isIKFaceUp = !!data.isIKFaceUp;

        // ── Immediately clear any stale Nope window ──
        // EK/IK cannot be Noped. Clear the pending action and Nope state immediately
        // so the Nope card stops glowing, even before the draw animation completes.
        setters.setPendingAction(null);
        setters.setNopeState(null);
        // If gamePhase was NOPE_WINDOW from a previous card play, reset it so the
        // Nope banner disappears right away. Bomb phase will re-set it to EK_DRAWN / IK_REVEAL.
        setters.setGamePhase("PLAYING");

        // log ให้ทุกคนเห็น
        if (isIK) {
          setters.setIkOnTop(false);
          const logMsg = isIKFaceUp
            ? `💥 ${displayName} จั่วได้ Imploding Kitten (หงายหน้า) — ตายทันที!`
            : `🐱 ${displayName} จั่วได้ Imploding Kitten! (คว่ำหน้า)`;
          setters.setGameLogs((prev) => [...prev.slice(-19), logMsg]);
        } else {
          setters.setGameLogs((prev) => [...prev.slice(-19), `💣 ${displayName} จั่วได้ Exploding Kitten!`]);
        }

        const myPlayer = setters.roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);
        const isMe = myPlayer?.player_id === data.player_id;

        // bomb phase callback (runs after animation, or immediately if not me)
        const applyBombPhase = () => {
          if (isIK) {
            setters.setEkBombState({ drawnCard: "IK", hasDefuse: !isIKFaceUp });
            setters.setGamePhase("IK_REVEAL");
          } else {
            setters.setEkBombState({ drawnCard: data.drawnCard ?? "EK", hasDefuse: data.hasDefuse ?? false });
            setters.setGamePhase("EK_DRAWN");
          }
        };

        if (isMe && data.drawnCard) {
          // เฉพาะคนจั่ว: เล่น draw animation ก่อน แล้ว defer bomb phase
          setters.afterDrawAnimRef.current = applyBombPhase;
          setters.setDrawAnimState({
            drawerName: displayName,
            drawnCard: data.drawnCard,
            isMe: true,
            avatarSeat: drawnPlayer?.seat_number ?? null,
          });
        } else {
          // คนอื่น: ไม่โชว์แอนิเมชัน แต่ต้องประวิงเวลาเพื่อให้ UI Sync กับคนจั่ว ป้องกันบั๊กตาซ้อนกัน
          setTimeout(applyBombPhase, 1600);
        }

      } else if (data?.success) {
        const isFromBottom = data.source === "bottom";
        const logMsg = data.isExplodingKitten
          ? data.eliminated ? `💥 ${displayName} ระเบิด!` : `🛡️ ${displayName} defuse ได้!`
          : data.isAutoDraw ? `⏱️ ${displayName} จั่วไพ่อัตโนมัติ (หมดเวลา)`
            : isFromBottom ? `⬇️ ${displayName} จั่วไพ่จากล่างกอง`
              : `🃏 ${displayName} จั่วไพ่`;
        setters.setGameLogs((prev) => [...prev.slice(-19), logMsg]);

        // ฟังก์ชันสำหรับส่ง turn ให้คนถัดไปเมื่อจั่วไพ่ปกติ
        const applyNextTurn = () => {
          if (data?.nextTurn && data?.action !== "DREW_EXPLODING_KITTEN") {
            setters.setGamePhase("PLAYING");
            setters.setEkBombState(null);
            setters.setCurrentTurnPlayerId(data.nextTurn.player_id);
            if (data.nextTurn.turn_number) setters.setTurnNumber(data.nextTurn.turn_number);
            setters.setPendingAttacks(data.nextTurn?.pending_attacks ?? 0);
          }
        };

        // ล็อกไม่ให้ใครกดจั่วได้จนกว่าแอนิเมชันของคนตรงหน้าจะจบ
        setters.setIsDrawLocked(true);
        setTimeout(() => setters.setIsDrawLocked(false), 1600);

        // เปลี่ยนเป้าเทิร์นทันทีเพื่อให้ฝั่งคนอื่นรู้แน่ชัดว่าเป็นตาเขา (แต่ยังกดยังไม่ได้)
        applyNextTurn();

        // draw animation เฉพาะคนจั่ว
        if (data?.drawnCard && data?.player_id && !data.isAutoDraw) {
          const myPlayer2 = setters.roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);
          const isMe2 = myPlayer2?.player_id === data.player_id;

          if (isMe2) {
            setters.setDrawAnimState({
              drawerName: displayName,
              drawnCard: data.drawnCard,
              isMe: true,
              avatarSeat: drawnPlayer?.seat_number ?? null,
            });
          }
        }
      }
    };

    // ── ikPlacedBack ──
    // Emitted after placeIKBack succeeds: IK is now face-up in deck, turn advances
    const handleIkPlacedBack = (data: {
      success: boolean;
      ikOnTop: boolean;
      deck_count: number;
      action: string;
      nextTurn?: { player_id: string; display_name: string; turn_number: number; pending_attacks?: number };
    }) => {
      console.log("🐱 IK Placed Back:", data);
      if (data?.deck_count !== undefined) setters.setDeckCount(data.deck_count);
      setters.setGamePhase("PLAYING");
      setters.setEkBombState(null);
      // IK หงายหน้าเสมอหลังใส่กลับกอง แต่ deck แสดง IK เฉพาะเมื่ออยู่บนสุดเท่านั้น
      setters.setIkOnTop(data.ikOnTop);
      if (data?.nextTurn?.player_id) setters.setCurrentTurnPlayerId(data.nextTurn.player_id);
      if (data?.nextTurn?.turn_number) setters.setTurnNumber(data.nextTurn.turn_number);
      setters.setPendingAttacks(data.nextTurn?.pending_attacks ?? 0);

      const logMsg = data.ikOnTop
        ? `🐱 Imploding Kitten ถูกใส่กลับกอง ⚠️ อยู่บนสุด! Deck แสดง IK — ระวัง!`
        : `🐱 Imploding Kitten ถูกใส่กลับกอง (หงายหน้าขึ้น แต่ไม่ได้อยู่บนสุด)`;
      setters.setGameLogs((prev) => [...prev.slice(-19), logMsg]);

      if (data.ikOnTop) {
        showToast("⚠️ Imploding Kitten อยู่บนสุดกอง! ระวัง!", 4000);
      }
    };

    // ── cardPlayed ──
    const handleCardPlayed = (data: CardPlayedPayload & { nextTurn?: { player_id: string; display_name?: string; turn_number?: number; pending_attacks?: number } }) => {
      console.log("🎴 Card Played:", data);
      if (data?.playedBy) {
        setters.setCardHands((prev) =>
          prev.map((hand) => {
            if (hand.player_id === data.playedBy) {
              return { ...hand, card_count: Math.max(0, hand.card_count - 1) };
            }
            return hand;
          }),
        );
      }
      if (data?.success) {
        setters.setGamePhase("PLAYING");
        setters.setPendingAction(null);
        setters.setNopeState(null);

        const playedPlayer = setters.roomDataRef.current?.players?.find((p: Player) => p.player_id === data.playedBy);
        const displayName = data.playedByDisplayName || playedPlayer?.display_name || "ผู้เล่น";
        const logMsg = data.message || `${displayName} เล่นไพ่ ${data.cardCode}`;

        setters.setGameLogs((prev) => [...prev.slice(-19), `🎴 ${logMsg}`]);
        setters.setLastPlayedCard({ cardCode: data.cardCode, playedByDisplayName: displayName });

        const skipTurnCards = ["AT", "SK", "TA", "RV"];
        const normalizedPlayed = data.cardCode?.replace(/^GVE_/, "");
        if (!skipTurnCards.includes(normalizedPlayed ?? "")) {
          setters.onCardPlayedRef.current?.();
        }

        if (data?.nextTurn?.player_id) {
          setters.setCurrentTurnPlayerId(data.nextTurn.player_id);
          if (data.nextTurn.turn_number) setters.setTurnNumber(data.nextTurn.turn_number);
          setters.setPendingAttacks(data.nextTurn?.pending_attacks ?? 0);
        }

        if (data.effect?.type === "SEE_THE_FUTURE" && data.effect.topCards && data.effect.topCards.length > 0) {
          setters.setSeeTheFutureCards(data.effect.topCards);
          setters.setGamePhase("SEE_FUTURE");
        }

        if (data.effect?.type === "SHUFFLE" && data.effect.ikOnTop !== undefined) {
          setters.setIkOnTop(data.effect.ikOnTop);
        }

        if (data.effect?.type === "ALTER_THE_FUTURE" && data.effect.topCards && data.effect.topCards.length > 0) {
          setters.setSeeTheFutureCards(data.effect.topCards);
          setters.setGamePhase("ALTER_FUTURE");
        }

        if (data.effect?.type === "REVERSE") {
          const newDir = (data.effect as CardEffectResult).direction ?? -1;
          setters.setDirection(newDir);
          const dirLabel = newDir === 1 ? "ตามเข็มนาฬิกา 🔃" : "ทวนเข็มนาฬิกา 🔄";
          showToast(`🔄 ${data.playedByDisplayName || "ผู้เล่น"} Reverse! ลำดับเปลี่ยนเป็น ${dirLabel}`, 3500);
        }

        if (data.effect?.type === "FAVOR") {
          const me = setters.roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);
          if (me?.player_id === data.playedBy) {
            setters.setGameLogs((prev) => [...prev.slice(-19), `🤝 รอให้ผู้เล่นอื่นเลือกการ์ดให้คุณ...`]);
          }
        }
      }
    };

    // ── favorRequested ──
    const handleFavorRequested = (data: { requesterPlayerId: string; requesterName: string; availableCards?: string[] }) => {
      console.log("🤝 Favor Requested:", data);
      setters.setFavorState({
        requesterPlayerId: data.requesterPlayerId,
        requesterName: data.requesterName,
      });
      setters.setGamePhase("FAVOR_PICK_CARD");
    };

    const handleFavorRequestedBroadcast = (data: { requesterPlayerId: string; requesterName: string; availableCards?: string[]; targetPlayerId: string; }) => {
      console.log("🤝 Favor Requested Broadcast:", data);
      const me = setters.roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);
      if (me?.player_id === data.targetPlayerId) {
        setters.setFavorState({
          requesterPlayerId: data.requesterPlayerId,
          requesterName: data.requesterName,
        });
        setters.setGamePhase("FAVOR_PICK_CARD");
      }
    };

    const handleFavorCompleted = (data: { nextTurn?: { player_id: string }; cardCode: string; requesterPlayerId: string }) => {
      console.log("🤝 Favor Completed:", data);
      setters.setFavorState(null);
      setters.setGamePhase("PLAYING");
      if (data?.nextTurn?.player_id) {
        setters.setCurrentTurnPlayerId(data.nextTurn.player_id);
      }
      const me = setters.roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);
      if (me?.player_id === data.requesterPlayerId) {
        setters.setMyCards((prev) => [...prev, data.cardCode]);
      }
      setters.setGameLogs((prev) => [...prev.slice(-19), `🤝 Favor เสร็จแล้ว!`]);
    };

    // ── cardDefused ──
    const handleCardDefused = (data: CardDefusedPayload) => {
      console.log("🛡️ Card Defused:", data);
      setters.setEkBombState(null);

      const me = setters.roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);
      const defuserPlayerId = setters.currentTurnPlayerIdRef.current;
      const isMe = me && me.player_id === defuserPlayerId;

      if (isMe) {
        setters.setGamePhase("DEFUSE_INSERT");
        setters.pendingNextTurnRef.current = data?.nextTurn?.player_id ?? null;
        setters.setMyCards((prev) => {
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
        setters.setGamePhase("PLAYING");
        if (data?.nextTurn?.player_id) setters.setCurrentTurnPlayerId(data.nextTurn.player_id);
      }

      const defusingPlayer = setters.roomDataRef.current?.players?.find((p: Player) => p.player_id === defuserPlayerId);
      const displayName = defusingPlayer?.display_name ?? "ผู้เล่น";
      setters.setGameLogs((prev) => [...prev.slice(-19), `🛡️ ${displayName} กู้ระเบิดสำเร็จ!`]);
    };

    // ── ekInserted ──
    const handleEkInserted = (data: EKInsertedPayload) => {
      console.log("💣 EK Inserted:", data);
      if (data?.deck_count !== undefined) setters.setDeckCount(data.deck_count);
      setters.setGamePhase("PLAYING");
      setters.setEkBombState(null);
      if (data?.nextTurn?.player_id) setters.setCurrentTurnPlayerId(data.nextTurn.player_id);
      if (data?.nextTurn?.turn_number) setters.setTurnNumber(data.nextTurn.turn_number);
      setters.setPendingAttacks(data.nextTurn?.pending_attacks ?? 0);
      setters.setGameLogs((prev) => [...prev.slice(-19), `💣 Exploding Kitten ถูกใส่กลับคืนกอง!`]);
    };

    // ── playerEliminated ──
    const handlePlayerEliminated = (data: PlayerEliminatedPayload & { isAfkKick?: boolean; isLeftRoom?: boolean; afkPlayerId?: string; ikOnTop?: boolean; nextTurn?: { player_id: string; display_name?: string; turn_number?: number; pending_attacks?: number } }) => {
      console.log("💀 Player Eliminated:", data);

      // defer clearing bomb state so hellfire/implosion animation plays first
      const applyEliminated = () => {
        setters.setEkBombState(null);
        setters.setGamePhase(data.action === "GAME_OVER" ? "GAME_OVER" : "PLAYING");
        if (data.ikOnTop !== undefined) setters.setIkOnTop(data.ikOnTop);
        else setters.setIkOnTop(false);
      };
      setters.afterHellfireRef.current = applyEliminated;

      const eliminatedId = data?.eliminatedPlayer?.player_id
        ?? (data.isAfkKick ? data.afkPlayerId : null)
        ?? setters.currentTurnPlayerIdRef.current;

      if (eliminatedId) {
        if (!data.isAfkKick && !data.isLeftRoom) {
          setters.setEliminatedPlayerId(eliminatedId);
        }
        setters.setRoomData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            players: prev.players?.map((p: Player) =>
              p.player_id === eliminatedId ? { ...p, is_alive: false } : p,
            ),
          };
        });
      }

      if (data.action === "GAME_OVER" && data?.winner) {
        setters.setWinner(data.winner);
        setters.setGameLogs((prev) => [...prev.slice(-19), `🏆 ${data.winner!.display_name} ชนะการแข่งขัน!`]);
      }

      if (data?.nextTurn?.player_id) setters.setCurrentTurnPlayerId(data.nextTurn.player_id);
      if (data?.nextTurn?.turn_number) setters.setTurnNumber(data.nextTurn.turn_number);
      setters.setPendingAttacks(data.nextTurn?.pending_attacks ?? 0);

      const eliminatedPlayer = setters.roomDataRef.current?.players?.find((p: Player) => p.player_id === eliminatedId);
      const displayName = eliminatedPlayer?.display_name ?? "ผู้เล่น";

      if (data.isLeftRoom) {
        setters.setGameLogs((prev) => [...prev.slice(-19), `🚪 ${displayName} ตัดการเชื่อมต่อและออกจากเกม!`]);
      } else if (data.isAfkKick) {
        setters.setGameLogs((prev) => [...prev.slice(-19), `⏱️ ${displayName} ถูกคิกเพราะ AFK!`]);
      } else {
        setters.setGameLogs((prev) => [...prev.slice(-19), `💥 ${displayName} ระเบิด!`]);
      }
    };

    // ── comboPlayed ──
    const handleComboPlayed = (data: { action: string; success: boolean; comboType: "TWO_CARD" | "THREE_CARD"; stolenCard?: string; wasVoid: boolean; robbedFromDisplayName: string; robbedFromPlayerId: string; thiefHand?: string[]; targetHand?: string[]; nextTurn?: { player_id: string; display_name: string; turn_number: number }; }) => {
      console.log("🐱 Combo Played:", data);

      const me = setters.roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);

      if (me) {
        if (data.thiefHand) setters.setMyCards(data.thiefHand);
        if (data.targetHand && me.player_id === data.robbedFromPlayerId) {
          setters.setMyCards(data.targetHand);
        }
      }

      setters.setCardHands((prev) =>
        prev.map((hand) => {
          if (data.thiefHand && me && hand.player_id === me.player_id) {
            return { ...hand, card_count: data.thiefHand!.length };
          }
          if (data.robbedFromPlayerId && !data.wasVoid && hand.player_id === data.robbedFromPlayerId) {
            return { ...hand, card_count: Math.max(0, hand.card_count - 1) };
          }
          return hand;
        })
      );

      const myDisplayName = me?.display_name ?? "คุณ";
      if (data.wasVoid) {
        setters.setGameLogs((prev) => [...prev.slice(-19), `🐱 Combo 3 ใบ — ${data.robbedFromDisplayName} ไม่มีการ์ดที่ต้องการ (โมฆะ)`]);
      } else if (data.stolenCard && me) {
        setters.setGameLogs((prev) => [...prev.slice(-19), `🐱 ${myDisplayName} ขโมยการ์ดจาก ${data.robbedFromDisplayName} สำเร็จ!`]);
      } else {
        setters.setGameLogs((prev) => [...prev.slice(-19), `🐱 Combo — ขโมยการ์ดจาก ${data.robbedFromDisplayName}`]);
      }

      setters.setGamePhase("PLAYING");
      setters.setPendingAction(null);
      setters.setNopeState(null);
    };

    // ── actionPending ──
    const handleActionPending = (data: { action: "ACTION_PENDING"; playedBy: string; playedByDisplayName: string; target?: string | null; cardCode?: string; comboCards?: string[]; comboType?: string; demandedCard?: string; }) => {
      console.log("⏳ Action Pending (Nope Window):", data);
      const me = setters.roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);

      if (me?.player_id !== data.playedBy) {
        setters.setCardHands((prev) =>
          prev.map((hand) => {
            if (hand.player_id === data.playedBy) {
              const cardsToSubtract = data.comboCards ? data.comboCards.length : (data.cardCode ? 1 : 0);
              return { ...hand, card_count: Math.max(0, hand.card_count - cardsToSubtract) };
            }
            return hand;
          })
        );
      }

      setters.setPendingAction({
        playedBy: data.playedBy,
        playedByDisplayName: data.playedByDisplayName,
        cardCode: data.cardCode,
        comboCards: data.comboCards,
        target: data.target,
      });
      setters.setNopeState(null);
      setters.setGamePhase("NOPE_WINDOW");
    };

    // ── nopePlayed ──
    const handleNopePlayed = (data: { action: "NOPE_PLAYED"; nopeCount: number; isCancel: boolean; playedBy: string; playedByDisplayName: string; }) => {
      console.log("🚫 Nope Played:", data);
      setters.setNopeState({
        nopeCount: data.nopeCount,
        isCancel: data.isCancel,
        lastPlayedByDisplayName: data.playedByDisplayName,
      });

      const me = setters.roomDataRef.current?.players?.find((p: Player) => p.player_token === myPlayerToken);
      if (me?.player_id !== data.playedBy) {
        setters.setCardHands((prev) =>
          prev.map((hand) => {
            if (hand.player_id === data.playedBy) {
              return { ...hand, card_count: Math.max(0, hand.card_count - 1) };
            }
            return hand;
          })
        );
      }
      setters.setGameLogs((prev) => [...prev.slice(-19), `🚫 ${data.playedByDisplayName} เล่น Nope! (${data.isCancel ? "ยกเลิก" : "ผ่าน"})`]);
    };

    // ── actionCancelled ──
    const handleActionCancelled = (data: {
      action: "ACTION_CANCELLED";
      cardCode?: string;
      comboCards?: string[];
      playedBy?: string;
      playedByDisplayName?: string;
    }) => {
      console.log("❌ Action Cancelled:", data);
      setters.setGamePhase("PLAYING");
      setters.setPendingAction(null);
      setters.setNopeState(null);

      // Build a descriptive log so players know what happened (prevents "freeze" confusion)
      const cardLabel = data.comboCards
        ? `Combo (${data.comboCards.length} ใบ)`
        : data.cardCode ?? "การ์ด";
      const who = data.playedByDisplayName ?? "ผู้เล่น";
      setters.setGameLogs((prev) => [
        ...prev.slice(-19),
        `🚫 ${who} ถูก Nope! — ${cardLabel} ถูกยกเลิก`,
      ]);
    };

    const handleDeckConfigChanged = (data: DeckConfigChangedPayload) => {
      console.log("⚙️ Deck Config Changed:", data);
      showToast("⚙️ Deck config changed");
      setters.setGameLogs((prev) => [...prev.slice(-19), `⚙️ Deck config changed`]);
    };

    // ── alterTheFutureCommitted ──
    const handleAlterTheFutureCommitted = (data: { success: boolean; action: string }) => {
      console.log("✨ Alter the Future Committed:", data);
      setters.setSeeTheFutureCards([]);
      setters.setGamePhase("PLAYING");
      setters.setGameLogs((prev) => [...prev.slice(-19), `✨ ลำดับไพ่ถูกเปลี่ยนแล้ว!`]);
    };

    // ── playerDisconnected ──
    const handlePlayerDisconnected = (data: { playerToken: string }) => {
      console.log("🔌 Player Disconnected:", data);
      const player = setters.roomDataRef.current?.players?.find((p: Player) => p.player_token === data.playerToken);
      if (player && player.role !== "SPECTATOR" && player.is_alive !== false) {
        setters.setGameLogs((prev) => [...prev.slice(-19), `🔌 ${player.display_name} สัญญาณขาดหาย... กำลังรอการเชื่อมต่อใหม่ (60 วิ)`]);
        showToast(`🔌 ${player.display_name} สัญญาณขาดหาย...`, 4000);
      }
    };

    // ── handCountsUpdated — sync card counts for all players ──
    const handleHandCountsUpdated = (data: { handCounts: Record<string, number> }) => {
      setters.setCardHands((prev) =>
        prev.map((hand) => {
          const newCount = data.handCounts[hand.player_id];
          if (newCount !== undefined && newCount !== hand.card_count) {
            return { ...hand, card_count: newCount };
          }
          return hand;
        })
      );
    };


    // ── privateHandSync — server sends our actual hand after combo/favor ──
    const handlePrivateHandSync = (data: { cards: string[]; card_count: number }) => {
      setters.setMyCards(data.cards);
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
    socket.on("ikPlacedBack", handleIkPlacedBack);
    socket.on("playerEliminated", handlePlayerEliminated);
    socket.on("comboPlayed", handleComboPlayed);
    socket.on("actionPending", handleActionPending);
    socket.on("nopePlayed", handleNopePlayed);
    socket.on("actionCancelled", handleActionCancelled);
    socket.on("alterTheFutureCommitted", handleAlterTheFutureCommitted);
    socket.on("playerDisconnected", handlePlayerDisconnected);
    socket.on("handCountsUpdated", handleHandCountsUpdated);
    socket.on("privateHandSync", handlePrivateHandSync);

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
      socket.off("ikPlacedBack", handleIkPlacedBack);
      socket.off("playerEliminated", handlePlayerEliminated);
      socket.off("comboPlayed", handleComboPlayed);
      socket.off("actionPending", handleActionPending);
      socket.off("nopePlayed", handleNopePlayed);
      socket.off("actionCancelled", handleActionCancelled);
      socket.off("alterTheFutureCommitted", handleAlterTheFutureCommitted);
      socket.off("playerDisconnected", handlePlayerDisconnected);
      socket.off("handCountsUpdated", handleHandCountsUpdated);
      socket.off("privateHandSync", handlePrivateHandSync);
    };
  }, [socket, roomId, setters]);
}