import { Prisma, RoomStatus, GameSessionStatus, PlayerRole, GameSession, Player } from "@prisma/client";
import { ActionType, CardCode, EliminationReason } from "../constants/game";
import { prisma } from "../config/prisma";
import { handleDrawIK, insertIKBack } from "./imploding.service";
import { buildBaseDeck, dealCards, finalizeDeck } from "./game.deck";
import { advanceTurn, checkWinnerOrAdvance, handleAFK, resolveDrawCompletion } from "./game.turn";
import {
  StartGameResult,
  TurnAdvancedResult,
  GameOverResult,
  ExplodingKittenDrawnResult,
  RoomWithDeckConfig,
} from "../types/types";
import { NotFoundError, BadRequestError, ForbiddenError } from "../utils/errors";

export async function createGameSession(
  tx: Prisma.TransactionClient,
  roomId: string,
  players: Player[],
  finalDeck: string[],
  hands: Record<string, string[]>,
  hostPlayerToken: string,
) {
  const firstPlayer = players[0];
  if (!firstPlayer) throw new BadRequestError("No players available to start game");

  const session = await tx.gameSession.create({
    data: {
      room_id: roomId,
      status: GameSessionStatus.IN_PROGRESS,
      current_turn_player_id: firstPlayer.player_id,
      turn_number: 1,
      start_time: new Date(),
      direction: 1,
      pending_attacks: 0,
    },
  });

  await tx.deckState.create({
    data: {
      session_id: session.session_id,
      deck_order: finalDeck,
      discard_pile: [],
      cards_remaining: finalDeck.length,
    },
  });

  await tx.cardHand.createMany({
    data: players.map((p) => ({
      player_id: p.player_id,
      session_id: session.session_id,
      cards: hands[p.player_id] ?? [],
      card_count: (hands[p.player_id] ?? []).length,
    })),
  });

  const hostPlayer = players.find((p) => p.player_token === hostPlayerToken) ?? players[0];
  if (!hostPlayer) throw new BadRequestError("Host player not found");

  const ekCount = players.length - 1;

  await tx.gameLog.create({
    data: {
      session_id: session.session_id,
      player_id: hostPlayer.player_id,
      player_display_name: hostPlayer.display_name,
      action_type: ActionType.GAME_STARTED,
      action_details: {
        player_count: players.length,
        turn_order: players.map((p) => ({
          player_id: p.player_id,
          display_name: p.display_name,
          seat_number: p.seat_number,
        })),
        first_turn_player_id: firstPlayer.player_id,
        first_turn_display_name: firstPlayer.display_name,
        cards_in_deck: finalDeck.length,
        ek_count: ekCount,
      },
      turn_number: 1,
    },
  });

  const cardHands = await tx.cardHand.findMany({
    where: { session_id: session.session_id },
  });

  return { session, cardHands };
}

export async function startGame(
  roomId: string,
  playerToken: string,
): Promise<StartGameResult> {
  return await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { room_id: roomId },
      include: { deck_config: true },
    });

    if (!room) throw new NotFoundError("Room");
    if (room.host_token !== playerToken)
      throw new ForbiddenError("Only the host can start the game");
    if (room.status !== RoomStatus.WAITING)
      throw new BadRequestError("Game already started");

    const players = await tx.player.findMany({
      where: { room_id: roomId, role: PlayerRole.PLAYER },
      orderBy: { seat_number: "asc" },
    });

    if (players.length < 2)
      throw new BadRequestError("Need at least 2 players to start");

    const cardVersion: string = room.deck_config?.card_version ?? "classic";
    const expansions: string[] = Array.isArray(room.deck_config?.expansions)
      ? (room.deck_config!.expansions as string[])
      : [];

    const { baseDeck, totalDF } = await buildBaseDeck(tx, cardVersion, expansions);

    const dfCode = cardVersion === "good_and_evil" ? CardCode.GVE_DEFUSE : CardCode.DEFUSE;
    const ekCode = cardVersion === "good_and_evil" ? CardCode.GVE_EXPLODING_KITTEN : CardCode.EXPLODING_KITTEN;

    const { remainingDeck, hands } = dealCards(baseDeck, players, dfCode);

    const finalDeck = finalizeDeck(remainingDeck, players.length, totalDF, dfCode, ekCode, expansions);

    let orderedPlayers = [...players];
    if (room.last_winner_token) {
      const winnerIndex = players.findIndex((p) => p.player_token === room.last_winner_token);
      if (winnerIndex > 0) {
        orderedPlayers = [...players.slice(winnerIndex), ...players.slice(0, winnerIndex)];
      }
    }

    const { session, cardHands } = await createGameSession(
      tx, roomId, orderedPlayers, finalDeck, hands, playerToken
    );

    const updatedRoom = await tx.room.update({
      where: { room_id: roomId },
      data: { status: RoomStatus.PLAYING },
      include: { players: true, deck_config: true },
    });

    const deckState = await tx.deckState.findUnique({
      where: { session_id: session.session_id },
    });

    return { room: updatedRoom, session, deckState, cardHands };
  });
}

