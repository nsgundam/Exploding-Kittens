/**
 * ============================================================
 * sprint1_2.test.ts
 * Unit Tests — Sprint 1 & Sprint 2
 * Place at: backend/src/services/sprint1_2.test.ts
 * ============================================================
 *
 * TRACEABILITY MATRIX
 * ─────────────────────────────────────────────────────────────
 * Suite                       FR Ref              Ticket
 * ─────────────────────────────────────────────────────────────
 * roomService.createRoom      FR-02-3             S1-10
 * roomService.joinRoom        FR-03-6             S1-15
 * roomService.selectSeat      FR-03-7/8/9         S1-18/19
 * roomService.unseatPlayer    FR-03-8             S1-18/20
 * roomService.leaveRoom       FR-03-11            S1-22/23
 * roomService.updateDeckConfig FR-03-4            S2-03
 * roomService.getCurrentRoom  FR-01-5             S1-08
 * roomService.getRoomById     FR-02-2             S1-11
 * gameService.startGame       FR-03-10, FR-04-1   S2-06/07/08
 * gameService.drawCard        FR-04-3/4/6/7/8     S2-09/19/21/25
 * gameService.playCard        FR-05, NFR-02       S2-13/15
 * gameService.defuseCard      FR-04-7/9           S2-23
 * gameService.eliminatePlayer FR-04-8             S2-25
 * gameService.checkWinner     FR-04-5, FR-08      S2-27/28/29
 * ─────────────────────────────────────────────────────────────
 *
 * Run: npx jest --testPathPattern=sprint1_2 --coverage
 */

// ── Mock prisma ───────────────────────────────────────────────
jest.mock("../config/prisma", () => ({
  prisma: { $transaction: jest.fn() },
}));

jest.mock("../services/effects/index", () => ({
  applyCardEffect: jest.fn(),
}));

import { roomService } from "../services/room.service";
import { gameService } from "../services/game.service";
import { prisma } from "../config/prisma";
import { applyCardEffect } from "../services/effects/index";

const mockTransaction = prisma.$transaction as jest.Mock;
const mockApplyEffect = applyCardEffect as jest.MockedFunction<typeof applyCardEffect>;

// ── Mock transaction factory ──────────────────────────────────
function makeTx() {
  return {
    player: {
      findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
      create: jest.fn(), update: jest.fn(), updateMany: jest.fn(),
      delete: jest.fn(), count: jest.fn(),
    },
    playerIdentity: { upsert: jest.fn() },
    room:        { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    deckConfig:  { create: jest.fn(), update: jest.fn() },
    gameSession: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    cardHand:    { findUnique: jest.fn(), update: jest.fn(), createMany: jest.fn(), findMany: jest.fn() },
    deckState:   { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    gameLog:     { create: jest.fn(), findFirst: jest.fn() },
    cardMaster:  { findMany: jest.fn() },
  };
}

function setupTx(tx: ReturnType<typeof makeTx>) {
  mockTransaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(tx));
}

// ── roomService also calls prisma directly (not always via tx) ─
// We need to mock the prisma object for non-tx calls
jest.mock("../config/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    room:           { findUnique: jest.fn(), findMany: jest.fn() },
    player:         { findFirst: jest.fn(), findUnique: jest.fn() },
    deckConfig:     { update: jest.fn() },
    playerIdentity: { upsert: jest.fn() },
  },
}));

const mockPrisma = prisma as {
  $transaction: jest.Mock;
  room: { findUnique: jest.Mock; findMany: jest.Mock };
  player: { findFirst: jest.Mock; findUnique: jest.Mock };
  deckConfig: { update: jest.Mock };
  playerIdentity: { upsert: jest.Mock };
};

// ── Test data factories ───────────────────────────────────────
const makeRoom = (o: Record<string, unknown> = {}) => ({
  room_id: "123456", room_name: "ห้องทดสอบ", status: "WAITING",
  host_token: "tok-A", max_players: 5, last_winner_token: null,
  deck_config: { card_version: "classic", expansions: [] },
  players: [], ...o,
});

const makePlayer = (o: Record<string, unknown> = {}) => ({
  player_id: "p-A", room_id: "123456", player_token: "tok-A",
  display_name: "Alice", seat_number: 1, role: "PLAYER",
  is_alive: true, afk_count: 0, ...o,
});

const makeSession = (o: Record<string, unknown> = {}) => ({
  session_id: "sess-1", room_id: "123456", status: "IN_PROGRESS",
  current_turn_player_id: "p-A", turn_number: 1, direction: 1, pending_attacks: 0, ...o,
});

const makeHand = (cards: string[], pid = "p-A") => ({
  player_id: pid, session_id: "sess-1", cards, card_count: cards.length,
});

const makeDeck = (deck: string[], discard: string[] = []) => ({
  session_id: "sess-1", deck_order: deck, discard_pile: discard, cards_remaining: deck.length,
});

const pA = makePlayer({ player_id: "p-A", player_token: "tok-A", seat_number: 1 });
const pB = makePlayer({ player_id: "p-B", player_token: "tok-B", seat_number: 2 });

beforeEach(() => jest.clearAllMocks());

// ================================================================
// 1. roomService.createRoom()
// FR-02-3, S1-10
// ================================================================

