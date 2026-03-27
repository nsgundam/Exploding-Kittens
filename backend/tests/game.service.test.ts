
import { gameService } from "../src/services/game.service";
import { BadRequestError, NotFoundError, ForbiddenError } from "../src/utils/errors";
import { RoomStatus, PlayerRole, GameSessionStatus } from "@prisma/client";
import { CardCode, ActionType } from "../src/constants/game";

// ── Mock prisma ────────────────────────────────────────────────
jest.mock("../src/config/prisma", () => ({
  prisma: {
    room: { findUnique: jest.fn() },
    player: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    gameSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    deckState: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    cardHand: {
      findUnique: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    cardMaster: { findMany: jest.fn() },
    gameLog: { create: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// Mock applyCardEffect (effects module)
jest.mock("../src/services/effects/index", () => ({
  applyCardEffect: jest.fn().mockResolvedValue({
    effect: { type: "SKIP_APPLIED" },
    turnResult: {
      success: true,
      action: "TURN_ADVANCED",
      nextTurn: { player_id: "p2", display_name: "Bob", turn_number: 2, pending_attacks: 0 },
    },
  }),
}));

const { prisma } = require("../src/config/prisma");

// ── Helpers ────────────────────────────────────────────────────

function mockRoom(overrides = {}) {
  return {
    room_id: "ROOM01",
    status: RoomStatus.PLAYING,
    host_token: "host-token",
    max_players: 4,
    last_winner_token: null,
    deck_config: { card_version: "classic", expansions: [] },
    ...overrides,
  };
}

function mockSession(overrides = {}) {
  return {
    session_id: "sess-1",
    room_id: "ROOM01",
    status: GameSessionStatus.IN_PROGRESS,
    current_turn_player_id: "p1",
    turn_number: 1,
    direction: 1,
    pending_attacks: 0,
    ...overrides,
  };
}

function mockPlayer(overrides = {}) {
  return {
    player_id: "p1",
    player_token: "tok-1",
    display_name: "Alice",
    room_id: "ROOM01",
    seat_number: 1,
    role: PlayerRole.PLAYER,
    is_alive: true,
    afk_count: 0,
    ...overrides,
  };
}

// ── startGame ──────────────────────────────────────────────────

describe("gameService.startGame()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("[UT-09] Negative: ไม่ใช่ host → throw ForbiddenError 'Only the host can start the game'", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(
      mockRoom({ status: RoomStatus.WAITING, host_token: "host-token" })
    );

    await expect(
      gameService.startGame("ROOM01", "not-host")
    ).rejects.toThrow(ForbiddenError);

    await expect(
      gameService.startGame("ROOM01", "not-host")
    ).rejects.toThrow("Only the host can start the game");
  });

  it("[UT-10] Negative: ผู้เล่น < 2 คน → throw BadRequestError 'Need at least 2 players to start'", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(
      mockRoom({ status: RoomStatus.WAITING, host_token: "host-token" })
    );
    prisma.player.findMany.mockResolvedValue([mockPlayer()]); // มีแค่ 1 คน

    await expect(
      gameService.startGame("ROOM01", "host-token")
    ).rejects.toThrow(BadRequestError);

    await expect(
      gameService.startGame("ROOM01", "host-token")
    ).rejects.toThrow("Need at least 2 players to start");
  });

  it("Negative: room ไม่มีในระบบ → throw NotFoundError 'Room not found'", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(null);

    await expect(
      gameService.startGame("INVALID", "host-token")
    ).rejects.toThrow(NotFoundError);
  });

  it("Negative: game เริ่มไปแล้ว (status = PLAYING) → throw BadRequestError 'Game already started'", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(
      mockRoom({ status: RoomStatus.PLAYING, host_token: "host-token" })
    );

    await expect(
      gameService.startGame("ROOM01", "host-token")
    ).rejects.toThrow(BadRequestError);

    await expect(
      gameService.startGame("ROOM01", "host-token")
    ).rejects.toThrow("Game already started");
  });

  it("[UT-11/12] Happy: startGame สำเร็จ → createGameSession ถูกเรียก, room status = PLAYING", async () => {
    const players = [
      mockPlayer({ player_id: "p1", player_token: "host-token", seat_number: 1 }),
      mockPlayer({ player_id: "p2", player_token: "tok-2", seat_number: 2 }),
    ];
    const session = mockSession();
    const deckState = { session_id: "sess-1", deck_order: [], cards_remaining: 0, discard_pile: [] };

    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique
      .mockResolvedValueOnce(mockRoom({ status: RoomStatus.WAITING, host_token: "host-token" }))
      .mockResolvedValueOnce(null) // last_winner_token check inside createGameSession
      .mockResolvedValueOnce({ ...mockRoom(), players, deck_config: { card_version: "classic", expansions: [] } });

    prisma.player.findMany
      .mockResolvedValueOnce(players) // seated players
      .mockResolvedValueOnce(players); // for createGameSession log

    prisma.cardMaster.findMany.mockResolvedValue([
      { card_code: CardCode.SKIP, quantity_in_deck: 4, expansion_pack: null },
      { card_code: CardCode.ATTACK, quantity_in_deck: 4, expansion_pack: null },
      { card_code: CardCode.DEFUSE, quantity_in_deck: 6, expansion_pack: null },
    ]);

    prisma.gameSession.create.mockResolvedValue(session);
    prisma.deckState.create.mockResolvedValue(deckState);
    prisma.cardHand.createMany.mockResolvedValue({ count: 2 });
    prisma.cardHand.findMany.mockResolvedValue([
      { player_id: "p1", cards: [CardCode.DEFUSE, "SK", "SK", "AT", "AT"], card_count: 5 },
      { player_id: "p2", cards: [CardCode.DEFUSE, "SK", "AT", "AT", "SK"], card_count: 5 },
    ]);
    prisma.gameLog.create.mockResolvedValue({});
    prisma.room.update.mockResolvedValue({ ...mockRoom(), status: RoomStatus.PLAYING });
    prisma.deckState.findUnique.mockResolvedValue(deckState);

    const result = await gameService.startGame("ROOM01", "host-token");

    expect(prisma.gameSession.create).toHaveBeenCalled();
    expect(result.room.status).toBe(RoomStatus.PLAYING);
    expect(result.session.session_id).toBe("sess-1");
  });
});

