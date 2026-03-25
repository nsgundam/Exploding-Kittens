import { Prisma, GameSession } from "@prisma/client";
import { CardEffectResult, TurnAdvancedResult } from "../../types/types";
import { CardCode } from "../../constants/game";
import { NotFoundError, BadRequestError } from "../../utils/errors";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

export interface EffectContext {
  tx: Prisma.TransactionClient;
  session: GameSession;
  roomId: string;
  currentPlayerId: string;
  targetPlayerToken?: string;
  advanceTurn: (
    tx: Prisma.TransactionClient,
    session: GameSession,
    roomId: string,
    currentPlayerId: string
  ) => Promise<TurnAdvancedResult>;
}

export type EffectHandler = (
  context: EffectContext
) => Promise<{ effect?: CardEffectResult; turnResult?: TurnAdvancedResult }>;

const handleAttackEffect: EffectHandler = async ({ tx, session, roomId, currentPlayerId, advanceTurn }) => {
  const newPending = (session.pending_attacks ?? 0) + 2;
  await tx.gameSession.update({
    where: { session_id: session.session_id },
    data: { pending_attacks: newPending },
  });
  const updatedSession = { ...session, pending_attacks: newPending };
  const turnResult = await advanceTurn(tx, updatedSession, roomId, currentPlayerId);
  return { effect: { type: "ATTACK", extraTurns: 2 }, turnResult };
};

const handleSkipEffect: EffectHandler = async ({ tx, session, roomId, currentPlayerId, advanceTurn }) => {
  const pendingAttacks = session.pending_attacks ?? 0;
  if (pendingAttacks > 0) {
    await tx.gameSession.update({
      where: { session_id: session.session_id },
      data: { pending_attacks: pendingAttacks - 1 },
    });
  }
  if (pendingAttacks > 1) {
    return {
      effect: { type: "SKIP" },
      turnResult: {
        success: true,
        action: "TURN_ADVANCED",
        nextTurn: {
          player_id: currentPlayerId,
          display_name: "",
          turn_number: session.turn_number + 1,
          pending_attacks: pendingAttacks - 1,
        },
      },
    };
  }
  const turnResult = await advanceTurn(tx, { ...session, pending_attacks: 0 }, roomId, currentPlayerId);
  return { effect: { type: "SKIP" }, turnResult };
};

const handleSeeTheFutureEffect: EffectHandler = async ({ tx, session }) => {
  const deckState = await tx.deckState.findUnique({ where: { session_id: session.session_id } });
  if (!deckState) throw new NotFoundError("Deck state");
  const deck = deckState.deck_order as string[];
  return { effect: { type: "SEE_THE_FUTURE", topCards: deck.slice(-3).reverse() } };
};

const handleShuffleEffect: EffectHandler = async ({ tx, session }) => {
  const deckState = await tx.deckState.findUnique({ where: { session_id: session.session_id } });
  if (!deckState) throw new NotFoundError("Deck state");
  const shuffled = shuffleArray(deckState.deck_order as string[]);
  await tx.deckState.update({ where: { session_id: session.session_id }, data: { deck_order: shuffled } });
  return { effect: { type: "SHUFFLE", shuffled: true } };
};

/**
 * FV (Favor): ขอการ์ดจากผู้เล่นอื่น 1 ใบ
 * — ไม่ advance turn เพราะต้องรอ target เลือกการ์ดก่อน
 */
const handleFavorEffect: EffectHandler = async ({ tx, session, roomId, currentPlayerId, targetPlayerToken }) => {
  if (!targetPlayerToken) {
    throw new BadRequestError("Favor card requires a target player");
  }

  // หา target player
  const targetPlayer = await tx.player.findFirst({
    where: { room_id: roomId, player_token: targetPlayerToken, is_alive: true },
  });
  if (!targetPlayer) throw new NotFoundError("Target player not found");

  // ดึงไพ่ใน hand ของ target (ไม่รวม EK และ DF)
  const targetHand = await tx.cardHand.findUnique({
    where: {
      player_id_session_id: {
        player_id: targetPlayer.player_id,
        session_id: session.session_id,
      },
    },
  });
  const targetCards = ((targetHand?.cards ?? []) as string[]).filter(
    (c) => c !== CardCode.EXPLODING_KITTEN && c !== CardCode.GVE_EXPLODING_KITTEN &&
           c !== CardCode.DEFUSE && c !== CardCode.GVE_DEFUSE
  );

  if (targetCards.length === 0) {
    throw new BadRequestError("Target player has no cards to give");
  }

  return {
    effect: {
      type: "FAVOR",
      targetPlayerId: targetPlayer.player_id,
      targetDisplayName: targetPlayer.display_name,
      availableCards: targetCards,
    },
  };
  // หมายเหตุ: ไม่ advanceTurn ที่นี่ — รอ favorPickCard event แทน
};

