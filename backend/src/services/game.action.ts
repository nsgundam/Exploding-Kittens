import { Prisma, RoomStatus, GameSessionStatus } from "@prisma/client";
import { ActionType } from "../constants/game";
import { prisma } from "../config/prisma";
import {
  PlayCardResult,
  FavorPendingResult,
  FavorResponseResult,
  ComboResult,
  TurnAdvancedResult,
} from "../types/types";
import { NotFoundError, BadRequestError } from "../utils/errors";

function isCatCard(code: string): boolean {
  const CAT_CODES = new Set([
    "CAT_TACO", "CAT_MELON", "CAT_BEARD", "CAT_RAINBOW", "CAT_POTATO",
    "FC", "GVE_FC", "MC", "GVE_MC",
  ]);
  return CAT_CODES.has(code);
}

function isFeralCat(code: string): boolean {
  return code === "FC" || code === "GVE_FC";
}

function validateCombo(comboCards: string[]): void {
  if (comboCards.length < 2 || comboCards.length > 3) {
    throw new BadRequestError("Combo must be 2 or 3 cards");
  }
  for (const c of comboCards) {
    if (!isCatCard(c)) {
      throw new BadRequestError(`Card ${c} is not a cat card`);
    }
  }
  const nonFeral = comboCards.filter((c) => !isFeralCat(c));
  if (nonFeral.length > 1) {
    const base = nonFeral[0]!;
    if (!nonFeral.every((c) => c === base)) {
      throw new BadRequestError(
        "Combo cards must all be the same type (Feral Cat can substitute any)"
      );
    }
  }
}

export async function playCard(
  roomId: string,
  playerToken: string,
  cardCode: string,
  targetPlayerToken?: string,
): Promise<PlayCardResult> {
  return await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { room_id: roomId },
    });
    if (!room) throw new NotFoundError("Room");
    if (room.status !== RoomStatus.PLAYING)
      throw new BadRequestError("Game is not active");

    const session = await tx.gameSession.findFirst({
      where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS },
    });
    if (!session) throw new NotFoundError("No active session");

    const player = await tx.player.findFirst({
      where: { room_id: roomId, player_token: playerToken },
    });
    if (!player) throw new NotFoundError("Player");
    if (session.current_turn_player_id !== player.player_id) {
      throw new BadRequestError("It's not your turn");
    }

    if (player.afk_count > 0) {
      await tx.player.update({
        where: { player_id: player.player_id },
        data: { afk_count: 0 },
      });
    }

    const hand = await tx.cardHand.findUnique({
      where: {
        player_id_session_id: { player_id: player.player_id, session_id: session.session_id },
      },
    });
    const cards = (hand?.cards ?? []) as string[];
    if (!cards.includes(cardCode)) {
      throw new BadRequestError("Card not in hand");
    }

    let removed = false;
    const newCards = cards.filter((c) => {
      if (c === cardCode && !removed) { removed = true; return false; }
      return true;
    });

    await tx.cardHand.update({
      where: {
        player_id_session_id: { player_id: player.player_id, session_id: session.session_id },
      },
      data: { cards: newCards, card_count: newCards.length },
    });

    const deckState = await tx.deckState.findUnique({
      where: { session_id: session.session_id },
    });
    if (!deckState) throw new NotFoundError("Deck state");

    const discardPile = (deckState.discard_pile as string[]) ?? [];
    await tx.deckState.update({
      where: { session_id: session.session_id },
      data: { discard_pile: [...discardPile, cardCode] },
    });

    const pendingAction = { type: "PLAY_CARD", cardCode, playedByToken: playerToken, targetPlayerToken };

    await tx.gameSession.update({
      where: { session_id: session.session_id },
      data: {
        pending_action: pendingAction as any,
        pending_action_timestamp: new Date(),
        nope_count: 0,
      },
    });

    await tx.gameLog.create({
      data: {
        session_id: session.session_id,
        player_id: player.player_id,
        player_display_name: player.display_name,
        action_type: "ACTION_PENDING",
        action_details: { card: cardCode, target: targetPlayerToken ?? null },
        turn_number: session.turn_number,
      },
    });

    return {
      success: true,
      action: "ACTION_PENDING",
      cardCode,
      playedBy: player.player_id,
      playedByDisplayName: player.display_name,
      target: targetPlayerToken ?? null,
    };
  });
}