// ── drawCard ───────────────────────────────────────────────────

describe("gameService.drawCard()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("[UT-14 variant] Negative: room ไม่มีในระบบ → throw NotFoundError 'Room not found'", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(null);

    await expect(
      gameService.drawCard("INVALID", "tok-1")
    ).rejects.toThrow(NotFoundError);
  });

  it("[UT-14] Negative: room status ≠ PLAYING → throw BadRequestError 'Game is not active'", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(mockRoom({ status: RoomStatus.WAITING }));

    await expect(
      gameService.drawCard("ROOM01", "tok-1")
    ).rejects.toThrow(BadRequestError);

    await expect(
      gameService.drawCard("ROOM01", "tok-1")
    ).rejects.toThrow("Game is not active");
  });

  it("Negative: ไม่ใช่ turn ของผู้เล่น → throw BadRequestError 'It's not your turn'", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(mockRoom());
    prisma.gameSession.findFirst.mockResolvedValue(
      mockSession({ current_turn_player_id: "p-other" })
    );
    prisma.player.findFirst.mockResolvedValue(mockPlayer({ player_id: "p1" }));

    await expect(
      gameService.drawCard("ROOM01", "tok-1")
    ).rejects.toThrow(BadRequestError);

    await expect(
      gameService.drawCard("ROOM01", "tok-1")
    ).rejects.toThrow("It's not your turn");
  });

  it("[UT-16] Happy: จั่วไพ่ปกติ → ใส่มือ + advance turn", async () => {
    const player = mockPlayer();
    const session = mockSession({ current_turn_player_id: "p1" });
    const deckState = {
      session_id: "sess-1",
      deck_order: [CardCode.SKIP, CardCode.ATTACK],
      discard_pile: [],
      cards_remaining: 2,
    };
    const hand = { player_id: "p1", session_id: "sess-1", cards: [CardCode.DEFUSE], card_count: 1 };
    const alivePlayers = [
      mockPlayer({ player_id: "p1" }),
      mockPlayer({ player_id: "p2", player_token: "tok-2", seat_number: 2 }),
    ];

    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(mockRoom());
    prisma.gameSession.findFirst.mockResolvedValue(session);
    prisma.player.findFirst.mockResolvedValue(player);
    prisma.deckState.findUnique.mockResolvedValue(deckState);
    prisma.cardHand.findUnique.mockResolvedValue(hand);
    prisma.cardHand.update.mockResolvedValue({ ...hand, cards: [CardCode.DEFUSE, CardCode.ATTACK], card_count: 2 });
    prisma.gameLog.create.mockResolvedValue({});
    prisma.player.findMany.mockResolvedValue(alivePlayers);
    prisma.gameSession.update.mockResolvedValue({ ...session, current_turn_player_id: "p2", turn_number: 2 });
    prisma.deckState.update.mockResolvedValue({ ...deckState, deck_order: [CardCode.SKIP], cards_remaining: 1 });
    prisma.player.update.mockResolvedValue(player);

    const result = await gameService.drawCard("ROOM01", "tok-1");

    expect(result).toHaveProperty("drawnCard");
    expect((result as any).drawnCard).toBe(CardCode.ATTACK); // top of deck
  });
});