describe("roomService.createRoom() — FR-02-3 [S1-10]", () => {
  function buildCreateTx() {
    const tx = makeTx();
    tx.playerIdentity.upsert.mockResolvedValue({});
    tx.room.create.mockResolvedValue(makeRoom());
    tx.deckConfig.create.mockResolvedValue({});
    tx.player.create.mockResolvedValue(pA);
    tx.room.findUnique.mockResolvedValue(makeRoom({ players: [pA] }));
    // mock prisma.room.findUnique for unique code check (called outside tx)
    mockPrisma.room.findUnique.mockResolvedValue(null); // code is unique
    setupTx(tx);
    return tx;
  }

  // UT-01 | FR-02-3: room_id เป็นตัวเลข 6 หลักตาม GAME_CONFIG
  it("UT-01 [FR-02-3]: สร้างห้องสำเร็จ — room_id ถูก generate ตาม GAME_CONFIG", async () => {
    buildCreateTx();
    const result = await roomService.createRoom({
      playerToken: "tok-A", roomName: "ห้องทดสอบ", hostName: "Alice",
      maxPlayers: 5, cardVersion: "classic", expansions: [],
    });
    expect(result).toBeDefined();
    expect(result?.room_name).toBe("ห้องทดสอบ");
  });

  // UT-01b | FR-02-3: host ได้เป็น PLAYER ที่ seat 1 ทันทีเมื่อสร้างห้อง
  it("UT-01b [FR-02-3]: host ถูก create เป็น PLAYER ที่ seat_number=1 ทันที", async () => {
    const tx = buildCreateTx();
    await roomService.createRoom({
      playerToken: "tok-A", roomName: "ห้อง", hostName: "Alice",
      maxPlayers: 5, cardVersion: "classic", expansions: [],
    });
    expect(tx.player.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: "PLAYER", seat_number: 1 }) })
    );
  });
});

// ================================================================
// 2. roomService.joinRoom()
// FR-03-6, S1-15
// ================================================================

describe("roomService.joinRoom() — FR-03-6 [S1-15]", () => {
  function buildJoinTx(existingPlayer: ReturnType<typeof makePlayer> | null = null) {
    const tx = makeTx();
    mockPrisma.room.findUnique.mockResolvedValue(makeRoom());
    tx.playerIdentity.upsert.mockResolvedValue({});
    tx.player.findUnique.mockResolvedValue(existingPlayer);
    tx.player.create.mockResolvedValue(
      makePlayer({ role: "SPECTATOR", seat_number: null })
    );
    setupTx(tx);
    return tx;
  }

  // UT-02 | FR-03-6: displayName ว่าง → throw BadRequestError
  it("UT-02 [FR-03-6]: displayName ว่าง → throw BadRequestError", async () => {
    await expect(roomService.joinRoom("123456", "tok-B", ""))
      .rejects.toThrow("Display name is required");
  });

  // UT-03 | FR-03-6: roomId ไม่มีใน DB → throw NotFoundError
  it("UT-03 [FR-03-6]: roomId ไม่มีใน DB → throw NotFoundError", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(null);
    await expect(roomService.joinRoom("999999", "tok-B", "Bob"))
      .rejects.toThrow("Room not found");
  });

  // UT-04 | FR-03-6: เข้าห้องซ้ำ token+roomId เดิม → return existing ไม่ duplicate
  it("UT-04 [FR-03-6]: เข้าห้องซ้ำ → return existing player ไม่ duplicate", async () => {
    const existing = makePlayer({ role: "SPECTATOR", player_token: "tok-B" });
    const tx = buildJoinTx(existing);
    const result = await roomService.joinRoom("123456", "tok-B", "Bob");
    expect(result).toEqual(existing);
    expect(tx.player.create).not.toHaveBeenCalled();
  });

  // UT-05 | FR-03-6: เข้าห้องใหม่ → สร้าง Player role = SPECTATOR
  it("UT-05 [FR-03-6]: เข้าห้องใหม่ → Player ถูกสร้างด้วย role=SPECTATOR", async () => {
    const tx = buildJoinTx(null);
    const result = await roomService.joinRoom("123456", "tok-B", "Bob");
    expect(tx.player.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: "SPECTATOR" }) })
    );
    expect(result.role).toBe("SPECTATOR");
  });
});

// ================================================================
// 3. roomService.selectSeat()
// FR-03-7, S1-18/19
// ================================================================