export async function handleImplodingKitten(
  tx: Prisma.TransactionClient,
  session: GameSession,
  player: Player,
  roomId: string,
  drawnCard: string,
): Promise<TurnAdvancedResult | GameOverResult | ExplodingKittenDrawnResult> {
  const ikResult = await handleDrawIK(session.session_id);

  if (ikResult.playerEliminated) {
    // IK face-up: log the draw, then let frontend show popup before eliminating
    // (eliminatePlayer socket will handle actual elimination + checkWinnerOrAdvance)
    await tx.gameLog.create({
      data: {
        session_id: session.session_id,
        player_id: player.player_id,
        player_display_name: player.display_name,
        action_type: ActionType.DREW_EXPLODING_KITTEN,
        action_details: { card: drawnCard, reason: EliminationReason.IMPLODING_KITTEN },
        turn_number: session.turn_number,
      },
    });
    return {
      success: true,
      action: ActionType.DREW_EXPLODING_KITTEN,
      drawnCard,
      hasDefuse: false,
      isIKFaceUp: true,
    };
  }

  // IK face-down: player must choose where to place it back
  return {
    success: true,
    action: ActionType.DREW_EXPLODING_KITTEN,
    drawnCard,
    hasDefuse: true,
    isIKFaceUp: false,
  };
}

export async function handleExplodingKitten(
  tx: Prisma.TransactionClient,
  session: GameSession,
  player: Player,
  room: RoomWithDeckConfig,
  drawnCard: string,
): Promise<ExplodingKittenDrawnResult> {
  const hand = await tx.cardHand.findUnique({
    where: { player_id_session_id: { player_id: player.player_id, session_id: session.session_id } },
  });
  const cards = (hand?.cards ?? []) as string[];
  const dfCode = room.deck_config?.card_version === "good_and_evil" ? CardCode.GVE_DEFUSE : CardCode.DEFUSE;
  const hasDefuse = cards.includes(dfCode);

  return {
    success: true,
    action: ActionType.DREW_EXPLODING_KITTEN,
    drawnCard,
    hasDefuse,
  };
}