export async function comboCard(
  roomId: string,
  playerToken: string,
  comboCards: string[],
  targetPlayerToken: string,
  demandedCard?: string,
): Promise<ComboResult> {
  return await prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.findFirst({
      where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS },
    });
    if (!session) throw new NotFoundError("No active session");

    const player = await tx.player.findFirst({
      where: { room_id: roomId, player_token: playerToken, is_alive: true },
    });
    if (!player) throw new NotFoundError("Player");
    if (session.current_turn_player_id !== player.player_id)
      throw new BadRequestError("It's not your turn");
    if (playerToken === targetPlayerToken)
      throw new BadRequestError("Cannot target yourself");

    validateCombo(comboCards);
    const isThreeCard = comboCards.length === 3;

    const hand = await tx.cardHand.findUnique({
      where: { player_id_session_id: { player_id: player.player_id, session_id: session.session_id } },
    });
    const remaining = [...((hand?.cards ?? []) as string[])];
    for (const cardCode of comboCards) {
      const idx = remaining.indexOf(cardCode);
      if (idx === -1) throw new BadRequestError(`Card ${cardCode} not in hand`);
      remaining.splice(idx, 1);
    }

    const target = await tx.player.findFirst({
      where: { room_id: roomId, player_token: targetPlayerToken, is_alive: true },
    });
    if (!target) throw new NotFoundError("Target player not found or eliminated");

    const targetHand = await tx.cardHand.findUnique({
      where: { player_id_session_id: { player_id: target.player_id, session_id: session.session_id } },
    });
    const targetCards = [...((targetHand?.cards ?? []) as string[])];
    if (targetCards.length === 0)
      throw new BadRequestError("Target player has no cards");

    await tx.cardHand.update({
      where: { player_id_session_id: { player_id: player.player_id, session_id: session.session_id } },
      data: { cards: remaining, card_count: remaining.length },
    });

    const deckState = await tx.deckState.findUnique({ where: { session_id: session.session_id } });
    const discardPile = (deckState?.discard_pile as string[]) ?? [];
    await tx.deckState.update({
      where: { session_id: session.session_id },
      data: { discard_pile: [...discardPile, ...comboCards] },
    });

    const pendingAction = { type: "COMBO_CARD", comboCards, playedByToken: playerToken, targetPlayerToken, demandedCard };

    await tx.gameSession.update({
      where: { session_id: session.session_id },
      data: {
        pending_action: pendingAction as any,
        pending_action_timestamp: new Date(),
        nope_count: 0,
      },
    });

    await tx.gameLog.create({
      data: {
        session_id: session.session_id,
        player_id: player.player_id,
        player_display_name: player.display_name,
        action_type: "ACTION_PENDING",
        action_details: {
          combo_type: isThreeCard ? "THREE_CARD" : "TWO_CARD",
          combo_cards: comboCards,
          target_player_id: target.player_id,
          demanded_card: demandedCard ?? null,
        },
        turn_number: session.turn_number,
      },
    });

    return {
      success: true as const,
      action: "ACTION_PENDING" as const,
      comboType: isThreeCard ? ("THREE_CARD" as const) : ("TWO_CARD" as const),
      comboCards,
      playedBy: player.player_id,
      playedByDisplayName: player.display_name,
      robbedFromDisplayName: target.display_name,
      robbedFromPlayerId: target.player_id,
    };
  });
}