// ── playCard ───────────────────────────────────────────────────

describe("gameService.playCard()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("[UT-13] Negative: roomId ผิด → throw NotFoundError 'Room not found'", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(null);

    await expect(
      gameService.playCard("INVALID", "tok-1", CardCode.SKIP)
    ).rejects.toThrow(NotFoundError);

    await expect(
      gameService.playCard("INVALID", "tok-1", CardCode.SKIP)
    ).rejects.toThrow("Room not found");
  });

  it("[UT-14] Negative: room status ≠ PLAYING → throw BadRequestError 'Game is not active'", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(mockRoom({ status: RoomStatus.WAITING }));

    await expect(
      gameService.playCard("ROOM01", "tok-1", CardCode.SKIP)
    ).rejects.toThrow(BadRequestError);

    await expect(
      gameService.playCard("ROOM01", "tok-1", CardCode.SKIP)
    ).rejects.toThrow("Game is not active");
  });

  it("Negative: ไม่ใช่ turn ของผู้เล่น → throw BadRequestError 'It's not your turn'", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(mockRoom());
    prisma.gameSession.findFirst.mockResolvedValue(
      mockSession({ current_turn_player_id: "p-other" })
    );
    prisma.player.findFirst.mockResolvedValue(mockPlayer({ player_id: "p1" }));

    await expect(
      gameService.playCard("ROOM01", "tok-1", CardCode.SKIP)
    ).rejects.toThrow(BadRequestError);

    await expect(
      gameService.playCard("ROOM01", "tok-1", CardCode.SKIP)
    ).rejects.toThrow("It's not your turn");
  });

  it("Negative: ไพ่ไม่อยู่ในมือ → throw BadRequestError 'Card not in hand'", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(mockRoom());
    prisma.gameSession.findFirst.mockResolvedValue(mockSession());
    prisma.player.findFirst.mockResolvedValue(mockPlayer());
    prisma.player.update.mockResolvedValue(mockPlayer());
    // มือของผู้เล่นไม่มี ATTACK
    prisma.cardHand.findUnique.mockResolvedValue({
      cards: [CardCode.DEFUSE, CardCode.SKIP],
      card_count: 2,
    });

    await expect(
      gameService.playCard("ROOM01", "tok-1", CardCode.ATTACK)
    ).rejects.toThrow(BadRequestError);

    await expect(
      gameService.playCard("ROOM01", "tok-1", CardCode.ATTACK)
    ).rejects.toThrow("Card not in hand");
  });

  it("[UT-15] Happy: เล่นไพ่ SKIP สำเร็จ → return { success: true, action: CARD_PLAYED }", async () => {
    const player = mockPlayer();
    const session = mockSession();
    const hand = { player_id: "p1", session_id: "sess-1", cards: [CardCode.DEFUSE, CardCode.SKIP], card_count: 2 };
    const deckState = { session_id: "sess-1", deck_order: [], discard_pile: [], cards_remaining: 0 };

    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(mockRoom());
    prisma.gameSession.findFirst.mockResolvedValue(session);
    prisma.player.findFirst.mockResolvedValue(player);
    prisma.player.update.mockResolvedValue(player);
    prisma.cardHand.findUnique.mockResolvedValue(hand);
    prisma.cardHand.update.mockResolvedValue({ ...hand, cards: [CardCode.DEFUSE], card_count: 1 });
    prisma.deckState.findUnique.mockResolvedValue(deckState);
    prisma.deckState.update.mockResolvedValue(deckState);
    prisma.gameLog.create.mockResolvedValue({});

    const result = await gameService.playCard("ROOM01", "tok-1", CardCode.SKIP);

    expect(result.success).toBe(true);
    expect(result.action).toBe(ActionType.CARD_PLAYED);
    expect(result.cardCode).toBe(CardCode.SKIP);
  });
});