export async function drawCard(
  roomId: string,
  playerToken: string,
  isAutoDrawn = false,
): Promise<TurnAdvancedResult | GameOverResult | ExplodingKittenDrawnResult> {
  return await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { room_id: roomId },
      include: { deck_config: true },
    });
    if (!room) throw new NotFoundError("Room");
    if (room.status !== RoomStatus.PLAYING) throw new BadRequestError("Game is not active");

    const session = await tx.gameSession.findFirst({
      where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS },
    });
    if (!session) throw new NotFoundError("No active session");

    const player = await tx.player.findFirst({
      where: { room_id: roomId, player_token: playerToken },
    });
    if (!player) throw new NotFoundError("Player");
    if (session.current_turn_player_id !== player.player_id) throw new BadRequestError("It's not your turn");

    // Block drawing while a pending action (Nope window / Favor) is active
    if (session.pending_action && !isAutoDrawn) {
      throw new BadRequestError("Cannot draw card while an action is pending (Nope window is open)");
    }

    if (isAutoDrawn) {
      const afkResult = await handleAFK(tx, session, player, roomId);
      if (afkResult) return afkResult;
    } else if (player.afk_count > 0) {
      await tx.player.update({
        where: { player_id: player.player_id },
        data: { afk_count: 0 },
      });
    }

    const deckState = await tx.deckState.findUnique({
      where: { session_id: session.session_id },
    });
    if (!deckState) throw new NotFoundError("Deck state");

    const deck = deckState.deck_order as string[];
    if (deck.length === 0) throw new BadRequestError("Deck is empty");

    const drawnCard = deck[deck.length - 1]!;
    const newDeck = deck.slice(0, deck.length - 1);

    await tx.deckState.update({
      where: { session_id: session.session_id },
      data: { deck_order: newDeck, cards_remaining: newDeck.length },
    });

    const isEK = drawnCard === CardCode.EXPLODING_KITTEN || drawnCard === CardCode.GVE_EXPLODING_KITTEN;
    const isIK = drawnCard === CardCode.IMPLODING_KITTEN;

    if (isEK || isIK) {
      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: player.player_id,
          player_display_name: player.display_name,
          action_type: ActionType.DREW_EXPLODING_KITTEN,
          action_details: { card: drawnCard },
          turn_number: session.turn_number,
        },
      });

      if (isIK) {
        const res = await handleImplodingKitten(tx, session, player, roomId, drawnCard);
        return { ...res, deck_count: newDeck.length };
      }

      const res = await handleExplodingKitten(tx, session, player, room, drawnCard);
      return { ...res, deck_count: newDeck.length };
    }

    const hand = await tx.cardHand.findUnique({
      where: { player_id_session_id: { player_id: player.player_id, session_id: session.session_id } },
    });
    const currentCards = (hand?.cards ?? []) as string[];
    const newCards = [...currentCards, drawnCard];

    await tx.cardHand.update({
      where: { player_id_session_id: { player_id: player.player_id, session_id: session.session_id } },
      data: { cards: newCards, card_count: newCards.length },
    });

    await tx.gameLog.create({
      data: {
        session_id: session.session_id,
        player_id: player.player_id,
        player_display_name: player.display_name,
        action_type: ActionType.DREW_CARD,
        action_details: { card: drawnCard, auto_drawn: isAutoDrawn },
        turn_number: session.turn_number,
      },
    });

    const turnResult = await resolveDrawCompletion(tx, session, roomId, player);

    // คำนวณ ikOnTop: query ik_face_up นอก tx เพื่อให้เห็นค่าล่าสุดจาก insertIKBack
    // newDeck คือ deck หลังจั่วออกแล้ว (ถูกต้องแล้ว)
    const ikFaceUpState = await prisma.deckState.findUnique({
      where: { session_id: session.session_id },
      select: { ik_face_up: true },
    });
    const ikOnTop = (ikFaceUpState?.ik_face_up === true)
      && newDeck.length > 0
      && newDeck[newDeck.length - 1] === "IK";

    return {
      ...turnResult,
      drawnCard,
      player_id: player.player_id,
      drawnByDisplayName: player.display_name,
      hand: { cards: newCards },
      deck_count: newDeck.length,
      isAutoDraw: isAutoDrawn,
      ikOnTop,
    };
  });
}