describe("roomService.selectSeat() — FR-03-7 [S1-18/19]", () => {
  function buildSelectTx(opts: {
    roomStatus?: string; seatTaken?: boolean; sameToken?: boolean; isFull?: boolean
  } = {}) {
    const tx = makeTx();
    tx.room.findUnique.mockResolvedValue(makeRoom({ status: opts.roomStatus ?? "WAITING" }));
    tx.player.findFirst.mockResolvedValue(
      opts.seatTaken
        ? makePlayer({ player_token: opts.sameToken ? "tok-A" : "tok-B", seat_number: 2 })
        : null
    );
    tx.player.count.mockResolvedValue(opts.isFull ? 5 : 1);
    tx.player.update.mockResolvedValue(makePlayer({ seat_number: 2, role: "PLAYER" }));
    setupTx(tx);
    return tx;
  }

  // UT-06 | FR-03-7: seatNumber < 1 → throw BadRequestError
  it("UT-06 [FR-03-7]: seatNumber < 1 → throw BadRequestError", async () => {
    await expect(roomService.selectSeat("123456", "tok-A", 0))
      .rejects.toThrow("Invalid seat number");
  });

  // UT-07 | FR-03-7: ที่นั่งมีคนอื่นอยู่ → throw BadRequestError (NFR-06)
  it("UT-07 [FR-03-7/NFR-06]: ที่นั่งมีคนอื่นอยู่ → throw BadRequestError 'Seat already taken'", async () => {
    buildSelectTx({ seatTaken: true, sameToken: false });
    await expect(roomService.selectSeat("123456", "tok-A", 2))
      .rejects.toThrow("Seat already taken");
  });

  // UT-08 | FR-03-7: ห้องเต็ม → throw BadRequestError
  it("UT-08 [FR-03-7]: ห้องเต็ม max_players → throw BadRequestError 'Room is full'", async () => {
    buildSelectTx({ isFull: true });
    await expect(roomService.selectSeat("123456", "tok-A", 2))
      .rejects.toThrow("Room is full");
  });

  // UT-09 | FR-03-7: เกมเริ่มแล้ว (PLAYING) → throw BadRequestError
  it("UT-09 [FR-03-7]: เกมเริ่มแล้ว (status=PLAYING) → throw BadRequestError", async () => {
    buildSelectTx({ roomStatus: "PLAYING" });
    await expect(roomService.selectSeat("123456", "tok-A", 2))
      .rejects.toThrow("Game already started");
  });

  // UT-07b | FR-03-7: token เดิมนั่งที่นั่งเดิม → return existing (idempotent)
  it("UT-07b [FR-03-7]: นั่งที่นั่งเดิมอีกครั้ง → return existing player (idempotent)", async () => {
    buildSelectTx({ seatTaken: true, sameToken: true });
    const result = await roomService.selectSeat("123456", "tok-A", 2);
    expect(result.seat_number).toBe(2);
  });

  // UT-05b | FR-03-7: เลือกที่นั่งสำเร็จ → role = PLAYER
  it("UT-05b [FR-03-7]: เลือกที่นั่งสำเร็จ → role เปลี่ยนเป็น PLAYER", async () => {
    buildSelectTx();
    const result = await roomService.selectSeat("123456", "tok-A", 2);
    expect(result.role).toBe("PLAYER");
    expect(result.seat_number).toBe(2);
  });
});

// ================================================================
// 4. roomService.unseatPlayer()
// FR-03-8, S1-18/20
// ================================================================

describe("roomService.unseatPlayer() — FR-03-8 [S1-18/20]", () => {
  function buildUnseatTx(status = "WAITING") {
    const tx = makeTx();
    tx.room.findUnique.mockResolvedValue(makeRoom({ status }));
    tx.player.update.mockResolvedValue(makePlayer({ role: "SPECTATOR", seat_number: null }));
    setupTx(tx);
    return tx;
  }

  // UT-10 | FR-03-8: ลุกจากที่นั่ง → role = SPECTATOR, seat_number = null
  it("UT-10 [FR-03-8]: ลุกจากที่นั่งสำเร็จ → role=SPECTATOR, seat_number=null", async () => {
    buildUnseatTx();
    const result = await roomService.unseatPlayer("123456", "tok-A");
    expect(result.role).toBe("SPECTATOR");
    expect(result.seat_number).toBeNull();
  });

  // UT-11 | FR-03-8: เกมเริ่มแล้ว → throw BadRequestError
  it("UT-11 [FR-03-8]: เกมเริ่มแล้ว → throw BadRequestError 'Game already started'", async () => {
    buildUnseatTx("PLAYING");
    await expect(roomService.unseatPlayer("123456", "tok-A"))
      .rejects.toThrow("Game already started");
  });
});

// ================================================================
// 5. roomService.leaveRoom()
// FR-03-11, S1-22/23
// ================================================================

describe("roomService.leaveRoom() — FR-03-11 [S1-22/23]", () => {
  // UT-12 | FR-03-11: คนสุดท้ายออก → ห้องถูกลบ return null
  it("UT-12 [FR-03-11]: คนสุดท้ายออก → ห้องถูกลบ คืน null", async () => {
    const tx = makeTx();
    tx.player.findUnique.mockResolvedValue(pA);
    tx.player.delete.mockResolvedValue({});
    tx.player.findMany.mockResolvedValue([]); // ไม่มีคนเหลือ
    tx.room.delete.mockResolvedValue({});
    setupTx(tx);
    const result = await roomService.leaveRoom("123456", "tok-A");
    expect(result).toBeNull();
    expect(tx.room.delete).toHaveBeenCalled();
  });

  // UT-13 | FR-03-11: host ออก → ย้าย host_token ไปคนถัดไปอัตโนมัติ
  it("UT-13 [FR-03-11]: host ออก → host_token migrate ไปผู้เล่นคนถัดไป", async () => {
    const tx = makeTx();
    tx.player.findUnique.mockResolvedValue(pA); // host leaving
    tx.player.delete.mockResolvedValue({});
    tx.player.findMany.mockResolvedValue([pB]); // pB remains
    tx.room.findUnique
      .mockResolvedValueOnce(makeRoom({ host_token: "tok-A" })) // first call
      .mockResolvedValueOnce(makeRoom({ host_token: "tok-B", players: [pB] })); // after update
    tx.room.update.mockResolvedValue({});
    setupTx(tx);
    await roomService.leaveRoom("123456", "tok-A");
    expect(tx.room.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ host_token: "tok-B" }) })
    );
  });

  // UT-12b | FR-03-11: player ไม่มีใน room → คืน null (no-op)
  it("UT-12b [FR-03-11]: player ไม่พบใน room → คืน null ไม่เกิด error", async () => {
    const tx = makeTx();
    tx.player.findUnique.mockResolvedValue(null);
    setupTx(tx);
    const result = await roomService.leaveRoom("123456", "tok-X");
    expect(result).toBeNull();
  });
});