// ── favorCard ──────────────────────────────────────────────────

describe("gameService.favorCard()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("Negative: target ตัวเอง → throw BadRequestError 'Cannot target yourself'", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.gameSession.findFirst.mockResolvedValue(mockSession());
    prisma.player.findFirst.mockResolvedValue(mockPlayer());

    await expect(
      gameService.favorCard("ROOM01", "tok-1", "tok-1")
    ).rejects.toThrow(BadRequestError);

    await expect(
      gameService.favorCard("ROOM01", "tok-1", "tok-1")
    ).rejects.toThrow("Cannot target yourself");
  });

  it("Negative: ไม่มี Favor card ในมือ → throw BadRequestError 'No Favor card in hand'", async () => {
    const player = mockPlayer();
    const target = mockPlayer({ player_id: "p2", player_token: "tok-2" });

    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.gameSession.findFirst.mockResolvedValue(mockSession());
    prisma.player.findFirst
      .mockResolvedValueOnce(player)
      .mockResolvedValueOnce(target);
    prisma.cardHand.findUnique
      .mockResolvedValueOnce({ cards: [CardCode.SKIP, CardCode.ATTACK], card_count: 2 }) // target มีไพ่
      .mockResolvedValueOnce({ cards: [CardCode.SKIP], card_count: 1 }); // player ไม่มี FV

    await expect(
      gameService.favorCard("ROOM01", "tok-1", "tok-2")
    ).rejects.toThrow(BadRequestError);

    await expect(
      gameService.favorCard("ROOM01", "tok-1", "tok-2")
    ).rejects.toThrow("No Favor card in hand");
  });

  it("Negative: target ไม่มีไพ่ → throw BadRequestError 'Target has no cards to give'", async () => {
    const player = mockPlayer();
    const target = mockPlayer({ player_id: "p2", player_token: "tok-2" });

    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.gameSession.findFirst.mockResolvedValue(mockSession());
    prisma.player.findFirst
      .mockResolvedValueOnce(player)
      .mockResolvedValueOnce(target);
    prisma.cardHand.findUnique.mockResolvedValue({ cards: [], card_count: 0 }); // target ไม่มีไพ่

    await expect(
      gameService.favorCard("ROOM01", "tok-1", "tok-2")
    ).rejects.toThrow(BadRequestError);

    await expect(
      gameService.favorCard("ROOM01", "tok-1", "tok-2")
    ).rejects.toThrow("Target has no cards to give");
  });
});

// ── nopeCard ───────────────────────────────────────────────────

