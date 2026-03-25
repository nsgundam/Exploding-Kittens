import { CardCode, ActionType, GAME_CONFIG } from "../constants/game";
import { applyCardEffect } from "./effects/index";
import { prisma } from "../config/prisma";
import {
  Prisma,
  RoomStatus,
  PlayerRole,
  GameSessionStatus,
  GameSession,
  Player,
  DeckConfig,
  CardHand,
} from "@prisma/client";
import {
  StartGameResult,
  TurnAdvancedResult,
  GameOverResult,
  ExplodingKittenDrawnResult,
  PlayCardResult,
  CardEffectResult,
  RoomWithDeckConfig,
  PlayerHandsMap,
  FavorPendingResult,
  FavorResponseResult,
  ComboResult,
} from "../types/types";
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from "../utils/errors";

// ── Utility Helpers ────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// ── Cat Combo Helpers ──────────────────────────────────────────

const CAT_CODES = new Set([
  "CAT_TACO", "CAT_MELON", "CAT_BEARD", "CAT_RAINBOW", "CAT_POTATO",
  "FC", "GVE_FC", "MC", "GVE_MC",
]);

function isCatCard(code: string): boolean {
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

// ── Deck Building (Decomposed from startGame) ──────────────────

/**
 * Build the initial deck from CardMaster based on card version and expansions.
 * Returns the base deck (without EK, DF, IK which are handled separately).
 */
async function buildBaseDeck(
  tx: Prisma.TransactionClient,
  cardVersion: string,
  expansions: string[],
): Promise<{
  baseDeck: string[];
  totalDF: number;
  cardMasters: Awaited<ReturnType<typeof tx.cardMaster.findMany>>;
}> {
  const basePackFilter =
    cardVersion === "good_and_evil"
      ? { expansion_pack: "good_and_evil" }
      : { expansion_pack: null };

  const cardMasters = await tx.cardMaster.findMany({
    where: {
      OR: [
        basePackFilter,
        ...(expansions.length > 0
          ? [{ expansion_pack: { in: expansions } }]
          : []),
      ],
    },
  });

  const totalDF =
    cardMasters.find((c) => c.card_code === CardCode.DEFUSE || c.card_code === CardCode.GVE_DEFUSE)
      ?.quantity_in_deck ?? 6;

  const baseDeck: string[] = [];

  for (const card of cardMasters) {
    const isEK = card.card_code === CardCode.EXPLODING_KITTEN || card.card_code === CardCode.GVE_EXPLODING_KITTEN;
    const isDF = card.card_code === CardCode.DEFUSE || card.card_code === CardCode.GVE_DEFUSE;
    const isIK = card.card_code === CardCode.IMPLODING_KITTEN;

    if (isEK || isDF || isIK) continue;

    for (let i = 0; i < card.quantity_in_deck; i++) {
      baseDeck.push(card.card_code);
    }
  }

  return { baseDeck: shuffleArray(baseDeck), totalDF, cardMasters };
}

/**
 * Deal cards to players: 1 Defuse + 4 random cards each.
 * Returns the remaining deck and the player hands map.
 */
function dealCards(
  baseDeck: string[],
  players: Player[],
  dfCode: string,
  cardsPerHand = 4,
): { remainingDeck: string[]; hands: PlayerHandsMap } {
  const deck = [...baseDeck];
  const hands: PlayerHandsMap = {};

  for (const p of players) {
    hands[p.player_id] = [dfCode];
    for (let i = 0; i < cardsPerHand; i++) {
      const card = deck.pop();
      if (!card) throw new BadRequestError("Not enough cards in deck to deal");
      hands[p.player_id]!.push(card);
    }
  }

  return { remainingDeck: deck, hands };
}

/**
 * Finalize the deck by inserting remaining Defuse cards, EK cards, and IK.
 */
function finalizeDeck(
  remainingDeck: string[],
  playerCount: number,
  totalDF: number,
  dfCode: string,
  ekCode: string,
  expansions: string[],
): string[] {
  const deck = [...remainingDeck];

  // Remaining Defuse cards go back into the deck
  const dfRemaining = totalDF - playerCount;
  for (let i = 0; i < dfRemaining; i++) {
    deck.push(dfCode);
  }

  // EK count = players - 1
  const ekCount = playerCount - 1;
  for (let i = 0; i < ekCount; i++) {
    deck.push(ekCode);
  }

  // Imploding Kitten if expansion is active (FR-07-IK1)
  if (expansions.includes("imploding_kittens")) {
    deck.push(CardCode.IMPLODING_KITTEN);
  }

  return shuffleArray(deck);
}

/**
 * Create GameSession, DeckState, CardHands, and GameLog in a single transaction step.
 */
async function createGameSession(
  tx: Prisma.TransactionClient,
  roomId: string,
  players: Player[],
  finalDeck: string[],
  hands: PlayerHandsMap,
  hostPlayerToken: string,
): Promise<{ session: GameSession; cardHands: CardHand[] }> {
  const firstPlayer = players[0];
  if (!firstPlayer)
    throw new BadRequestError("No players available to start game");

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

  const hostPlayer =
    players.find((p) => p.player_token === hostPlayerToken) ?? players[0];
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


/**
 * Handle Attack card: end turn without drawing, next player gets +2 turns.
 */
export const gameService = {
  //Start a game: validate, build deck, deal cards, create session.
  async startGame(
    roomId: string,
    playerToken: string,
  ): Promise<StartGameResult> {
    return await prisma.$transaction(async (tx) => {
      // 1. Validate room and host permissions
      const room = await tx.room.findUnique({
        where: { room_id: roomId },
        include: { deck_config: true },
      });

      if (!room) throw new NotFoundError("Room");
      if (room.host_token !== playerToken)
        throw new ForbiddenError("Only the host can start the game");
      if (room.status !== RoomStatus.WAITING)
        throw new BadRequestError("Game already started");

      // 2. Get seated players ordered by seat number
      const players = await tx.player.findMany({
        where: { room_id: roomId, role: PlayerRole.PLAYER },
        orderBy: { seat_number: "asc" },
      });

      if (players.length < 2)
        throw new BadRequestError("Need at least 2 players to start");

      // 3. Build deck from CardMaster
      const cardVersion: string = room.deck_config?.card_version ?? "classic";
      const expansions: string[] = Array.isArray(room.deck_config?.expansions)
        ? (room.deck_config!.expansions as string[])
        : [];

      const { baseDeck, totalDF } = await buildBaseDeck(
        tx,
        cardVersion,
        expansions,
      );

      // 4. Determine version-specific codes
      const dfCode = cardVersion === "good_and_evil" ? CardCode.GVE_DEFUSE : CardCode.DEFUSE;
      const ekCode = cardVersion === "good_and_evil" ? CardCode.GVE_EXPLODING_KITTEN : CardCode.EXPLODING_KITTEN;

      // 5. Deal cards to players
      const { remainingDeck, hands } = dealCards(baseDeck, players, dfCode);

      // 6. Finalize deck with EK, remaining DF, and IK
      const finalDeck = finalizeDeck(
        remainingDeck,
        players.length,
        totalDF,
        dfCode,
        ekCode,
        expansions,
      );

      // 7. Create game session, deck state, card hands, and game log
      const { session, cardHands } = await createGameSession(
        tx,
        roomId,
        players,
        finalDeck,
        hands,
        playerToken,
      );

      // 8. Update room status to PLAYING
      const updatedRoom = await tx.room.update({
        where: { room_id: roomId },
        data: { status: RoomStatus.PLAYING },
        include: { players: true, deck_config: true },
      });

      // 9. Fetch deck state for response
      const deckState = await tx.deckState.findUnique({
        where: { session_id: session.session_id },
      });

      return { room: updatedRoom, session, deckState, cardHands };
    });
  },

  //Draw a card from the top of the deck.
  async drawCard(
    roomId: string,
    playerToken: string,
    isAutoDrawn = false,
  ): Promise<TurnAdvancedResult | GameOverResult | ExplodingKittenDrawnResult> {
    return await prisma.$transaction(async (tx) => {
      // 1. Validate room and session
      const room = await tx.room.findUnique({
        where: { room_id: roomId },
        include: { deck_config: true },
      });
      if (!room) throw new NotFoundError("Room");
      if (room.status !== RoomStatus.PLAYING)
        throw new BadRequestError("Game is not active");

      const session = await tx.gameSession.findFirst({
        where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS },
      });
      if (!session) throw new NotFoundError("No active session");

      // 2. Validate turn
      const player = await tx.player.findFirst({
        where: { room_id: roomId, player_token: playerToken },
      });
      if (!player) throw new NotFoundError("Player");
      if (session.current_turn_player_id !== player.player_id) {
        throw new BadRequestError("It's not your turn");
      }

      // 3. AFK tracking
      if (isAutoDrawn) {
        const afkResult = await gameService.handleAFK(
          tx,
          session,
          player,
          roomId,
        );
        if (afkResult) return afkResult;
      } else if (player.afk_count > 0) {
        await tx.player.update({
          where: { player_id: player.player_id },
          data: { afk_count: 0 },
        });
      }

      // 4. Get deck state
      const deckState = await tx.deckState.findUnique({
        where: { session_id: session.session_id },
      });
      if (!deckState) throw new NotFoundError("Deck state");

      const deck = deckState.deck_order as string[];
      if (deck.length === 0) throw new BadRequestError("Deck is empty");

      // 5. Draw top card
      const drawnCard = deck[deck.length - 1]!;
      const newDeck = deck.slice(0, deck.length - 1);

      await tx.deckState.update({
        where: { session_id: session.session_id },
        data: { deck_order: newDeck, cards_remaining: newDeck.length },
      });

      // 6. Check for EK or IK
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
          const res = await gameService.handleImplodingKitten(
            tx,
            session,
            player,
            roomId,
            drawnCard,
          );
          return { ...res, deck_count: newDeck.length };
        }

        if (isEK) {
          const res = await gameService.handleExplodingKitten(
            tx,
            session,
            player,
            room,
            drawnCard,
          );
          return { ...res, deck_count: newDeck.length };
        }
      }

      // 7. Normal card → add to hand
      const hand = await tx.cardHand.findUnique({
        where: {
          player_id_session_id: {
            player_id: player.player_id,
            session_id: session.session_id,
          },
        },
      });
      const currentCards = (hand?.cards ?? []) as string[];
      const newCards = [...currentCards, drawnCard];

      await tx.cardHand.update({
        where: {
          player_id_session_id: {
            player_id: player.player_id,
            session_id: session.session_id,
          },
        },
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

      // 8. Advance turn
      const turnResult = await gameService.advanceTurn(
        tx,
        session,
        roomId,
        player.player_id,
      );
      return {
        ...turnResult,
        drawnCard,
        player_id: player.player_id,
        drawnByDisplayName: player.display_name,
        hand: { cards: newCards },
        deck_count: newDeck.length,
        isAutoDraw: isAutoDrawn,
      };
    });
  },

  /**
   * Use Defuse card after drawing EK.
   * FR-04-7/9, S2-08/23
   */
  async defuseCard(
    roomId: string,
    playerToken: string,
  ): Promise<{ success: true; action: ActionType.WAITING_FOR_INSERT }> {
    return await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { room_id: roomId },
        include: { deck_config: true },
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

      // Verify last action was drawing EK
      const lastLog = await tx.gameLog.findFirst({
        where: { session_id: session.session_id, player_id: player.player_id },
        orderBy: { timestamp: "desc" },
      });
      if (lastLog?.action_type !== ActionType.DREW_EXPLODING_KITTEN) {
        throw new BadRequestError("No Exploding Kitten to defuse");
      }

      const ekCard = (lastLog.action_details as { card: string }).card;
      const dfCode =
        room.deck_config?.card_version === "good_and_evil" ? CardCode.GVE_DEFUSE : CardCode.DEFUSE;

      // Remove Defuse from hand
      const hand = await tx.cardHand.findUnique({
        where: {
          player_id_session_id: {
            player_id: player.player_id,
            session_id: session.session_id,
          },
        },
      });
      const cards = (hand?.cards ?? []) as string[];
      if (!cards.includes(dfCode))
        throw new BadRequestError("No Defuse card in hand");

      let removed = false;
      const newCards = cards.filter((c) => {
        if (c === dfCode && !removed) {
          removed = true;
          return false;
        }
        return true;
      });

      await tx.cardHand.update({
        where: {
          player_id_session_id: {
            player_id: player.player_id,
            session_id: session.session_id,
          },
        },
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
  },

  async insertEK(
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
      if (session.current_turn_player_id !== player.player_id)
        throw new BadRequestError("It's not your turn");

      // Validate last action was DEFUSED (waiting for insert position)
      const lastLog = await tx.gameLog.findFirst({
        where: { session_id: session.session_id, player_id: player.player_id },
        orderBy: { timestamp: "desc" },
      });
      if (lastLog?.action_type !== ActionType.DEFUSED)
        throw new BadRequestError("No pending EK insertion");

      const ekCard = (lastLog.action_details as { ek_card: string }).ek_card;

      const deckState = await tx.deckState.findUnique({
        where: { session_id: session.session_id },
      });
      const deck = deckState!.deck_order as string[];

      let insertIndex = deck.length - position;
      insertIndex = Math.max(0, Math.min(insertIndex, deck.length));

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

      const turnResult = await gameService.advanceTurn(
        tx,
        session,
        roomId,
        player.player_id,
      );
      return { ...turnResult, deck_count: deckWithEK.length };
    });
  },

  /**
   * Eliminate a player (timer expired, no Defuse).
   * FR-04-7/8, S2-25
   */
  async eliminatePlayer(
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

      // Verify pending EK
      const lastLog = await tx.gameLog.findFirst({
        where: { session_id: session.session_id, player_id: player.player_id },
        orderBy: { timestamp: "desc" },
      });
      if (lastLog?.action_type !== ActionType.DREW_EXPLODING_KITTEN) {
        throw new BadRequestError("No pending Exploding Kitten");
      }

      const ekCard = (lastLog.action_details as { card: string }).card;

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
          action_details: { card: ekCard, reason: "no_defuse_or_timeout" },
          turn_number: session.turn_number,
        },
      });

      return await gameService.checkWinner(
        tx,
        session,
        roomId,
        player.player_id,
        ekCard,
      );
    });
  },

  /**
   * Play a card from hand.
   * Sprint 2 scope: AT, SK, SF, SH
   * FR-05, S2-13/14/15/16/17/18
   */
  async playCard(
    roomId: string,
    playerToken: string,
    cardCode: string,
    targetPlayerToken?: string,
  ): Promise<PlayCardResult> {
    return await prisma.$transaction(async (tx) => {
      // 1. Validate room and session
      const room = await tx.room.findUnique({
        where: { room_id: roomId },
        include: { deck_config: true },
      });
      if (!room) throw new NotFoundError("Room");
      if (room.status !== RoomStatus.PLAYING)
        throw new BadRequestError("Game is not active");

      const session = await tx.gameSession.findFirst({
        where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS },
      });
      if (!session) throw new NotFoundError("No active session");

      // 2. Validate player and turn (NFR-02)
      const player = await tx.player.findFirst({
        where: { room_id: roomId, player_token: playerToken },
      });
      if (!player) throw new NotFoundError("Player");
      if (session.current_turn_player_id !== player.player_id) {
        throw new BadRequestError("It's not your turn");
      }

      // Reset AFK count on manual play
      if (player.afk_count > 0) {
        await tx.player.update({
          where: { player_id: player.player_id },
          data: { afk_count: 0 },
        });
      }

      // 3. Validate card is in hand
      const hand = await tx.cardHand.findUnique({
        where: {
          player_id_session_id: {
            player_id: player.player_id,
            session_id: session.session_id,
          },
        },
      });
      const cards = (hand?.cards ?? []) as string[];
      if (!cards.includes(cardCode)) {
        throw new BadRequestError("Card not in hand");
      }

      // 4. Remove card from hand
      let removed = false;
      const newCards = cards.filter((c) => {
        if (c === cardCode && !removed) {
          removed = true;
          return false;
        }
        return true;
      });

      await tx.cardHand.update({
        where: {
          player_id_session_id: {
            player_id: player.player_id,
            session_id: session.session_id,
          },
        },
        data: { cards: newCards, card_count: newCards.length },
      });

      // 5. Add to discard pile
      const deckState = await tx.deckState.findUnique({
        where: { session_id: session.session_id },
      });
      if (!deckState) throw new NotFoundError("Deck state");

      const discardPile = (deckState.discard_pile as string[]) ?? [];
      await tx.deckState.update({
        where: { session_id: session.session_id },
        data: { discard_pile: [...discardPile, cardCode] },
      });

      // 6. Handle card effect
      let effect: CardEffectResult | undefined;
      let turnResult: TurnAdvancedResult | undefined;

      // Normalize card code for GVE variants
      const normalizedCode = cardCode.replace(/^GVE_/, "");

      const effectData = await applyCardEffect(normalizedCode, {
        tx,
        session,
        roomId,
        currentPlayerId: player.player_id,
        targetPlayerToken,
        advanceTurn: gameService.advanceTurn,
      });
      effect = effectData.effect;
      turnResult = effectData.turnResult;

      // 7. Log the action
      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: player.player_id,
          player_display_name: player.display_name,
          action_type: ActionType.PLAY_CARD,
          action_details: {
            card: cardCode,
            target: targetPlayerToken ?? null,
            effect: effect?.type,
          },
          turn_number: session.turn_number,
        },
      });

      return {
        success: true,
        action: ActionType.CARD_PLAYED,
        cardCode,
        playedBy: player.player_id,
        playedByDisplayName: player.display_name,
        target: targetPlayerToken ?? null,
        effect,
        nextTurn: turnResult?.nextTurn,
      };
    });
  },

  /**
   * Cat Combo — 2-card (สุ่มขโมย) หรือ 3-card (ระบุการ์ดที่ต้องการ)
   */
  async comboCard(
    roomId: string,
    playerToken: string,
    comboCards: string[],
    targetPlayerToken: string,
    demandedCard?: string,
  ): Promise<ComboResult> {
    return await prisma.$transaction(async (tx) => {
      // 1. Validate session & turn
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

      // 2. Validate combo legality
      validateCombo(comboCards);
      const isThreeCard = comboCards.length === 3;

      // 3. Verify all combo cards are in hand
      const hand = await tx.cardHand.findUnique({
        where: {
          player_id_session_id: {
            player_id: player.player_id,
            session_id: session.session_id,
          },
        },
      });
      const remaining = [...((hand?.cards ?? []) as string[])];
      for (const cardCode of comboCards) {
        const idx = remaining.indexOf(cardCode);
        if (idx === -1) throw new BadRequestError(`Card ${cardCode} not in hand`);
        remaining.splice(idx, 1);
      }

      // 4. Validate target
      const target = await tx.player.findFirst({
        where: { room_id: roomId, player_token: targetPlayerToken, is_alive: true },
      });
      if (!target) throw new NotFoundError("Target player not found or eliminated");

      const targetHand = await tx.cardHand.findUnique({
        where: {
          player_id_session_id: {
            player_id: target.player_id,
            session_id: session.session_id,
          },
        },
      });
      const targetCards = [...((targetHand?.cards ?? []) as string[])];
      if (targetCards.length === 0)
        throw new BadRequestError("Target player has no cards");

      // 5. Remove combo cards from player hand → discard pile
      await tx.cardHand.update({
        where: {
          player_id_session_id: {
            player_id: player.player_id,
            session_id: session.session_id,
          },
        },
        data: { cards: remaining, card_count: remaining.length },
      });

      const deckState = await tx.deckState.findUnique({
        where: { session_id: session.session_id },
      });
      if (!deckState) throw new NotFoundError("Deck state");
      const discardPile = (deckState.discard_pile as string[]) ?? [];
      await tx.deckState.update({
        where: { session_id: session.session_id },
        data: { discard_pile: [...discardPile, ...comboCards] },
      });

      // 6. Resolve steal
      let stolenCard: string | undefined;
      let wasVoid = false;

      if (isThreeCard) {
        if (!demandedCard)
          throw new BadRequestError("3-card combo requires demandedCard");
        const demandIdx = targetCards.indexOf(demandedCard);
        if (demandIdx === -1) {
          wasVoid = true; // target ไม่มีการ์ดที่ต้องการ → โมฆะ
        } else {
          stolenCard = demandedCard;
          targetCards.splice(demandIdx, 1);
        }
      } else {
        // 2-card: สุ่ม ไม่รวม EK/DF
        const stealable = targetCards.filter(
          (c) =>
            c !== CardCode.EXPLODING_KITTEN &&
            c !== CardCode.GVE_EXPLODING_KITTEN &&
            c !== CardCode.DEFUSE &&
            c !== CardCode.GVE_DEFUSE,
        );
        const pool = stealable.length > 0 ? stealable : targetCards;
        const randomIdx = Math.floor(Math.random() * pool.length);
        stolenCard = pool[randomIdx]!;
        const realIdx = targetCards.indexOf(stolenCard);
        targetCards.splice(realIdx, 1);
      }

      // 7. Update hands
      if (stolenCard) {
        await tx.cardHand.update({
          where: {
            player_id_session_id: {
              player_id: target.player_id,
              session_id: session.session_id,
            },
          },
          data: { cards: targetCards, card_count: targetCards.length },
        });

        const newThiefCards = [...remaining, stolenCard];
        await tx.cardHand.update({
          where: {
            player_id_session_id: {
              player_id: player.player_id,
              session_id: session.session_id,
            },
          },
          data: { cards: newThiefCards, card_count: newThiefCards.length },
        });
      }

      // 8. Log
      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: player.player_id,
          player_display_name: player.display_name,
          action_type: ActionType.PLAY_CARD,
          action_details: {
            combo_type: isThreeCard ? "THREE_CARD" : "TWO_CARD",
            combo_cards: comboCards,
            target_player_id: target.player_id,
            demanded_card: demandedCard ?? null,
            stolen_card: stolenCard ?? null,
            was_void: wasVoid,
          },
          turn_number: session.turn_number,
        },
      });

      // 9. Advance turn
      const turnResult = await gameService.advanceTurn(
        tx,
        session,
        roomId,
        player.player_id,
      );

      return {
        ...turnResult,
        comboType: isThreeCard ? ("THREE_CARD" as const) : ("TWO_CARD" as const),
        stolenCard,
        wasVoid,
        robbedFromDisplayName: target.display_name,
        robbedFromPlayerId: target.player_id,
      };
    });
  },

  // ── Helper: Handle AFK ───────────────────────────────────────

  async handleAFK(
    tx: Prisma.TransactionClient,
    session: GameSession,
    player: Player,
    roomId: string,
  ): Promise<TurnAdvancedResult | GameOverResult | null> {
    const newAfkCount = player.afk_count + 1;
    await tx.player.update({
      where: { player_id: player.player_id },
      data: { afk_count: newAfkCount },
    });

    if (newAfkCount >= 2) {
      await tx.player.update({
        where: { player_id: player.player_id },
        data: { is_alive: false, role: PlayerRole.SPECTATOR },
      });
      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: player.player_id,
          player_display_name: player.display_name,
          action_type: ActionType.PLAYER_AFK_KICKED,
          action_details: { afk_count: newAfkCount },
          turn_number: session.turn_number,
        },
      });
      const kickResult = await gameService.checkWinner(
        tx,
        session,
        roomId,
        player.player_id,
        "AFK_TIMEOUT",
      );
      // Tag result so socket handler knows to emit playerEliminated
      return { ...kickResult, isAfkKick: true, afkPlayerId: player.player_id };
    }
    return null;
  },

  // ── Helper: Handle Imploding Kitten ──────────────────────────

  async handleImplodingKitten(
    tx: Prisma.TransactionClient,
    session: GameSession,
    player: Player,
    roomId: string,
    drawnCard: string,
  ): Promise<TurnAdvancedResult | GameOverResult> {
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
        action_details: { card: drawnCard, reason: "imploding_kitten" },
        turn_number: session.turn_number,
      },
    });
    return await gameService.checkWinner(
      tx,
      session,
      roomId,
      player.player_id,
      drawnCard,
    );
  },

  // ── Helper: Handle Exploding Kitten ──────────────────────────

  async handleExplodingKitten(
    tx: Prisma.TransactionClient,
    session: GameSession,
    player: Player,
    room: RoomWithDeckConfig,
    drawnCard: string,
  ): Promise<ExplodingKittenDrawnResult> {
    const hand = await tx.cardHand.findUnique({
      where: {
        player_id_session_id: {
          player_id: player.player_id,
          session_id: session.session_id,
        },
      },
    });
    const cards = (hand?.cards ?? []) as string[];
    const dfCode =
      room.deck_config?.card_version === "good_and_evil" ? CardCode.GVE_DEFUSE : CardCode.DEFUSE;
    const hasDefuse = cards.includes(dfCode);

    return {
      success: true,
      action: ActionType.DREW_EXPLODING_KITTEN,
      drawnCard,
      hasDefuse,
    };
  },

  // ── Helper: Advance to next turn ─────────────────────────────

  async advanceTurn(
    tx: Prisma.TransactionClient,
    session: GameSession,
    roomId: string,
    currentPlayerId: string,
  ): Promise<TurnAdvancedResult> {
    const alivePlayers = await tx.player.findMany({
      where: { room_id: roomId, role: PlayerRole.PLAYER, is_alive: true },
      orderBy: { seat_number: "asc" },
    });

    const currentIndex = alivePlayers.findIndex(
      (p) => p.player_id === currentPlayerId,
    );
    const direction = session.direction ?? 1;
    const nextIndex =
      (currentIndex + direction + alivePlayers.length) % alivePlayers.length;
    const nextPlayer = alivePlayers[nextIndex];

    if (!nextPlayer) {
      throw new BadRequestError(
        "Cannot determine next player, no alive players found",
      );
    }

    const pendingAttacks = session.pending_attacks ?? 0;
    const nextPendingAttacks = pendingAttacks > 0 ? pendingAttacks - 1 : 0;
    const nextTurnNumber = session.turn_number + 1;

    await tx.gameSession.update({
      where: { session_id: session.session_id },
      data: {
        current_turn_player_id: nextPlayer.player_id,
        turn_number: nextTurnNumber,
        pending_attacks: nextPendingAttacks,
      },
    });

    return {
      success: true,
      action: ActionType.TURN_ADVANCED,
      nextTurn: {
        player_id: nextPlayer.player_id,
        display_name: nextPlayer.display_name,
        turn_number: nextTurnNumber,
        pending_attacks: nextPendingAttacks,
      },
    };
  },

  // ── Helper: Check for winner ─────────────────────────────────

  async checkWinner(
    tx: Prisma.TransactionClient,
    session: GameSession,
    roomId: string,
    eliminatedPlayerId: string,
    byCard: string,
  ): Promise<TurnAdvancedResult | GameOverResult> {
    const alivePlayers = await tx.player.findMany({
      where: { room_id: roomId, role: PlayerRole.PLAYER, is_alive: true },
    });

    if (alivePlayers.length === 1) {
      const winner = alivePlayers[0];
      if (!winner) throw new BadRequestError("Winner not found");

      await tx.gameSession.update({
        where: { session_id: session.session_id },
        data: {
          status: GameSessionStatus.FINISHED,
          winner_player_id: winner.player_id,
          end_time: new Date(),
        },
      });

      await tx.room.update({
        where: { room_id: roomId },
        data: {
          status: RoomStatus.WAITING,
          restart_available_at: new Date(),
        },
      });

      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: winner.player_id,
          player_display_name: winner.display_name,
          action_type: ActionType.GAME_FINISHED,
          action_details: {
            winner_id: winner.player_id,
            eliminated_last: eliminatedPlayerId,
            by_card: byCard,
          },
          turn_number: session.turn_number,
        },
      });

      return {
        success: true,
        action: ActionType.GAME_OVER,
        winner: {
          player_id: winner.player_id,
          display_name: winner.display_name,
        },
      };
    }

    return await gameService.advanceTurn(
      tx,
      session,
      roomId,
      eliminatedPlayerId,
    );
  },

  async favorCard(
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
          action_details: {
            card: fvCode,
            target_player_token: targetPlayerToken,
            target_player_id: target.player_id,
            effect: ActionType.FAVOR_PENDING,
          },
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
  },

  async favorResponse(
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
        where: {
          session_id: session.session_id,
          action_type: ActionType.PLAY_CARD,
          action_details: { path: ["effect"], string_contains: "FAVOR" },
        },
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

      // ไม่ advance turn ที่นี่ — requester ยังต้องจั่วไพ่ต่อในเทิร์นเดิม
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
  },

  async nopeCard(
    roomId: string,
    playerToken: string,
    nopeCount: number,
  ): Promise<{ success: true; action: "NOPE_PLAYED"; nopeCount: number; isCancel: boolean; playedBy: string; playedByDisplayName: string }> {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.gameSession.findFirst({
        where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS },
      });
      if (!session) throw new NotFoundError("No active session");

      const player = await tx.player.findFirst({
        where: { room_id: roomId, player_token: playerToken, is_alive: true },
      });
      if (!player) throw new NotFoundError("Player");

      const hand = await tx.cardHand.findUnique({
        where: { player_id_session_id: { player_id: player.player_id, session_id: session.session_id } },
      });
      const cards = (hand?.cards ?? []) as string[];
      const npCode = cards.includes("GVE_NP") ? "GVE_NP" : "NP";
      if (!cards.includes(npCode))
        throw new BadRequestError("No Nope card in hand");

      let removed = false;
      const newCards = cards.filter((c) => {
        if (c === npCode && !removed) { removed = true; return false; }
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
        data: { discard_pile: [...discardPile, npCode] },
      });

      const newNopeCount = nopeCount + 1;
      const isCancel = newNopeCount % 2 !== 0;

      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: player.player_id,
          player_display_name: player.display_name,
          action_type: ActionType.PLAY_CARD,
          action_details: { card: npCode, nope_count: newNopeCount, is_cancel: isCancel },
          turn_number: session.turn_number,
        },
      });

      return { success: true as const, action: "NOPE_PLAYED" as const, nopeCount: newNopeCount, isCancel, playedBy: player.player_id, playedByDisplayName: player.display_name };
    });
  },

  async getPlayerByToken(roomId: string, playerToken: string) {
    return await prisma.player.findFirst({
      where: { room_id: roomId, player_token: playerToken },
    });
  },
};