export async function favorCard(
  roomId: string,
  playerToken: string,
  targetPlayerToken: string,
): Promise<FavorPendingResult> {
  return await prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.findFirst({
      where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS },
    });
    if (!session) throw new NotFoundError("No active session");

    const player = await tx.player.findFirst({
      where: { room_id: roomId, player_token: playerToken },
    });
    if (!player) throw new NotFoundError("Player");
    if (session.current_turn_player_id !== player.player_id)
      throw new BadRequestError("It's not your turn");
    if (playerToken === targetPlayerToken)
      throw new BadRequestError("Cannot target yourself");

    const target = await tx.player.findFirst({
      where: { room_id: roomId, player_token: targetPlayerToken, is_alive: true },
    });
    if (!target) throw new NotFoundError("Target player");

    const targetHand = await tx.cardHand.findUnique({
      where: { player_id_session_id: { player_id: target.player_id, session_id: session.session_id } },
    });
    const targetCards = (targetHand?.cards ?? []) as string[];
    if (targetCards.length === 0)
      throw new BadRequestError("Target has no cards to give");

    const hand = await tx.cardHand.findUnique({
      where: { player_id_session_id: { player_id: player.player_id, session_id: session.session_id } },
    });
    const cards = (hand?.cards ?? []) as string[];
    const fvCode = cards.includes("GVE_FV") ? "GVE_FV" : "FV";
    if (!cards.includes(fvCode))
      throw new BadRequestError("No Favor card in hand");

    let removed = false;
    const newCards = cards.filter((c) => {
      if (c === fvCode && !removed) { removed = true; return false; }
      return true;
    });
    await tx.cardHand.update({
      where: { player_id_session_id: { player_id: player.player_id, session_id: session.session_id } },
      data: { cards: newCards, card_count: newCards.length },
    });

    const deckState = await tx.deckState.findUnique({ where: { session_id: session.session_id } });
    const discardPile = (deckState?.discard_pile as string[]) ?? [];
    await tx.deckState.update({
      where: { session_id: session.session_id },
      data: { discard_pile: [...discardPile, fvCode] },
    });

    await tx.gameLog.create({
      data: {
        session_id: session.session_id,
        player_id: player.player_id,
        player_display_name: player.display_name,
        action_type: ActionType.PLAY_CARD,
        action_details: { card: fvCode, target_player_token: targetPlayerToken, target_player_id: target.player_id, effect: ActionType.FAVOR_PENDING },
        turn_number: session.turn_number,
      },
    });

    return {
      success: true as const,
      action: ActionType.FAVOR_PENDING,
      requesterId: player.player_id,
      requesterDisplayName: player.display_name,
      targetId: target.player_id,
      targetDisplayName: target.display_name,
      targetCardCount: targetCards.length,
    };
  });
}

export async function favorResponse(
  roomId: string,
  targetPlayerToken: string,
  cardCode?: string,
): Promise<FavorResponseResult> {
  return await prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.findFirst({
      where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS },
    });
    if (!session) throw new NotFoundError("No active session");

    const target = await tx.player.findFirst({
      where: { room_id: roomId, player_token: targetPlayerToken },
    });
    if (!target) throw new NotFoundError("Target player");

    const lastFavorLog = await tx.gameLog.findFirst({
      where: { session_id: session.session_id, action_type: ActionType.PLAY_CARD, action_details: { path: ["effect"], string_contains: "FAVOR" } },
      orderBy: { timestamp: "desc" },
    });
    if (!lastFavorLog) throw new BadRequestError("No pending Favor request");

    const requester = await tx.player.findFirst({
      where: { room_id: roomId, player_id: lastFavorLog.player_id },
    });
    if (!requester) throw new NotFoundError("Requester player");

    const targetHand = await tx.cardHand.findUnique({
      where: { player_id_session_id: { player_id: target.player_id, session_id: session.session_id } },
    });
    const targetCards = (targetHand?.cards ?? []) as string[];

    let selectedCard: string;
    if (!cardCode) {
      selectedCard = targetCards[Math.floor(Math.random() * targetCards.length)]!;
    } else {
      if (!targetCards.includes(cardCode))
        throw new BadRequestError("Card not in target's hand");
      selectedCard = cardCode;
    }

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
        action_type: ActionType.FAVOR_RESPONSE,
        action_details: { card: selectedCard, given_to_player_id: requester.player_id, was_random: !cardCode },
        turn_number: session.turn_number,
      },
    });

    return {
      success: true as const,
      action: "TURN_ADVANCED" as const,
      nextTurn: {
        player_id: session.current_turn_player_id!,
        display_name: requester.display_name,
        turn_number: session.turn_number,
      },
      transferredCard: selectedCard,
      wasRandom: !cardCode,
    };
  });
}
