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

// ── Deck Building (Decomposed from startGame) ──────────────────

/**
 * Build the initial deck from CardMaster based on card version and expansions.
 * Returns the base deck (without EK, DF, IK which are handled separately).
 * FR-04-1, S2-07
 */
async function buildBaseDeck(
  tx: Prisma.TransactionClient,
  cardVersion: string,
  expansions: string[]
): Promise<{ baseDeck: string[]; totalDF: number; cardMasters: Awaited<ReturnType<typeof tx.cardMaster.findMany>> }> {
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
    cardMasters.find(
      (c) => c.card_code === "DF" || c.card_code === "GVE_DF"
    )?.quantity_in_deck ?? 6;

  const baseDeck: string[] = [];

  for (const card of cardMasters) {
    const isEK = card.card_code === "EK" || card.card_code === "GVE_EK";
    const isDF = card.card_code === "DF" || card.card_code === "GVE_DF";
    const isIK = card.card_code === "IK";

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
 * FR-04-1, S2-08
 */
function dealCards(
  baseDeck: string[],
  players: Player[],
  dfCode: string,
  cardsPerHand = 4
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
 * FR-04-1, S2-07
 */
function finalizeDeck(
  remainingDeck: string[],
  playerCount: number,
  totalDF: number,
  dfCode: string,
  ekCode: string,
  expansions: string[]
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
    deck.push("IK");
  }

  return shuffleArray(deck);
}

/**
 * Create GameSession, DeckState, CardHands, and GameLog in a single transaction step.
 * S2-06, S2-07
 */
async function createGameSession(
  tx: Prisma.TransactionClient,
  roomId: string,
  players: Player[],
  finalDeck: string[],
  hands: PlayerHandsMap,
  hostPlayerToken: string
): Promise<{ session: GameSession; cardHands: CardHand[] }> {
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

  const hostPlayer =
    players.find((p) => p.player_token === hostPlayerToken) ?? players[0];
  if (!hostPlayer) throw new BadRequestError("Host player not found");

  const ekCount = players.length - 1;

  await tx.gameLog.create({
    data: {
      session_id: session.session_id,
      player_id: hostPlayer.player_id,
      player_display_name: hostPlayer.display_name,
      action_type: "GAME_STARTED",
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

// ── Card Effect Handlers (Sprint 2: AT, SK, SF, SH) ───────────

/**
 * Handle Attack card: end turn without drawing, next player gets +2 turns.
 * FR-05-A1, S2-14
 */
async function handleAttackEffect(
  tx: Prisma.TransactionClient,
  session: GameSession,
  roomId: string,
  currentPlayerId: string
): Promise<TurnAdvancedResult> {
  const newPending = (session.pending_attacks ?? 0) + 2;

  await tx.gameSession.update({
    where: { session_id: session.session_id },
    data: { pending_attacks: newPending },
  });

  // Update session with new pending attacks before advancing turn
  const updatedSession = { ...session, pending_attacks: newPending };
  return await gameService.advanceTurn(tx, updatedSession, roomId, currentPlayerId);
}

/**
 * Handle Skip card: end turn without drawing.
 * FR-05, S2-15
 */
async function handleSkipEffect(
  tx: Prisma.TransactionClient,
  session: GameSession,
  roomId: string,
  currentPlayerId: string
): Promise<TurnAdvancedResult> {
  // If there are pending attacks, Skip only cancels one turn
  const pendingAttacks = session.pending_attacks ?? 0;
  if (pendingAttacks > 0) {
    await tx.gameSession.update({
      where: { session_id: session.session_id },
      data: { pending_attacks: pendingAttacks - 1 },
    });
  }

  // Skip behaves differently from Attack: it doesn't advance to next player
  // if there are remaining attack turns for the current player
  if (pendingAttacks > 1) {
    // Still have more turns to play — stay on current player
    return {
      success: true,
      action: "TURN_ADVANCED",
      nextTurn: {
        player_id: currentPlayerId,
        display_name: "", // Will be filled by caller
        turn_number: session.turn_number + 1,
        pending_attacks: pendingAttacks - 1,
      },
    };
  }

  return await gameService.advanceTurn(
    tx,
    { ...session, pending_attacks: 0 },
    roomId,
    currentPlayerId
  );
}

/**
 * Handle See The Future: peek at top 3 cards (private).
 * FR-05, S2-16
 */
async function handleSeeTheFutureEffect(
  tx: Prisma.TransactionClient,
  sessionId: string
): Promise<CardEffectResult> {
  const deckState = await tx.deckState.findUnique({
    where: { session_id: sessionId },
  });
  if (!deckState) throw new NotFoundError("Deck state");

  const deck = deckState.deck_order as string[];
  // Top 3 cards (end of array = top of deck)
  const topCards = deck.slice(-3).reverse();

  return {
    type: "SEE_THE_FUTURE",
    topCards,
  };
}

/**
 * Handle Shuffle: randomly shuffle the draw pile.
 * FR-05, S2-17
 */
async function handleShuffleEffect(
  tx: Prisma.TransactionClient,
  sessionId: string
): Promise<CardEffectResult> {
  const deckState = await tx.deckState.findUnique({
    where: { session_id: sessionId },
  });
  if (!deckState) throw new NotFoundError("Deck state");

  const deck = deckState.deck_order as string[];
  const shuffled = shuffleArray(deck);

  await tx.deckState.update({
    where: { session_id: sessionId },
    data: { deck_order: shuffled },
  });

  return {
    type: "SHUFFLE",
    shuffled: true,
  };
}

// ── Game Service ───────────────────────────────────────────────

export const gameService = {
  /**
   * Start a game: validate, build deck, deal cards, create session.
   * FR-03-10, FR-04-1, S2-06/07/08/09
   */
  async startGame(roomId: string, playerToken: string): Promise<StartGameResult> {
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

      const { baseDeck, totalDF } = await buildBaseDeck(tx, cardVersion, expansions);

      // 4. Determine version-specific codes
      const dfCode = cardVersion === "good_and_evil" ? "GVE_DF" : "DF";
      const ekCode = cardVersion === "good_and_evil" ? "GVE_EK" : "EK";

      // 5. Deal cards to players
      const { remainingDeck, hands } = dealCards(baseDeck, players, dfCode);

      // 6. Finalize deck with EK, remaining DF, and IK
      const finalDeck = finalizeDeck(
        remainingDeck,
        players.length,
        totalDF,
        dfCode,
        ekCode,
        expansions
      );

      // 7. Create game session, deck state, card hands, and game log
      const { session, cardHands } = await createGameSession(
        tx,
        roomId,
        players,
        finalDeck,
        hands,
        playerToken
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

  /**
   * Draw a card from the top of the deck.
   * S2-07, S2-19/20
   */
  async drawCard(
    roomId: string,
    playerToken: string,
    isAutoDrawn = false
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
        const afkResult = await gameService.handleAFK(tx, session, player, roomId);
        if (afkResult) return afkResult;
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
      const isEK = drawnCard === "EK" || drawnCard === "GVE_EK";
      const isIK = drawnCard === "IK";

      if (isEK || isIK) {
        await tx.gameLog.create({
          data: {
            session_id: session.session_id,
            player_id: player.player_id,
            player_display_name: player.display_name,
            action_type: "DREW_EXPLODING_KITTEN",
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
            drawnCard
          );
          return { ...res, deck_count: newDeck.length };
        }

        if (isEK) {
          const res = await gameService.handleExplodingKitten(
            tx,
            session,
            player,
            room,
            drawnCard
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
          action_type: "DREW_CARD",
          action_details: { card: drawnCard, auto_drawn: isAutoDrawn },
          turn_number: session.turn_number,
        },
      });

      // 8. Advance turn
      const turnResult = await gameService.advanceTurn(tx, session, roomId, player.player_id);
      return {
        ...turnResult,
        drawnCard,
        player_id: player.player_id,
        drawnByDisplayName: player.display_name,
        hand: { cards: newCards },
        deck_count: newDeck.length,
      };
    });
  },

  /**
   * Use Defuse card after drawing EK.
   * FR-04-7/9, S2-08/23
   */
  async defuseCard(
    roomId: string,
    playerToken: string
  ): Promise<TurnAdvancedResult | GameOverResult> {
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
      if (lastLog?.action_type !== "DREW_EXPLODING_KITTEN") {
        throw new BadRequestError("No Exploding Kitten to defuse");
      }

      const ekCard = (lastLog.action_details as { card: string }).card;
      const dfCode =
        room.deck_config?.card_version === "good_and_evil" ? "GVE_DF" : "DF";

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

      // Insert EK back at random position
      const deckState = await tx.deckState.findUnique({
        where: { session_id: session.session_id },
      });
      const deck = deckState!.deck_order as string[];
      const insertAt = Math.floor(Math.random() * (deck.length + 1));
      const deckWithEK = [
        ...deck.slice(0, insertAt),
        ekCard,
        ...deck.slice(insertAt),
      ];

      await tx.deckState.update({
        where: { session_id: session.session_id },
        data: { deck_order: deckWithEK, cards_remaining: deckWithEK.length },
      });

      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: player.player_id,
          player_display_name: player.display_name,
          action_type: "DEFUSED",
          action_details: { ek_card: ekCard, insert_at: insertAt },
          turn_number: session.turn_number,
        },
      });

      return await gameService.advanceTurn(
        tx,
        session,
        roomId,
        player.player_id
      );
    });
  },

  /**
   * Eliminate a player (timer expired, no Defuse).
   * FR-04-7/8, S2-25
   */
  async eliminatePlayer(
    roomId: string,
    playerToken: string
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
      if (lastLog?.action_type !== "DREW_EXPLODING_KITTEN") {
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
          action_type: "PLAYER_ELIMINATED",
          action_details: { card: ekCard, reason: "no_defuse_or_timeout" },
          turn_number: session.turn_number,
        },
      });

      return await gameService.checkWinner(
        tx,
        session,
        roomId,
        player.player_id,
        ekCard
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
    targetPlayerToken?: string
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

      switch (normalizedCode) {
        case "AT": {
          // Attack: end turn, next player +2 turns
          turnResult = await handleAttackEffect(
            tx,
            session,
            roomId,
            player.player_id
          );
          effect = { type: "ATTACK", extraTurns: 2 };
          break;
        }

        case "SK": {
          // Skip: end turn without drawing
          turnResult = await handleSkipEffect(
            tx,
            session,
            roomId,
            player.player_id
          );
          effect = { type: "SKIP" };
          break;
        }

        case "SF": {
          // See The Future: peek top 3 (private)
          effect = await handleSeeTheFutureEffect(tx, session.session_id);
          break;
        }

        case "SH": {
          // Shuffle the deck
          effect = await handleShuffleEffect(tx, session.session_id);
          break;
        }

        // Sprint 3+ cards — not yet implemented
        case "FV":
        case "NP":
        case "TA":
        case "RF":
        case "RH":
        case "AG":
        case "AF":
        case "DB":
        case "FC":
          throw new BadRequestError(
            `Card ${cardCode} action is not yet implemented (planned for Sprint 3/4)`
          );

        default: {
          // Cat cards used for combo — Sprint 3
          if (cardCode.startsWith("CAT_") || normalizedCode === "MC") {
            throw new BadRequestError(
              `Combo cards are not yet implemented (planned for Sprint 3)`
            );
          }
          throw new BadRequestError(`Unknown card: ${cardCode}`);
        }
      }

      // 7. Log the action
      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: player.player_id,
          player_display_name: player.display_name,
          action_type: "PLAY_CARD",
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
        action: "CARD_PLAYED",
        cardCode,
        playedBy: player.player_id,
        playedByDisplayName: player.display_name,
        target: targetPlayerToken ?? null,
        effect,
        nextTurn: turnResult?.nextTurn,
      };
    });
  },

  // ── Helper: Handle AFK ───────────────────────────────────────
  // AI Instructions line 29: kick at afk_count == 2

  async handleAFK(
    tx: Prisma.TransactionClient,
    session: GameSession,
    player: Player,
    roomId: string
  ): Promise<TurnAdvancedResult | null> {
    const newAfkCount = player.afk_count + 1;
    await tx.player.update({
      where: { player_id: player.player_id },
      data: { afk_count: newAfkCount },
    });

    if (newAfkCount >= 2) {
      // AFK kick threshold = 2 (per AI Instructions)
      await tx.player.update({
        where: { player_id: player.player_id },
        data: { is_alive: false, role: PlayerRole.SPECTATOR },
      });
      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: player.player_id,
          player_display_name: player.display_name,
          action_type: "PLAYER_AFK_KICKED",
          action_details: { afk_count: newAfkCount },
          turn_number: session.turn_number,
        },
      });
      return await gameService.advanceTurn(
        tx,
        session,
        roomId,
        player.player_id
      );
    }
    return null;
  },

  // ── Helper: Handle Imploding Kitten ──────────────────────────
  // FR-07-IK4: face-up IK = instant death, no Defuse

  async handleImplodingKitten(
    tx: Prisma.TransactionClient,
    session: GameSession,
    player: Player,
    roomId: string,
    drawnCard: string
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
        action_type: "PLAYER_ELIMINATED",
        action_details: { card: drawnCard, reason: "imploding_kitten" },
        turn_number: session.turn_number,
      },
    });
    return await gameService.checkWinner(
      tx,
      session,
      roomId,
      player.player_id,
      drawnCard
    );
  },

  // ── Helper: Handle Exploding Kitten ──────────────────────────
  // FR-04-6/7: check if player has Defuse

  async handleExplodingKitten(
    tx: Prisma.TransactionClient,
    session: GameSession,
    player: Player,
    room: RoomWithDeckConfig,
    drawnCard: string
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
      room.deck_config?.card_version === "good_and_evil" ? "GVE_DF" : "DF";
    const hasDefuse = cards.includes(dfCode);

    return {
      success: true,
      action: "DREW_EXPLODING_KITTEN",
      drawnCard,
      hasDefuse,
    };
  },

  // ── Helper: Advance to next turn ─────────────────────────────
  // FR-04-3, S2-09

  async advanceTurn(
    tx: Prisma.TransactionClient,
    session: GameSession,
    roomId: string,
    currentPlayerId: string
  ): Promise<TurnAdvancedResult> {
    const alivePlayers = await tx.player.findMany({
      where: { room_id: roomId, role: PlayerRole.PLAYER, is_alive: true },
      orderBy: { seat_number: "asc" },
    });

    const currentIndex = alivePlayers.findIndex(
      (p) => p.player_id === currentPlayerId
    );
    const direction = session.direction ?? 1;
    const nextIndex =
      ((currentIndex + direction) + alivePlayers.length) % alivePlayers.length;
    const nextPlayer = alivePlayers[nextIndex];

    if (!nextPlayer) {
      throw new BadRequestError(
        "Cannot determine next player, no alive players found"
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
      action: "TURN_ADVANCED",
      nextTurn: {
        player_id: nextPlayer.player_id,
        display_name: nextPlayer.display_name,
        turn_number: nextTurnNumber,
        pending_attacks: nextPendingAttacks,
      },
    };
  },

  // ── Helper: Check for winner ─────────────────────────────────
  // FR-08-1/2/5, S2-27/28

  async checkWinner(
    tx: Prisma.TransactionClient,
    session: GameSession,
    roomId: string,
    eliminatedPlayerId: string,
    byCard: string
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

      // Auto-reset room to WAITING (FR-08-5/6)
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
          action_type: "GAME_FINISHED",
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
        action: "GAME_OVER",
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
      eliminatedPlayerId
    );
  },
};