describe("gameService.nopeCard()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("Negative: ไม่มี Nope card ในมือ → throw BadRequestError 'No Nope card in hand'", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.gameSession.findFirst.mockResolvedValue(mockSession());
    prisma.player.findFirst.mockResolvedValue(mockPlayer());
    prisma.cardHand.findUnique.mockResolvedValue({ cards: [CardCode.SKIP], card_count: 1 });

    await expect(
      gameService.nopeCard("ROOM01", "tok-1", 0)
    ).rejects.toThrow(BadRequestError);

    await expect(
      gameService.nopeCard("ROOM01", "tok-1", 0)
    ).rejects.toThrow("No Nope card in hand");
  });

  it("Happy: เล่น Nope ครั้งแรก (nopeCount odd) → isCancel = true", async () => {
    const player = mockPlayer();
    const hand = { player_id: "p1", session_id: "sess-1", cards: [CardCode.NOPE, CardCode.SKIP], card_count: 2 };
    const deckState = { session_id: "sess-1", deck_order: [], discard_pile: [], cards_remaining: 0 };

    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.gameSession.findFirst.mockResolvedValue(mockSession());
    prisma.player.findFirst.mockResolvedValue(player);
    prisma.cardHand.findUnique.mockResolvedValue(hand);
    prisma.cardHand.update.mockResolvedValue({ ...hand, cards: [CardCode.SKIP], card_count: 1 });
    prisma.deckState.findUnique.mockResolvedValue(deckState);
    prisma.deckState.update.mockResolvedValue(deckState);
    prisma.gameLog.create.mockResolvedValue({});

    const result = await gameService.nopeCard("ROOM01", "tok-1", 0);

    expect(result.success).toBe(true);
    expect(result.action).toBe("NOPE_PLAYED");
    expect(result.nopeCount).toBe(1);
    expect(result.isCancel).toBe(true); // 1 = odd = cancel
  });

  it("Happy: เล่น Nope ครั้งที่ 2 (nopeCount even) → isCancel = false (pass)", async () => {
    const player = mockPlayer();
    const hand = { player_id: "p1", session_id: "sess-1", cards: [CardCode.NOPE], card_count: 1 };
    const deckState = { session_id: "sess-1", deck_order: [], discard_pile: [CardCode.NOPE], cards_remaining: 0 };

    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.gameSession.findFirst.mockResolvedValue(mockSession());
    prisma.player.findFirst.mockResolvedValue(player);
    prisma.cardHand.findUnique.mockResolvedValue(hand);
    prisma.cardHand.update.mockResolvedValue({ ...hand, cards: [], card_count: 0 });
    prisma.deckState.findUnique.mockResolvedValue(deckState);
    prisma.deckState.update.mockResolvedValue(deckState);
    prisma.gameLog.create.mockResolvedValue({});

    const result = await gameService.nopeCard("ROOM01", "tok-1", 1); // nopeCount เริ่มที่ 1

    expect(result.nopeCount).toBe(2);
    expect(result.isCancel).toBe(false); // 2 = even = pass
  });
});

// ── defuseCard ─────────────────────────────────────────────────

describe("gameService.defuseCard()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("Negative: ไม่มี Defuse card ในมือ → throw BadRequestError 'No Defuse card in hand'", async () => {
    const player = mockPlayer();
    const session = mockSession();

    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(mockRoom());
    prisma.gameSession.findFirst.mockResolvedValue(session);
    prisma.player.findFirst.mockResolvedValue(player);
    prisma.gameLog.findFirst.mockResolvedValue({
      action_type: ActionType.DREW_EXPLODING_KITTEN,
      action_details: { card: CardCode.EXPLODING_KITTEN },
    });
    prisma.cardHand.findUnique.mockResolvedValue({
      cards: [CardCode.SKIP, CardCode.ATTACK], // ไม่มี DF
      card_count: 2,
    });

    await expect(
      gameService.defuseCard("ROOM01", "tok-1")
    ).rejects.toThrow(BadRequestError);

    await expect(
      gameService.defuseCard("ROOM01", "tok-1")
    ).rejects.toThrow("No Defuse card in hand");
  });

  it("Negative: action ล่าสุดไม่ใช่การจั่ว EK → throw BadRequestError 'No Exploding Kitten to defuse'", async () => {
    const player = mockPlayer();

    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(mockRoom());
    prisma.gameSession.findFirst.mockResolvedValue(mockSession());
    prisma.player.findFirst.mockResolvedValue(player);
    prisma.gameLog.findFirst.mockResolvedValue({
      action_type: ActionType.DREW_CARD, // ไม่ใช่ EK
      action_details: { card: CardCode.SKIP },
    });

    await expect(
      gameService.defuseCard("ROOM01", "tok-1")
    ).rejects.toThrow(BadRequestError);

    await expect(
      gameService.defuseCard("ROOM01", "tok-1")
    ).rejects.toThrow("No Exploding Kitten to defuse");
  });
});