export async function resolveDrawFromBottom(
  tx: Prisma.TransactionClient,
  session: GameSession,
  player: Player,
  roomId: string,
) {
  const deckState = await tx.deckState.findUnique({
    where: { session_id: session.session_id },
  });
  if (!deckState) throw new NotFoundError("Deck state");

  const deck = deckState.deck_order as string[];
  if (deck.length === 0) throw new BadRequestError("Deck is empty");

  const drawnCard = deck[0]!;
  const newDeck = deck.slice(1);

  await tx.deckState.update({
    where: { session_id: session.session_id },
    data: { deck_order: newDeck, cards_remaining: newDeck.length },
  });

  await tx.gameLog.create({
    data: {
      session_id: session.session_id,
      player_id: player.player_id,
      player_display_name: player.display_name,
      action_type: ActionType.DREW_CARD,
      action_details: { card: drawnCard, source: "bottom" },
      turn_number: session.turn_number,
    },
  });

  const isEK = drawnCard === CardCode.EXPLODING_KITTEN || drawnCard === CardCode.GVE_EXPLODING_KITTEN;
  const isIK = drawnCard === CardCode.IMPLODING_KITTEN;

  if (isEK || isIK) {
    await tx.gameLog.create({
      data: {
        session_id: session.session_id,
        player_id: player.player_id,
        player_display_name: player.display_name,
        action_type: ActionType.DREW_EXPLODING_KITTEN,
        action_details: { card: drawnCard, source: "bottom" },
        turn_number: session.turn_number,
      },
    });

    if (isIK) {
      const res = await handleImplodingKitten(tx, session, player, roomId, drawnCard);
      return { ...res, drawnCard, source: "bottom", deck_count: newDeck.length };
    }

    const room = await tx.room.findUnique({ where: { room_id: roomId }, include: { deck_config: true } });
    if (!room) throw new NotFoundError("Room");
    const res = await handleExplodingKitten(tx, session, player, room, drawnCard);
    return { ...res, drawnCard, source: "bottom", deck_count: newDeck.length };
  }

  const hand = await tx.cardHand.findUnique({
    where: { player_id_session_id: { player_id: player.player_id, session_id: session.session_id } },
  });
  const currentCards = (hand?.cards ?? []) as string[];
  const newCards = [...currentCards, drawnCard];

  await tx.cardHand.update({
    where: { player_id_session_id: { player_id: player.player_id, session_id: session.session_id } },
    data: { cards: newCards, card_count: newCards.length },
  });

  const turnResult = await resolveDrawCompletion(tx, session, roomId, player);

  return {
    ...turnResult,
    drawnCard,
    source: "bottom",
    player_id: player.player_id,
    drawnByDisplayName: player.display_name,
    hand: { cards: newCards },
    deck_count: newDeck.length,
  };
}

export async function defuseCard(
  roomId: string,
  playerToken: string,
): Promise<{ success: true; action: ActionType.WAITING_FOR_INSERT }> {
  return await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { room_id: roomId },
      include: { deck_config: true },
    });
    if (!room) throw new NotFoundError("Room");
    if (room.status !== RoomStatus.PLAYING) throw new BadRequestError("Game is not active");

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

    const lastLog = await tx.gameLog.findFirst({
      where: { session_id: session.session_id, player_id: player.player_id },
      orderBy: { timestamp: "desc" },
    });
    if (lastLog?.action_type !== ActionType.DREW_EXPLODING_KITTEN) {
      throw new BadRequestError("No Exploding Kitten to defuse");
    }

    const ekCard = (lastLog.action_details as { card?: string, ek_card?: string }).card || (lastLog.action_details as any).ek_card;

    if (ekCard === CardCode.IMPLODING_KITTEN) {
      throw new BadRequestError("Imploding Kitten cannot be defused");
    }

    const dfCode = room.deck_config?.card_version === "good_and_evil" ? CardCode.GVE_DEFUSE : CardCode.DEFUSE;

    const hand = await tx.cardHand.findUnique({
      where: { player_id_session_id: { player_id: player.player_id, session_id: session.session_id } },
    });
    const cards = (hand?.cards ?? []) as string[];
    if (!cards.includes(dfCode)) throw new BadRequestError("No Defuse card in hand");

    let removed = false;
    const newCards = cards.filter((c) => {
      if (c === dfCode && !removed) { removed = true; return false; }
      return true;
    });

    await tx.cardHand.update({
      where: { player_id_session_id: { player_id: player.player_id, session_id: session.session_id } },
      data: { cards: newCards, card_count: newCards.length },
    });

    await tx.gameLog.create({
      data: {
        session_id: session.session_id,
        player_id: player.player_id,
        player_display_name: player.display_name,
        action_type: ActionType.DEFUSED,
        action_details: { ek_card: ekCard },
        turn_number: session.turn_number,
      },
    });

    return { success: true as const, action: ActionType.WAITING_FOR_INSERT as const };
  });
}