// ================================================================
// 6. roomService.updateDeckConfig()
// FR-03-4, S2-03
// ================================================================

describe("roomService.updateDeckConfig() — FR-03-4 [S2-03]", () => {
  // UT-14 | FR-03-4: ไม่ใช่ host → throw ForbiddenError
  it("UT-14 [FR-03-4]: ไม่ใช่ host → throw ForbiddenError", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(makeRoom({ host_token: "tok-A" }));
    await expect(
      roomService.updateDeckConfig("123456", "tok-B", { cardVersion: "good_and_evil", expansions: [] })
    ).rejects.toThrow("Only the host can change deck config");
  });

  // UT-15 | FR-03-4: เกมเริ่มแล้ว → throw BadRequestError
  it("UT-15 [FR-03-4]: เกมเริ่มแล้ว (PLAYING) → throw BadRequestError", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(makeRoom({ status: "PLAYING", host_token: "tok-A" }));
    await expect(
      roomService.updateDeckConfig("123456", "tok-A", { cardVersion: "good_and_evil", expansions: [] })
    ).rejects.toThrow("Cannot change config during a game");
  });

  // UT-15b | FR-03-4: host เปลี่ยน config สำเร็จ → DeckConfig อัปเดต
  it("UT-15b [FR-03-4]: host เปลี่ยน config สำเร็จ → deckConfig.update ถูกเรียก", async () => {
    mockPrisma.room.findUnique
      .mockResolvedValueOnce(makeRoom()) // updateDeckConfig check
      .mockResolvedValueOnce(makeRoom({ deck_config: { card_version: "good_and_evil" } })); // getRoomById
    mockPrisma.deckConfig.update.mockResolvedValue({});
    const result = await roomService.updateDeckConfig("123456", "tok-A", {
      cardVersion: "good_and_evil", expansions: [],
    });
    expect(mockPrisma.deckConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ card_version: "good_and_evil" }) })
    );
  });
});

// ================================================================
// 7. roomService.getCurrentRoom() & getRoomById()
// FR-01-5 (S1-08), FR-02-2 (S1-11)
// ================================================================

describe("roomService.getCurrentRoom() — FR-01-5 [S1-08]", () => {
  // UT-16 | FR-01-5: มี player → return { roomId }
  it("UT-16 [FR-01-5]: มี player ในระบบ → คืน { roomId }", async () => {
    mockPrisma.player.findFirst.mockResolvedValue({ room_id: "123456" });
    const result = await roomService.getCurrentRoom("tok-A");
    expect(result).toEqual({ roomId: "123456" });
  });

  // UT-17 | FR-01-5: ไม่มี player / token ว่าง → return null
  it("UT-17 [FR-01-5]: ไม่มี player ในระบบ → คืน null", async () => {
    mockPrisma.player.findFirst.mockResolvedValue(null);
    const result = await roomService.getCurrentRoom("tok-X");
    expect(result).toBeNull();
  });

  it("UT-17b [FR-01-5]: token ว่างเปล่า → คืน null ทันที", async () => {
    const result = await roomService.getCurrentRoom("");
    expect(result).toBeNull();
  });
});

describe("roomService.getRoomById() — FR-02-2 [S1-11]", () => {
  // UT-18 | FR-02-2: roomId ไม่มีใน DB → throw NotFoundError
  it("UT-18 [FR-02-2]: roomId ไม่มีใน DB → throw NotFoundError", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(null);
    await expect(roomService.getRoomById("999999")).rejects.toThrow("Room not found");
  });

  it("UT-18b [FR-02-2]: roomId มีใน DB → คืน room พร้อม players และ deck_config", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(makeRoom({ players: [pA] }));
    const result = await roomService.getRoomById("123456");
    expect(result.room_id).toBe("123456");
    expect(result.players).toHaveLength(1);
  });
});

// ================================================================
// 8. gameService.startGame()
// FR-03-10, FR-04-1, S2-06/07/08
// ================================================================