const handleFavorEffect: EffectHandler = async ({ tx, session, roomId, currentPlayerId, targetPlayerToken }) => {
  if (!targetPlayerToken) throw new BadRequestError("Target player token is required for Favor");
  const target = await tx.player.findFirst({
    where: { room_id: roomId, player_token: targetPlayerToken, is_alive: true },
  });
  if (!target) throw new NotFoundError("Target player");
  if (target.player_id === currentPlayerId) throw new BadRequestError("Cannot target yourself");

  const targetHand = await tx.cardHand.findUnique({
    where: { player_id_session_id: { player_id: target.player_id, session_id: session.session_id } },
  });
  const targetCards = (targetHand?.cards ?? []) as string[];
  if (targetCards.length === 0) throw new BadRequestError("Target has no cards to give");

  const requester = await tx.player.findUnique({
    where: { player_id: currentPlayerId },
  });

  // Specifically DO NOT advance the turn here. 
  // Turn advances after the target picks a card via favorPickCard.
  return {
    effect: {
      type: "FAVOR_PENDING", 
      targetPlayerId: target.player_id, 
      targetDisplayName: target.display_name,
      requesterId: currentPlayerId,
      requesterDisplayName: requester?.display_name || "Unknown",
    }
  };
};

const effectHandlers: Record<string, EffectHandler> = {
  [CardCode.ATTACK]: handleAttackEffect,
  [CardCode.SKIP]: handleSkipEffect,
  [CardCode.SEE_THE_FUTURE]: handleSeeTheFutureEffect,
  [CardCode.SHUFFLE]: handleShuffleEffect,
  [CardCode.FAVOR]: handleFavorEffect,
};

export const applyCardEffect = async (
  normalizedCode: string,
  context: EffectContext
): Promise<{ effect?: CardEffectResult; turnResult?: TurnAdvancedResult }> => {
  // Guard clause for unimplemented sprint 3 and 4 cards
  if (["NP", "TA", "RF", "RH", "AG", "AF", "DB", "FC"].includes(normalizedCode)) {
    throw new BadRequestError(`Card ${normalizedCode} action is not yet implemented (planned for Sprint 3/4)`);
  }
  if (normalizedCode.startsWith("CAT_") || normalizedCode === "MC") {
    throw new BadRequestError(`Combo cards are not yet implemented (planned for Sprint 3)`);
  }

  const handler = effectHandlers[normalizedCode];
  if (!handler) {
    throw new BadRequestError(`Unknown card: ${normalizedCode}`);
  }

  return await handler(context);
};

export const handleFavorResponseEffect = async ({
  tx,
  session,
  roomId,
  targetPlayerToken,
  cardCode,
  advanceTurn,
}: {
  tx: Prisma.TransactionClient;
  session: GameSession;
  roomId: string;
  targetPlayerToken: string;
  cardCode?: string;
  advanceTurn: (
    tx: Prisma.TransactionClient,
    session: GameSession,
    roomId: string,
    currentPlayerId: string
  ) => Promise<TurnAdvancedResult>;
}) => {
  const target = await tx.player.findFirst({
    where: { room_id: roomId, player_token: targetPlayerToken },
  });
  if (!target) throw new NotFoundError("Target player");

  // ดึง requester จาก last log FAVOR_PENDING
  const lastLog = await tx.gameLog.findFirst({
    where: {
      session_id: session.session_id,
      action_details: { path: ["effect"], equals: "FAVOR_PENDING" },
    },
    orderBy: { timestamp: "desc" },
  });
  if (!lastLog) throw new BadRequestError("No pending Favor request");

  const details = lastLog.action_details as {
    target_player_id: string;
  };
  if (details.target_player_id !== target.player_id)
    throw new BadRequestError("You are not the Favor target");

  const requester = await tx.player.findFirst({
    where: { room_id: roomId, player_id: lastLog.player_id },
  });
  if (!requester) throw new NotFoundError("Requester player");

  const targetHand = await tx.cardHand.findUnique({
    where: { player_id_session_id: { player_id: target.player_id, session_id: session.session_id } },
  });
  const targetCards = (targetHand?.cards ?? []) as string[];

  // ไม่มี cardCode = สุ่ม (timeout), มี cardCode = target เลือกเอง
  let selectedCard: string;
  if (!cardCode) {
    const randomIndex = Math.floor(Math.random() * targetCards.length);
    selectedCard = targetCards[randomIndex]!;
  } else {
    if (!targetCards.includes(cardCode))
      throw new BadRequestError("Card not in target's hand");
    selectedCard = cardCode;
  }

  // โอนไพ่ target → requester
  let removed = false;
  const newTargetCards = targetCards.filter((c) => {
    if (c === selectedCard && !removed) { removed = true; return false; }
    return true;
  });
  await tx.cardHand.update({
    where: { player_id_session_id: { player_id: target.player_id, session_id: session.session_id } },
    data: { cards: newTargetCards, card_count: newTargetCards.length },
  });

  const requesterHand = await tx.cardHand.findUnique({
    where: { player_id_session_id: { player_id: requester.player_id, session_id: session.session_id } },
  });
  const requesterCards = (requesterHand?.cards ?? []) as string[];
  await tx.cardHand.update({
    where: { player_id_session_id: { player_id: requester.player_id, session_id: session.session_id } },
    data: { cards: [...requesterCards, selectedCard], card_count: requesterCards.length + 1 },
  });

  await tx.gameLog.create({
    data: {
      session_id: session.session_id,
      player_id: target.player_id,
      player_display_name: target.display_name,
      action_type: "FAVOR_RESPONSE",
      action_details: {
        card: selectedCard,
        given_to_player_id: requester.player_id,
        was_random: !cardCode,
      },
      turn_number: session.turn_number,
    },
  });

  const turnResult = await advanceTurn(
    tx, session, roomId, session.current_turn_player_id!
  );
  
  return { ...turnResult, transferredCard: selectedCard, wasRandom: !cardCode, requesterPlayerId: requester.player_id };
};