export async function insertEK(
  roomId: string,
  playerToken: string,
  position: number,
): Promise<TurnAdvancedResult & { deck_count: number }> {
  return await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { room_id: roomId },
      include: { deck_config: true },
    });
    if (!room) throw new NotFoundError("Room");
    if (room.status !== RoomStatus.PLAYING) throw new BadRequestError("Game is not active");

    const session = await tx.gameSession.findFirst({
      where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS },
    });
    if (!session) throw new NotFoundError("No active session");

    const player = await tx.player.findFirst({
      where: { room_id: roomId, player_token: playerToken },
    });
    if (!player) throw new NotFoundError("Player");
    if (session.current_turn_player_id !== player.player_id) throw new BadRequestError("It's not your turn");

    const lastLog = await tx.gameLog.findFirst({
      where: { session_id: session.session_id, player_id: player.player_id },
      orderBy: { timestamp: "desc" },
    });
    if (lastLog?.action_type !== ActionType.DEFUSED) throw new BadRequestError("No pending EK insertion");

    const ekCard = (lastLog.action_details as { ek_card: string }).ek_card;

    const deckState = await tx.deckState.findUnique({
      where: { session_id: session.session_id },
    });
    const deck = deckState!.deck_order as string[];

    const insertIndex = Math.max(0, Math.min(deck.length - position, deck.length));
    const deckWithEK = [...deck];
    deckWithEK.splice(insertIndex, 0, ekCard);

    await tx.deckState.update({
      where: { session_id: session.session_id },
      data: { deck_order: deckWithEK, cards_remaining: deckWithEK.length },
    });

    await tx.gameLog.create({
      data: {
        session_id: session.session_id,
        player_id: player.player_id,
        player_display_name: player.display_name,
        action_type: ActionType.EK_INSERTED,
        action_details: { ek_card: ekCard, insert_at: insertIndex },
        turn_number: session.turn_number,
      },
    });

    const turnResult = await resolveDrawCompletion(tx, session, roomId, player);
    return { ...turnResult, deck_count: deckWithEK.length };
  });
}

// ── Place IK Back (FR-07-IK2) ──────────────────────────────────────────────
// หลังจากผู้เล่นจั่วได้ IK face-down → เลือกตำแหน่งใส่กลับ + advance turn
export async function placeIKBack(
  roomId: string,
  playerToken: string,
  position: number,
): Promise<TurnAdvancedResult & { ikOnTop: boolean; deck_count: number }> {
  return await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { room_id: roomId },
      include: { deck_config: true },
    });
    if (!room) throw new NotFoundError("Room");
    if (room.status !== RoomStatus.PLAYING) throw new BadRequestError("Game is not active");

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

    // Validate: last action must be DREW_EXPLODING_KITTEN with IK card
    const lastLog = await tx.gameLog.findFirst({
      where: { session_id: session.session_id, player_id: player.player_id },
      orderBy: { timestamp: "desc" },
    });
    if (lastLog?.action_type !== ActionType.DREW_EXPLODING_KITTEN) {
      throw new BadRequestError("No pending Imploding Kitten placement");
    }
    const drawnCard = (lastLog.action_details as { card?: string }).card;
    if (drawnCard !== CardCode.IMPLODING_KITTEN) {
      throw new BadRequestError("Last drawn card was not an Imploding Kitten");
    }

    // Insert IK back into deck at chosen position + flip to face-up
    await insertIKBack(tx, session.session_id, position);

    // Log the placement
    await tx.gameLog.create({
      data: {
        session_id: session.session_id,
        player_id: player.player_id,
        player_display_name: player.display_name,
        action_type: ActionType.IK_INSERTED,
        action_details: { ik_card: CardCode.IMPLODING_KITTEN, insert_position: position },
        turn_number: session.turn_number,
      },
    });

    // Read updated deckState after insertIKBack completes (within the same transaction)
    const deckState = await tx.deckState.findUnique({
      where: { session_id: session.session_id },
    });
    const deck = (deckState?.deck_order as string[]) ?? [];
    const deck_count = deck.length;

    // คำนวณ ikOnTop โดยตรงจาก deck ที่ได้มา (top card = deck[deck.length - 1])
    const ikOnTop = (deckState?.ik_face_up === true) && deck[deck.length - 1] === "IK";

    // Advance turn
    const turnResult = await resolveDrawCompletion(tx, session, roomId, player);

    return { ...turnResult, ikOnTop, deck_count };
  });
}