describe("gameService.startGame() — FR-03-10/FR-04-1 [S2-06/07/08]", () => {
  function buildStartTx(opts: { playerCount?: number; isHost?: boolean; roomStatus?: string } = {}) {
    const { playerCount = 3, isHost = true, roomStatus = "WAITING" } = opts;
    const players = Array.from({ length: playerCount }, (_, i) =>
      makePlayer({ player_id: `p-${i}`, player_token: `tok-${i}`, seat_number: i + 1 })
    );
    const tx = makeTx();
    tx.room.findUnique.mockResolvedValue(
      makeRoom({ host_token: isHost ? "tok-0" : "tok-X", status: roomStatus })
    );
    tx.player.findMany.mockResolvedValue(players);
    tx.cardMaster.findMany.mockResolvedValue(
      // minimal card master: DF x6, EK x4, AT x4, SK x4, SF x5, SH x4, NP x5, FV x4, CAT_TACO x4
      [
        { card_code: "DF", quantity_in_deck: 6, expansion_pack: null },
        { card_code: "EK", quantity_in_deck: 4, expansion_pack: null },
        { card_code: "AT", quantity_in_deck: 4, expansion_pack: null },
        { card_code: "SK", quantity_in_deck: 4, expansion_pack: null },
        { card_code: "SF", quantity_in_deck: 5, expansion_pack: null },
        { card_code: "SH", quantity_in_deck: 4, expansion_pack: null },
        { card_code: "NP", quantity_in_deck: 5, expansion_pack: null },
        { card_code: "FV", quantity_in_deck: 4, expansion_pack: null },
        { card_code: "CAT_TACO", quantity_in_deck: 4, expansion_pack: null },
      ]
    );
    tx.gameSession.create.mockResolvedValue(makeSession());
    tx.deckState.create.mockResolvedValue({});
    tx.cardHand.createMany.mockResolvedValue({});
    tx.cardHand.findMany.mockResolvedValue(
      players.map(p => makeHand(["DF", "AT", "SK", "SF", "SH"], p.player_id as string))
    );
    tx.gameLog.create.mockResolvedValue({});
    tx.room.update.mockResolvedValue(makeRoom({ status: "PLAYING" }));
    tx.deckState.findUnique.mockResolvedValue(makeDeck(["AT", "SK"]));
    setupTx(tx);
    return tx;
  }

  // UT-19 | FR-03-10: ไม่ใช่ host → throw ForbiddenError
  it("UT-19 [FR-03-10]: ไม่ใช่ host → throw ForbiddenError", async () => {
    buildStartTx({ isHost: false });
    await expect(gameService.startGame("123456", "tok-X"))
      .rejects.toThrow("Only the host can start the game");
  });

  // UT-20 | FR-03-10: PLAYER < 2 คน → throw BadRequestError
  it("UT-20 [FR-03-10]: มี PLAYER น้อยกว่า 2 คน → throw BadRequestError", async () => {
    buildStartTx({ playerCount: 1 });
    await expect(gameService.startGame("123456", "tok-0"))
      .rejects.toThrow("Need at least 2 players to start");
  });

  // UT-21 | FR-03-10: room ไม่มีใน DB → throw NotFoundError
  it("UT-21 [FR-03-10]: room ไม่มีใน DB → throw NotFoundError", async () => {
    const tx = makeTx();
    tx.room.findUnique.mockResolvedValue(null);
    setupTx(tx);
    await expect(gameService.startGame("999999", "tok-0")).rejects.toThrow("Room not found");
  });

  // UT-21b | FR-03-10: room ไม่ได้ WAITING → throw BadRequestError
  it("UT-21b [FR-03-10]: room ไม่ได้ WAITING → throw BadRequestError 'Game already started'", async () => {
    buildStartTx({ roomStatus: "PLAYING" });
    await expect(gameService.startGame("123456", "tok-0"))
      .rejects.toThrow("Game already started");
  });

  // UT-22 | FR-04-1: แต่ละมือ = 5 ใบ (DF + 4 ทั่วไป)
  it("UT-22 [FR-04-1]: createMany ถูกเรียกสร้าง CardHand ให้ทุก player", async () => {
    const tx = buildStartTx({ playerCount: 3 });
    await gameService.startGame("123456", "tok-0");
    expect(tx.cardHand.createMany).toHaveBeenCalled();
    const callData = tx.cardHand.createMany.mock.calls[0][0].data;
    // ทุก player ได้รับไพ่ 5 ใบ (DF + 4)
    callData.forEach((hand: { card_count: number }) => {
      expect(hand.card_count).toBe(5);
    });
  });

  // UT-23 | FR-04-1: EK ใน deck = players.length - 1
  it("UT-23 [FR-04-1]: deckState ถูกสร้าง — EK count = players - 1", async () => {
    const tx = buildStartTx({ playerCount: 3 });
    await gameService.startGame("123456", "tok-0");
    expect(tx.deckState.create).toHaveBeenCalled();
    const deckOrder = tx.deckState.create.mock.calls[0][0].data.deck_order as string[];
    const ekCount = deckOrder.filter((c: string) => c === "EK").length;
    expect(ekCount).toBe(2); // 3 players - 1
  });
});

// ================================================================
// 9. gameService.drawCard()
// FR-04-3/4/6/7/8, S2-09/19/21/25
// ================================================================

