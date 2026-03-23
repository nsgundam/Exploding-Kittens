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
          display_name: "", // Will be filled by caller logging
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
  const deckState = await tx.deckState.findUnique({
    where: { session_id: session.session_id },
  });
  if (!deckState) throw new NotFoundError("Deck state");

  const deck = deckState.deck_order as string[];
  const topCards = deck.slice(-3).reverse();

  return { effect: { type: "SEE_THE_FUTURE", topCards } };
};

const handleShuffleEffect: EffectHandler = async ({ tx, session }) => {
  const deckState = await tx.deckState.findUnique({
    where: { session_id: session.session_id },
  });
  if (!deckState) throw new NotFoundError("Deck state");

  const deck = deckState.deck_order as string[];
  const shuffled = shuffleArray(deck);

  await tx.deckState.update({
    where: { session_id: session.session_id },
    data: { deck_order: shuffled },
  });

  return { effect: { type: "SHUFFLE", shuffled: true } };
};

const effectHandlers: Record<string, EffectHandler> = {
  [CardCode.ATTACK]: handleAttackEffect,
  [CardCode.SKIP]: handleSkipEffect,
  [CardCode.SEE_THE_FUTURE]: handleSeeTheFutureEffect,
  [CardCode.SHUFFLE]: handleShuffleEffect,
};

export const applyCardEffect = async (
  normalizedCode: string,
  context: EffectContext
): Promise<{ effect?: CardEffectResult; turnResult?: TurnAdvancedResult }> => {
  // Guard clause for unimplemented sprint 3 and 4 cards
  if (["FV", "NP", "TA", "RF", "RH", "AG", "AF", "DB", "FC"].includes(normalizedCode)) {
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