export async function commitAlterTheFuture(
  roomId: string,
  playerToken: string,
  newOrder: string[],
): Promise<{ success: boolean; action: string }> {
  return await prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.findFirst({
      where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS },
    });
    if (!session) throw new NotFoundError("No active session");

    const player = await tx.player.findFirst({
      where: { room_id: roomId, player_token: playerToken, is_alive: true },
    });
    if (!player) throw new NotFoundError("Player");
    if (session.current_turn_player_id !== player.player_id) {
      throw new BadRequestError("It's not your turn");
    }

    const deckState = await tx.deckState.findUnique({
      where: { session_id: session.session_id },
    });
    if (!deckState) throw new NotFoundError("Deck state");

    const deck = deckState.deck_order as string[];
    const n = Math.min(3, deck.length);

    if (newOrder.length !== n) throw new BadRequestError(`newOrder must have exactly ${n} cards`);

    const currentTop = deck.slice(-n);
    const sortedCurrent = [...currentTop].sort();
    const sortedNew = [...newOrder].sort();
    if (!sortedCurrent.every((c, i) => c === sortedNew[i])) {
      throw new BadRequestError("newOrder must be a permutation of the current top cards");
    }

    const newTopSection = [...newOrder].reverse();
    const newDeck = [...deck.slice(0, deck.length - n), ...newTopSection];

    await tx.deckState.update({
      where: { session_id: session.session_id },
      data: { deck_order: newDeck },
    });

    await tx.gameLog.create({
      data: {
        session_id: session.session_id,
        player_id: player.player_id,
        player_display_name: player.display_name,
        action_type: ActionType.PLAY_CARD,
        action_details: { card: CardCode.ALTER_THE_FUTURE, altered: true },
        turn_number: session.turn_number,
      },
    });

    return { success: true, action: "ALTER_THE_FUTURE_COMMITTED" };
  });
}

export async function eliminatePlayer(
  roomId: string,
  playerToken: string,
): Promise<TurnAdvancedResult | GameOverResult> {
  return await prisma.$transaction(async (tx) => {
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

    const lastLog = await tx.gameLog.findFirst({
      where: { session_id: session.session_id, player_id: player.player_id },
      orderBy: { timestamp: "desc" },
    });
    if (lastLog?.action_type !== ActionType.DREW_EXPLODING_KITTEN) {
      throw new BadRequestError("No pending Exploding Kitten");
    }

    const ekCard = (lastLog.action_details as { card?: string, ek_card?: string }).card || (lastLog.action_details as any).ek_card;

    await tx.player.update({
      where: { player_id: player.player_id },
      data: { is_alive: false },
    });

    await tx.gameLog.create({
      data: {
        session_id: session.session_id,
        player_id: player.player_id,
        player_display_name: player.display_name,
        action_type: ActionType.PLAYER_ELIMINATED,
        action_details: { card: ekCard, reason: EliminationReason.TIMEOUT_NO_DEFUSE },
        turn_number: session.turn_number,
      },
    });

    // Reset pending_attacks to 0 before advancing — dead players do NOT pass Attack chains forward
    await tx.gameSession.update({
      where: { session_id: session.session_id },
      data: { pending_attacks: 0 },
    });
    const sessionForAdvance = { ...session, pending_attacks: 0 };

    const result = await checkWinnerOrAdvance(tx, sessionForAdvance, roomId, player.player_id, ekCard);

    // query ikOnTop after eliminate: IK was drawn out, so should be false in most cases
    const deckStateAfter = await prisma.deckState.findUnique({
      where: { session_id: session.session_id },
      select: { deck_order: true, ik_face_up: true },
    });
    const deckAfter = (deckStateAfter?.deck_order ?? []) as string[];
    const ikOnTop = (deckStateAfter?.ik_face_up === true) && deckAfter.length > 0 && deckAfter[deckAfter.length - 1] === "IK";

    return { ...result, ikOnTop };
  });
}

export async function getReconnectionState(roomId: string, playerToken: string) {
  const session = await prisma.gameSession.findFirst({
    where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS },
  });
  if (!session) return null;

  const cardHands = await prisma.cardHand.findMany({
    where: { session_id: session.session_id },
  });

  const deckState = await prisma.deckState.findUnique({
    where: { session_id: session.session_id },
  });

  return { session, cardHands, deckState };
}