describe("gameService.drawCard() — FR-04-3/4/6/7/8 [S2-09/19]", () => {
  function buildDrawTx(deck = ["A", "B", "TOP"], hand = ["DF"]) {
    const tx = makeTx();
    tx.room.findUnique.mockResolvedValue(makeRoom());
    tx.gameSession.findFirst.mockResolvedValue(makeSession());
    tx.player.findFirst.mockResolvedValue({ ...pA });
    tx.deckState.findUnique.mockResolvedValue(makeDeck(deck));
    tx.deckState.update.mockResolvedValue({});
    tx.cardHand.findUnique.mockResolvedValue(makeHand(hand));
    tx.cardHand.update.mockResolvedValue({});
    tx.gameLog.create.mockResolvedValue({});
    tx.player.findMany.mockResolvedValue([pA, pB]);
    tx.gameSession.update.mockResolvedValue(makeSession());
    tx.player.update.mockResolvedValue({});
    setupTx(tx);
    return tx;
  }

  // UT-24 | FR-04-4: room ไม่ active → throw BadRequestError
  it("UT-24 [FR-04-4]: room ไม่ได้ PLAYING → throw BadRequestError 'Game is not active'", async () => {
    const tx = makeTx();
    tx.room.findUnique.mockResolvedValue(makeRoom({ status: "WAITING" }));
    setupTx(tx);
    await expect(gameService.drawCard("123456", "tok-A"))
      .rejects.toThrow("Game is not active");
  });

  // UT-25 | FR-04-3: ไม่ใช่เทิร์นตัวเอง → throw BadRequestError
  it("UT-25 [FR-04-3]: ไม่ใช่เทิร์นของผู้เล่น → throw BadRequestError 'It\\'s not your turn'", async () => {
    const tx = makeTx();
    tx.room.findUnique.mockResolvedValue(makeRoom());
    tx.gameSession.findFirst.mockResolvedValue(makeSession({ current_turn_player_id: "p-B" }));
    tx.player.findFirst.mockResolvedValue({ ...pA });
    setupTx(tx);
    await expect(gameService.drawCard("123456", "tok-A"))
      .rejects.toThrow("It's not your turn");
  });

  // UT-26 | FR-04-4: จั่วปกติ → ไพ่เพิ่มมือ + turn เปลี่ยน
  it("UT-26 [FR-04-4]: จั่วปกติ → drawnCard ถูกต้อง + hand อัปเดต", async () => {
    buildDrawTx(["A", "B", "TOP_CARD"]);
    const res = await gameService.drawCard("123456", "tok-A");
    expect(res.drawnCard).toBe("TOP_CARD");
  });

  // UT-27 | FR-04-6/7: จั่ว EK + มี Defuse → hasDefuse = true
  it("UT-27 [FR-04-6/7]: จั่ว EK + มี Defuse → hasDefuse=true, รอ defuseCard()", async () => {
    buildDrawTx(["A", "EK"], ["DF", "AT"]);
    const res = await gameService.drawCard("123456", "tok-A");
    expect(res.action).toBe("DREW_EXPLODING_KITTEN");
    expect("hasDefuse" in res && res.hasDefuse).toBe(true);
  });

  // UT-28 | FR-04-8: จั่ว EK + ไม่มี Defuse → hasDefuse = false
  it("UT-28 [FR-04-8]: จั่ว EK + ไม่มี Defuse → hasDefuse=false", async () => {
    buildDrawTx(["A", "EK"], ["AT", "SK"]); // no DF
    const res = await gameService.drawCard("123456", "tok-A");
    expect(res.action).toBe("DREW_EXPLODING_KITTEN");
    expect("hasDefuse" in res && res.hasDefuse).toBe(false);
  });

  // UT-26b | FR-04-4: deck ลดลง 1 ใบหลังจั่ว
  it("UT-26b [FR-04-4]: deck ลดลง 1 ใบ cards_remaining อัปเดต", async () => {
    const tx = buildDrawTx(["A", "B", "C"]);
    await gameService.drawCard("123456", "tok-A");
    const deckUpdate = tx.deckState.update.mock.calls[0][0];
    expect(deckUpdate.data.deck_order).toHaveLength(2);
    expect(deckUpdate.data.cards_remaining).toBe(2);
  });
});

// ================================================================
// 10. gameService.playCard()
// FR-05, NFR-02, S2-13/15
// ================================================================

