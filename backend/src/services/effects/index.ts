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

// ── Targeted Attack (TA) ────────────────────────────────────────
// Same stacking as AT but jumps directly to the chosen target.
const handleTargetedAttackEffect: EffectHandler = async ({ tx, session, roomId, currentPlayerId, targetPlayerToken }) => {
  if (!targetPlayerToken) {
    throw new BadRequestError("Targeted Attack requires a target player");
  }

  const target = await tx.player.findFirst({
    where: { room_id: roomId, player_token: targetPlayerToken, is_alive: true },
  });
  if (!target) throw new NotFoundError("Target player not found or already eliminated");
  if (target.player_id === currentPlayerId) {
    throw new BadRequestError("Cannot target yourself with Targeted Attack");
  }

  const newPending = (session.pending_attacks ?? 0) + 2;

  await tx.gameSession.update({
    where: { session_id: session.session_id },
    data: {
      current_turn_player_id: target.player_id,
      pending_attacks: newPending,
      turn_number: session.turn_number + 1,
    },
  });

  return {
    effect: { type: "TARGETED_ATTACK", extraTurns: newPending },
    turnResult: {
      success: true,
      action: "TURN_ADVANCED" as const,
      nextTurn: {
        player_id: target.player_id,
        display_name: target.display_name,
        turn_number: session.turn_number + 1,
        pending_attacks: newPending,
      },
    },
  };
};

// ── Reverse (RF) ────────────────────────────────────────────
// Flips turn direction. If under attack, pending turns bounce back
// to the player who last attacked (the "previous" player in old direction).
const handleReverseEffect: EffectHandler = async ({ tx, session, roomId, currentPlayerId }) => {
  const oldDirection = session.direction ?? 1;
  const newDirection = oldDirection * -1; // flip: 1 → -1 or -1 → 1

  const alivePlayers = await tx.player.findMany({
    where: { room_id: roomId, is_alive: true, role: "PLAYER" },
    orderBy: { seat_number: "asc" },
  });

  const currentIndex = alivePlayers.findIndex((p) => p.player_id === currentPlayerId);

  // "previous" in old direction = "next" in new direction
  const nextIndex = (currentIndex + newDirection + alivePlayers.length) % alivePlayers.length;
  const nextPlayer = alivePlayers[nextIndex];
  if (!nextPlayer) throw new NotFoundError("Cannot determine next player");

  const pendingAttacks = session.pending_attacks ?? 0;
  const remainingAttacks = pendingAttacks > 0 ? pendingAttacks - 1 : 0;

  if (remainingAttacks > 0) {
    // B ยังมี pending เหลือ → B เล่นต่อ (direction flip แล้ว), คนถัดไปคือทิศใหม่ (A)
    await tx.gameSession.update({
      where: { session_id: session.session_id },
      data: {
        direction: newDirection,
        current_turn_player_id: currentPlayerId, // B ยังเล่นอยู่
        pending_attacks: remainingAttacks,
        turn_number: session.turn_number + 1,
      },
    });

    const currentPlayer = alivePlayers.find((p) => p.player_id === currentPlayerId);
    return {
      effect: { type: "REVERSE", direction: newDirection },
      turnResult: {
        success: true,
        action: "TURN_ADVANCED" as const,
        nextTurn: {
          player_id: currentPlayerId,
          display_name: currentPlayer?.display_name ?? "",
          turn_number: session.turn_number + 1,
          pending_attacks: remainingAttacks,
        },
      },
    };
  }

  // ไม่มี pending → advance ตามทิศใหม่ปกติ (ไป A)
  await tx.gameSession.update({
    where: { session_id: session.session_id },
    data: {
      direction: newDirection,
      current_turn_player_id: nextPlayer.player_id,
      pending_attacks: 0,
      turn_number: session.turn_number + 1,
    },
  });

  return {
    effect: { type: "REVERSE", direction: newDirection },
    turnResult: {
      success: true,
      action: "TURN_ADVANCED" as const,
      nextTurn: {
        player_id: nextPlayer.player_id,
        display_name: nextPlayer.display_name,
        turn_number: session.turn_number + 1,
        pending_attacks: 0,
      },
    },
  };
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

// ── Alter the Future (AF) ──────────────────────────────
// See top 3 AND rearrange them. Requires a follow-up commitAlterTheFuture call.
const handleAlterTheFutureEffect: EffectHandler = async ({ tx, session }) => {
  const deckState = await tx.deckState.findUnique({ where: { session_id: session.session_id } });
  if (!deckState) throw new NotFoundError("Deck state");
  const deck = deckState.deck_order as string[];
  // Return top cards in viewing order (topmost first) — same as SF
  const topCards = deck.slice(-3).reverse();
  return { effect: { type: "ALTER_THE_FUTURE", topCards } };
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

  const targetPlayer = await tx.player.findFirst({
    where: { room_id: roomId, player_token: targetPlayerToken, is_alive: true },
  });
  if (!targetPlayer) throw new NotFoundError("Target player not found");

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
};

const effectHandlers: Record<string, EffectHandler> = {
  [CardCode.ATTACK]: handleAttackEffect,
  [CardCode.TARGETED_ATTACK]: handleTargetedAttackEffect,
  [CardCode.SKIP]: handleSkipEffect,
  [CardCode.SEE_THE_FUTURE]: handleSeeTheFutureEffect,
  [CardCode.ALTER_THE_FUTURE]: handleAlterTheFutureEffect,
  [CardCode.SHUFFLE]: handleShuffleEffect,
  [CardCode.REVERSE]: handleReverseEffect,
  FV: handleFavorEffect,
};

export const applyCardEffect = async (
  normalizedCode: string,
  context: EffectContext
): Promise<{ effect?: CardEffectResult; turnResult?: TurnAdvancedResult }> => {
  if (["NP", "RH", "AG", "FC"].includes(normalizedCode)) {
    throw new BadRequestError(`Card ${normalizedCode} action is not yet implemented`);
  }
  if (normalizedCode.startsWith("CAT_") || normalizedCode === "MC") {
    throw new BadRequestError(`Combo cards are not yet implemented`);
  }

  const handler = effectHandlers[normalizedCode];
  if (!handler) {
    throw new BadRequestError(`Unknown card: ${normalizedCode}`);
  }

  return await handler(context);
};