describe("gameService.playCard() — FR-05/NFR-02 [S2-13/15]", () => {
  function buildPlayTx(handCards: string[], sessionOverride = {}) {
    const tx = makeTx();
    tx.room.findUnique.mockResolvedValue(makeRoom());
    tx.gameSession.findFirst.mockResolvedValue(makeSession(sessionOverride));
    tx.player.findFirst.mockResolvedValue({ ...pA });
    tx.cardHand.findUnique.mockResolvedValue(makeHand(handCards));
    tx.deckState.findUnique.mockResolvedValue(makeDeck([]));
    tx.deckState.update.mockResolvedValue({});
    tx.cardHand.update.mockResolvedValue({});
    tx.gameLog.create.mockResolvedValue({});
    tx.player.update.mockResolvedValue({});
    tx.player.findMany.mockResolvedValue([pA, pB]);
    tx.gameSession.update.mockResolvedValue(makeSession());
    mockApplyEffect.mockResolvedValue({
      effect: { type: "SKIP" },
      turnResult: {
        success: true, action: "TURN_ADVANCED",
        nextTurn: { player_id: "p-B", display_name: "Bob", turn_number: 2, pending_attacks: 0 },
      },
    });
    setupTx(tx);
    return tx;
  }

  // UT-29 | NFR-02: ไม่ใช่เทิร์นตัวเอง → throw BadRequestError
  it("UT-29 [NFR-02]: ไม่ใช่เทิร์นของผู้เล่น → throw BadRequestError 'It\\'s not your turn'", async () => {
    buildPlayTx(["SK"], { current_turn_player_id: "p-B" });
    await expect(gameService.playCard("123456", "tok-A", "SK"))
      .rejects.toThrow("It's not your turn");
  });

  // UT-30 | NFR-02: ไพ่ไม่อยู่ในมือ → throw BadRequestError
  it("UT-30 [NFR-02]: ไพ่ไม่อยู่ในมือ → throw BadRequestError 'Card not in hand'", async () => {
    buildPlayTx(["AT", "DF"]); // no SK
    await expect(gameService.playCard("123456", "tok-A", "SK"))
      .rejects.toThrow("Card not in hand");
  });

  // UT-31 | FR-05: room ไม่ active → throw BadRequestError
  it("UT-31 [FR-05]: room ไม่ได้ PLAYING → throw BadRequestError 'Game is not active'", async () => {
    const tx = makeTx();
    tx.room.findUnique.mockResolvedValue(makeRoom({ status: "WAITING" }));
    setupTx(tx);
    await expect(gameService.playCard("123456", "tok-A", "SK"))
      .rejects.toThrow("Game is not active");
  });

  // UT-32 | FR-05: เล่น SK สำเร็จ → action = ACTION_PENDING (Nope Window)
  // NOTE: real game.service.ts คืน ACTION_PENDING ไม่ใช่ CARD_PLAYED ทันที
  it("UT-32 [FR-05]: เล่น Skip สำเร็จ → action=ACTION_PENDING (Nope Window เปิด 3 วิ)", async () => {
    buildPlayTx(["SK", "DF"]);
    const res = await gameService.playCard("123456", "tok-A", "SK");
    expect(res.action).toBe("ACTION_PENDING");
    expect(res.success).toBe(true);
  });

  // UT-32b | FR-05: ไพ่ถูกลบออกจากมือ + เข้า discard pile
  it("UT-32b [FR-05]: ไพ่ที่เล่นถูกลบจากมือและเพิ่มเข้า discard pile", async () => {
    const tx = buildPlayTx(["SK", "AT", "DF"]);
    await gameService.playCard("123456", "tok-A", "SK");
    const handUpdate = tx.cardHand.update.mock.calls[0][0];
    expect(handUpdate.data.cards).not.toContain("SK");
    expect(handUpdate.data.cards).toContain("AT");
    const discardUpdate = tx.deckState.update.mock.calls[0][0];
    expect(discardUpdate.data.discard_pile).toContain("SK");
  });
});

// ================================================================
// 11. gameService.defuseCard()
// FR-04-7/9, S2-23
// ================================================================

describe("gameService.defuseCard() — FR-04-7/9 [S2-23]", () => {
  function buildDefuseTx(lastAction: string, hand = ["DF", "AT"]) {
    const tx = makeTx();
    tx.room.findUnique.mockResolvedValue(makeRoom());
    tx.gameSession.findFirst.mockResolvedValue(makeSession());
    tx.player.findFirst.mockResolvedValue({ ...pA });
    tx.gameLog.findFirst.mockResolvedValue({
      action_type: lastAction,
      action_details: { card: "EK" },
    });
    tx.cardHand.findUnique.mockResolvedValue(makeHand(hand));
    tx.cardHand.update.mockResolvedValue({});
    tx.gameLog.create.mockResolvedValue({});
    setupTx(tx);
    return tx;
  }

  // UT-33 | FR-04-7: ไม่ได้จั่ว EK มาก่อน → throw BadRequestError
  it("UT-33 [FR-04-7]: ไม่ได้จั่ว EK มาก่อน → throw BadRequestError 'No Exploding Kitten to defuse'", async () => {
    buildDefuseTx("DREW_CARD"); // wrong last action
    await expect(gameService.defuseCard("123456", "tok-A"))
      .rejects.toThrow("No Exploding Kitten to defuse");
  });

  // UT-34 | FR-04-7: ไม่มี Defuse ในมือ → throw BadRequestError
  it("UT-34 [FR-04-7]: ไม่มี Defuse ในมือ → throw BadRequestError 'No Defuse card'", async () => {
    buildDefuseTx("DREW_EXPLODING_KITTEN", ["AT", "SK"]); // no DF
    await expect(gameService.defuseCard("123456", "tok-A"))
      .rejects.toThrow("No Defuse card");
  });

  // UT-33b | FR-04-7: Defuse สำเร็จ → คืน WAITING_FOR_INSERT
  it("UT-33b [FR-04-7]: Defuse สำเร็จ → action=WAITING_FOR_INSERT", async () => {
    buildDefuseTx("DREW_EXPLODING_KITTEN", ["DF", "AT"]);
    const res = await gameService.defuseCard("123456", "tok-A");
    expect(res.action).toBe("WAITING_FOR_INSERT");
  });
});

// ================================================================
// 12. gameService.eliminatePlayer()
// FR-04-8, S2-25
// ================================================================

describe("gameService.eliminatePlayer() — FR-04-8 [S2-25]", () => {
  // UT-35 | FR-04-8: ไม่มี pending EK → throw BadRequestError
  it("UT-35 [FR-04-8]: ไม่มี pending EK → throw BadRequestError 'No pending Exploding Kitten'", async () => {
    const tx = makeTx();
    tx.gameSession.findFirst.mockResolvedValue(makeSession());
    tx.player.findFirst.mockResolvedValue({ ...pA });
    tx.gameLog.findFirst.mockResolvedValue({
      action_type: "DREW_CARD", // wrong — not EK
      action_details: { card: "AT" },
    });
    setupTx(tx);
    await expect(gameService.eliminatePlayer("123456", "tok-A"))
      .rejects.toThrow("No pending Exploding Kitten");
  });

  // UT-35b | FR-04-8: eliminate สำเร็จ → is_alive=false
  it("UT-35b [FR-04-8]: eliminate สำเร็จ → player ถูกตั้ง is_alive=false", async () => {
    const tx = makeTx();
    tx.gameSession.findFirst.mockResolvedValue(makeSession());
    tx.player.findFirst.mockResolvedValue({ ...pA });
    tx.gameLog.findFirst.mockResolvedValue({
      action_type: "DREW_EXPLODING_KITTEN",
      action_details: { card: "EK" },
    });
    tx.player.update.mockResolvedValue({});
    tx.gameLog.create.mockResolvedValue({});
    tx.player.findMany.mockResolvedValue([pB]); // pB wins
    tx.gameSession.update.mockResolvedValue({});
    tx.room.update.mockResolvedValue({});
    tx.player.updateMany.mockResolvedValue({});
    setupTx(tx);
    await gameService.eliminatePlayer("123456", "tok-A");
    const playerUpdate = (tx.player.update.mock.calls as Array<[{ data: { is_alive?: boolean } }]>)
      .find(c => c[0]?.data?.is_alive === false);
    expect(playerUpdate).toBeDefined();
  });
});

// ================================================================
// 13. gameService.checkWinner()
// FR-04-5, FR-08-1/2/3/5, S2-27/28/29
// ================================================================

describe("gameService.checkWinner() — FR-04-5/FR-08 [S2-27/28/29]", () => {
  const session = makeSession();
  const winner = { ...pB, player_token: "tok-W" };

  function buildWinnerTx(alivePlayers: ReturnType<typeof makePlayer>[]) {
    const tx = makeTx();
    tx.player.findMany.mockResolvedValue(alivePlayers);
    tx.gameSession.update.mockResolvedValue({});
    tx.room.update.mockResolvedValue({});
    tx.player.updateMany.mockResolvedValue({});
    tx.gameLog.create.mockResolvedValue({});
    setupTx(tx);
    return tx;
  }

  // UT-36 | FR-08-1/5: เหลือ 1 คน → GAME_OVER + Room = WAITING อัตโนมัติ
  it("UT-36 [FR-08-1/5]: เหลือ 1 คน → action=GAME_OVER, room รีเซ็ต WAITING", async () => {
    const tx = buildWinnerTx([winner]);
    const res = await gameService.checkWinner(tx as never, session, "123456", "p-A", "EK");
    expect(res.action).toBe("GAME_OVER");
    expect(tx.room.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "WAITING" }) })
    );
  });

  // UT-36b | FR-08-7: reset ผู้เล่นทุกคน is_alive=true, afk_count=0
  it("UT-36b [FR-08-7]: รีเซ็ตผู้เล่นทุกคน is_alive=true และ afk_count=0", async () => {
    const tx = buildWinnerTx([winner]);
    await gameService.checkWinner(tx as never, session, "123456", "p-A", "EK");
    expect(tx.player.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ is_alive: true, afk_count: 0 }) })
    );
  });

  // UT-37 | FR-08-2/3: บันทึก last_winner_token สำหรับรอบถัดไป
  it("UT-37 [FR-08-2/3]: บันทึก last_winner_token เพื่อให้ winner เริ่มก่อนรอบถัดไป", async () => {
    const tx = buildWinnerTx([winner]);
    await gameService.checkWinner(tx as never, session, "123456", "p-A", "EK");
    expect(tx.room.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ last_winner_token: "tok-W" }) })
    );
  });

  // UT-37b | FR-08-2: บันทึก winner_player_id + status=FINISHED ใน GameSession
  it("UT-37b [FR-08-2]: บันทึก winner_player_id และ status=FINISHED ใน GameSession", async () => {
    const tx = buildWinnerTx([winner]);
    await gameService.checkWinner(tx as never, session, "123456", "p-A", "EK");
    expect(tx.gameSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ winner_player_id: "p-B", status: "FINISHED" })
      })
    );
  });

  // UT-36c | FR-04-5: เหลือ 2+ คน → TURN_ADVANCED (ไม่ใช่ GAME_OVER)
  it("UT-36c [FR-04-5]: เหลือ 2+ คน → action=TURN_ADVANCED ไม่ใช่ GAME_OVER", async () => {
    const tx = buildWinnerTx([winner, pA]);
    const res = await gameService.checkWinner(tx as never, session, "123456", "p-A", "EK");
    expect(res.action).toBe("TURN_ADVANCED");
  });
});