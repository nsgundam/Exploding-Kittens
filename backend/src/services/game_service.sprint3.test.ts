/**
 * ============================================================
 * game_service.sprint3.test.ts
 * Place at: backend/src/services/game_service.sprint3.test.ts
 *
 * Structure assumed:
 *   backend/
 *   ├── src/
 *   │   ├── config/prisma.ts
 *   │   ├── services/game_service.ts
 *   │   ├── services/effects/index.ts
 *   │   ├── constants/game.ts
 *   │   ├── types/types.ts
 *   │   └── utils/errors.ts
 *   ├── test/
 *   │   └── game_service.sprint3.test.ts   ← THIS FILE
 *   └── jest.config.js
 *
 * Run: npx jest --testPathPattern=game_service.sprint3 --coverage
 *
 * TRACEABILITY MATRIX
 * ─────────────────────────────────────────────────────────────
 * Suite                       FR Ref              Ticket
 * ─────────────────────────────────────────────────────────────
 * gameService.nopeCard        FR-05-N1/N4         S3-04/05/06
 * gameService.favorCard       FR-05-FV            S3-02/24/25
 * gameService.favorResponse   FR-05-FV            S3-02
 * gameService.comboCard       FR-05-C1/C2/C4      S3-07/08/09
 * gameService.drawCard        FR-04-4/6/7/8,      S2-19, S3-10
 *                             FR-05-A1/A2
 * gameService.handleAFK       FR-10-1/3/4         S3-19/21
 * gameService.advanceTurn     FR-04-3, FR-05-A3   S2-09/12, S3-11
 * gameService.checkWinner     FR-04-5, FR-08-1/2  S2-26/27/28/29
 *                             /3/5/7
 * gameService.playCard        FR-05, NFR-02       S2-13
 * ─────────────────────────────────────────────────────────────
 */

// ── jest.mock must come before any import ─────────────────────
jest.mock("../config/prisma", () => ({
  prisma: { $transaction: jest.fn() },
}));

jest.mock("./effects/index", () => ({
  applyCardEffect: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────
import { gameService } from "./game.service";
import { prisma } from "../config/prisma";
import { applyCardEffect } from "./effects/index";

const mockTransaction = prisma.$transaction as jest.Mock;
const mockApplyEffect = applyCardEffect as jest.MockedFunction<typeof applyCardEffect>;

// ── Mock Prisma transaction factory ───────────────────────────
// Each test gets a fresh tx — no state bleed between tests
function makeTx() {
  return {
    player:      { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    gameSession: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    cardHand:    { findUnique: jest.fn(), update: jest.fn(), createMany: jest.fn(), findMany: jest.fn() },
    deckState:   { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    gameLog:     { create: jest.fn(), findFirst: jest.fn() },
    room:        { findUnique: jest.fn(), update: jest.fn() },
    cardMaster:  { findMany: jest.fn() },
  };
}

function setupTx(tx: ReturnType<typeof makeTx>) {
  mockTransaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(tx));
}

// ── Test data factories ───────────────────────────────────────
const makeSession = (o: Record<string, unknown> = {}) => ({
  session_id: "sess-1", room_id: "room-1", status: "IN_PROGRESS",
  current_turn_player_id: "p-A", turn_number: 3, direction: 1, pending_attacks: 0, ...o,
});

const makePlayer = (o: Record<string, unknown> = {}) => ({
  player_id: "p-A", room_id: "room-1", player_token: "tok-A", display_name: "Alice",
  seat_number: 1, role: "PLAYER", is_alive: true, afk_count: 0, ...o,
});

const makeRoom = (o: Record<string, unknown> = {}) => ({
  room_id: "room-1", status: "PLAYING", host_token: "tok-A", last_winner_token: null,
  deck_config: { card_version: "classic", expansions: [] }, ...o,
});

const makeHand = (cards: string[], pid = "p-A") => ({
  player_id: pid, session_id: "sess-1", cards, card_count: cards.length,
});

const makeDeck = (deck: string[], discard: string[] = []) => ({
  session_id: "sess-1", deck_order: deck, discard_pile: discard, cards_remaining: deck.length,
});

// Shared player fixtures
const pA = makePlayer({ player_id: "p-A", player_token: "tok-A", seat_number: 1 });
const pB = makePlayer({ player_id: "p-B", player_token: "tok-B", seat_number: 2 });
const pC = makePlayer({ player_id: "p-C", player_token: "tok-C", seat_number: 3 });

beforeEach(() => jest.clearAllMocks());

// ================================================================
// 1. gameService.playNope()
// FR-05-N1/N4 → S3-04, S3-05, S3-06
// ================================================================

describe("gameService.playNope() — FR-05-N1/N4 [S3-04/05/06]", () => {
  function buildNopeTx(cards = ["NP", "AT"]) {
    const tx = makeTx();
    tx.gameSession.findFirst.mockResolvedValue(makeSession());
    tx.player.findFirst.mockResolvedValue({ ...pB });
    tx.cardHand.findUnique.mockResolvedValue(makeHand(cards, "p-B"));
    tx.deckState.findUnique.mockResolvedValue(makeDeck(["X"]));
    tx.deckState.update.mockResolvedValue({});
    tx.cardHand.update.mockResolvedValue({});
    tx.gameLog.create.mockResolvedValue({});
    setupTx(tx);
    return tx;
  }

  it("TC-01 [FR-05-N4]: nopeCount 0→1 (คี่) — ยกเลิก action", async () => {
    buildNopeTx();
    const res = await gameService.playNope("room-1", "tok-B", 0);
    expect(res.action).toBe("NOPE_PLAYED");
    expect(res.nopeCount).toBe(1);
    expect(res.isCancel).toBe(true);
  });

  it("TC-02 [FR-05-N4]: nopeCount 1→2 (คู่) — action ผ่านได้", async () => {
    buildNopeTx();
    const res = await gameService.playNope("room-1", "tok-B", 1);
    expect(res.nopeCount).toBe(2);
    expect(res.isCancel).toBe(false);
  });

  it("TC-03 [FR-05-N4]: nopeCount 2→3 (คี่) — ยกเลิก action อีกครั้ง", async () => {
    buildNopeTx();
    const res = await gameService.playNope("room-1", "tok-B", 2);
    expect(res.nopeCount).toBe(3);
    expect(res.isCancel).toBe(true);
  });

  it("TC-04 [FR-05-N4]: ลบไพ่ NP ออกจากมือ 1 ใบ การ์ดอื่นยังอยู่ครบ", async () => {
    const tx = buildNopeTx(["NP", "AT", "SK"]);
    await gameService.playNope("room-1", "tok-B", 0);
    const update = tx.cardHand.update.mock.calls[0][0];
    expect(update.data.cards).not.toContain("NP");
    expect(update.data.cards).toContain("AT");
    expect(update.data.cards).toContain("SK");
    expect(update.data.card_count).toBe(2);
  });

  it("TC-05 [FR-05-N4]: NP ถูกเพิ่มต่อท้าย discard pile", async () => {
    const tx = buildNopeTx();
    tx.deckState.findUnique.mockResolvedValue(makeDeck(["X"], ["AT"]));
    await gameService.playNope("room-1", "tok-B", 0);
    const discard = tx.deckState.update.mock.calls[0][0].data.discard_pile as string[];
    expect(discard).toContain("AT");
    expect(discard).toContain("NP");
  });

  it("TC-06 [FR-05-N1]: ใช้ GVE_NP เมื่อผู้เล่นมี GVE_NP แทน NP", async () => {
    const tx = buildNopeTx(["GVE_NP", "AT"]);
    await gameService.playNope("room-1", "tok-B", 0);
    expect(tx.cardHand.update.mock.calls[0][0].data.cards).not.toContain("GVE_NP");
    expect(tx.deckState.update.mock.calls[0][0].data.discard_pile).toContain("GVE_NP");
  });

  it("TC-07 [FR-05-N4]: คืนค่า playedBy และ playedByDisplayName ที่ถูกต้อง", async () => {
    buildNopeTx();
    const res = await gameService.playNope("room-1", "tok-B", 0);
    expect(res.playedBy).toBe("p-B");
    expect(res.playedByDisplayName).toBe("Alice");
  });

  it("TC-08 [NFR-02]: throw error เมื่อผู้เล่นไม่มีไพ่ Nope ในมือ", async () => {
    buildNopeTx(["AT", "SK"]);
    await expect(gameService.playNope("room-1", "tok-B", 0))
      .rejects.toThrow("No Nope card in hand");
  });

  it("TC-09 [NFR-02]: throw error เมื่อไม่มี game session ที่กำลังเล่นอยู่", async () => {
    const tx = makeTx();
    tx.gameSession.findFirst.mockResolvedValue(null);
    setupTx(tx);
    await expect(gameService.playNope("room-1", "tok-B", 0))
      .rejects.toThrow("No active session");
  });

  it("TC-10 [NFR-02]: throw error เมื่อหาผู้เล่นไม่พบ", async () => {
    const tx = makeTx();
    tx.gameSession.findFirst.mockResolvedValue(makeSession());
    tx.player.findFirst.mockResolvedValue(null);
    setupTx(tx);
    await expect(gameService.playNope("room-1", "tok-X", 0)).rejects.toThrow("Player");
  });
});

// ================================================================
// 2. gameService.favorCard()
// FR-05-FV → S3-02, S3-24, S3-25
// ================================================================

describe("gameService.favorCard() — FR-05-FV [S3-02/24/25]", () => {
  function buildFavorTx(requesterCards = ["FV", "SK"], targetCards = ["AT", "NP"]) {
    const tx = makeTx();
    tx.gameSession.findFirst.mockResolvedValue(makeSession({ current_turn_player_id: "p-A" }));
    tx.player.findFirst
      .mockResolvedValueOnce({ ...pA })
      .mockResolvedValueOnce({ ...pB });
    tx.cardHand.findUnique
      .mockResolvedValueOnce(makeHand(targetCards, "p-B"))
      .mockResolvedValueOnce(makeHand(requesterCards, "p-A"));
    tx.deckState.findUnique.mockResolvedValue(makeDeck([]));
    tx.deckState.update.mockResolvedValue({});
    tx.cardHand.update.mockResolvedValue({});
    tx.gameLog.create.mockResolvedValue({});
    setupTx(tx);
    return tx;
  }

  it("TC-11 [FR-05-FV]: ลบไพ่ FV ออกจากมือผู้เล่น การ์ดอื่นยังอยู่ครบ", async () => {
    const tx = buildFavorTx();
    await gameService.favorCard("room-1", "tok-A", "tok-B");
    const update = tx.cardHand.update.mock.calls[0][0];
    expect(update.data.cards).not.toContain("FV");
    expect(update.data.cards).toContain("SK");
  });

  it("TC-12 [FR-05-FV]: FV ถูกเพิ่มเข้า discard pile", async () => {
    const tx = buildFavorTx();
    await gameService.favorCard("room-1", "tok-A", "tok-B");
    expect(tx.deckState.update.mock.calls[0][0].data.discard_pile).toContain("FV");
  });

  it("TC-13 [FR-05-FV]: คืน FAVOR_PENDING พร้อมข้อมูล requester, target, จำนวนไพ่ถูกต้อง", async () => {
    buildFavorTx();
    const res = await gameService.favorCard("room-1", "tok-A", "tok-B");
    expect(res.action).toBe("FAVOR_PENDING");
    expect(res.requesterId).toBe("p-A");
    expect(res.targetId).toBe("p-B");
    expect(res.targetCardCount).toBe(2);
  });

  it("TC-14 [FR-05-FV]: ใช้ GVE_FV เมื่อผู้เล่นมี GVE_FV", async () => {
    const tx = buildFavorTx(["GVE_FV", "AT"]);
    await gameService.favorCard("room-1", "tok-A", "tok-B");
    expect(tx.cardHand.update.mock.calls[0][0].data.cards).not.toContain("GVE_FV");
    expect(tx.deckState.update.mock.calls[0][0].data.discard_pile).toContain("GVE_FV");
  });

  it("TC-15 [NFR-02]: throw error เมื่อผู้เล่นเลือกตัวเองเป็น target", async () => {
    const tx = makeTx();
    tx.gameSession.findFirst.mockResolvedValue(makeSession());
    tx.player.findFirst.mockResolvedValue({ ...pA });
    setupTx(tx);
    await expect(gameService.favorCard("room-1", "tok-A", "tok-A"))
      .rejects.toThrow("Cannot target yourself");
  });

  it("TC-16 [NFR-02]: throw error เมื่อ target ไม่มีไพ่ในมือ", async () => {
    buildFavorTx(["FV"], []);
    await expect(gameService.favorCard("room-1", "tok-A", "tok-B"))
      .rejects.toThrow("Target has no cards to give");
  });

  it("TC-17 [NFR-02]: throw error เมื่อผู้เล่นไม่มีไพ่ Favor ในมือ", async () => {
    buildFavorTx(["AT", "SK"]);
    await expect(gameService.favorCard("room-1", "tok-A", "tok-B"))
      .rejects.toThrow("No Favor card in hand");
  });

  it("TC-18 [NFR-02]: throw error เมื่อไม่ใช่เทิร์นของผู้เล่น", async () => {
    const tx = makeTx();
    tx.gameSession.findFirst.mockResolvedValue(makeSession({ current_turn_player_id: "p-B" }));
    tx.player.findFirst.mockResolvedValue({ ...pA });
    setupTx(tx);
    await expect(gameService.favorCard("room-1", "tok-A", "tok-B"))
      .rejects.toThrow("It's not your turn");
  });
});

// ================================================================
// 3. gameService.favorResponse()
// FR-05-FV (target เลือกไพ่เอง) → S3-02
// ================================================================

describe("gameService.favorResponse() — FR-05-FV [S3-02]", () => {
  function buildResponseTx(targetCards = ["SK", "AT", "NP"], requesterCards = ["DF"]) {
    const tx = makeTx();
    tx.gameSession.findFirst.mockResolvedValue(makeSession());
    tx.player.findFirst
      .mockResolvedValueOnce({ ...pB })
      .mockResolvedValueOnce({ ...pA });
    tx.gameLog.findFirst.mockResolvedValue({
      player_id: "p-A", action_type: "PLAY_CARD",
      action_details: { effect: "FAVOR_PENDING" },
    });
    tx.cardHand.findUnique
      .mockResolvedValueOnce(makeHand(targetCards, "p-B"))
      .mockResolvedValueOnce(makeHand(requesterCards, "p-A"));
    tx.cardHand.update.mockResolvedValue({});
    tx.gameLog.create.mockResolvedValue({});
    setupTx(tx);
    return tx;
  }

  it("TC-19 [FR-05-FV]: target เลือกไพ่เอง — wasRandom=false, ไพ่ที่โอนตรงกัน", async () => {
    buildResponseTx();
    const res = await gameService.favorResponse("room-1", "tok-B", "SK");
    expect(res.transferredCard).toBe("SK");
    expect(res.wasRandom).toBe(false);
  });

  it("TC-20 [FR-05-FV]: ไม่ระบุ cardCode — wasRandom=true, สุ่มไพ่จากมือ target", async () => {
    buildResponseTx();
    const res = await gameService.favorResponse("room-1", "tok-B");
    expect(res.wasRandom).toBe(true);
    expect(["SK", "AT", "NP"]).toContain(res.transferredCard);
  });

  it("TC-21 [FR-05-FV]: ไพ่ที่เลือกถูกลบจากมือ target การ์ดอื่นยังอยู่ครบ", async () => {
    const tx = buildResponseTx();
    await gameService.favorResponse("room-1", "tok-B", "AT");
    const targetUpdate = tx.cardHand.update.mock.calls[0][0];
    expect(targetUpdate.data.cards).not.toContain("AT");
    expect(targetUpdate.data.cards).toContain("SK");
    expect(targetUpdate.data.cards).toContain("NP");
  });

  it("TC-22 [FR-05-FV]: ไพ่ที่เลือกถูกเพิ่มเข้ามือ requester", async () => {
    const tx = buildResponseTx();
    await gameService.favorResponse("room-1", "tok-B", "AT");
    const requesterUpdate = tx.cardHand.update.mock.calls[1][0];
    expect(requesterUpdate.data.cards).toContain("AT");
    expect(requesterUpdate.data.cards).toContain("DF");
  });

  it("TC-23 [NFR-02]: throw error เมื่อไพ่ที่ขอไม่อยู่ในมือ target", async () => {
    buildResponseTx(["SK"]);
    await expect(gameService.favorResponse("room-1", "tok-B", "NP"))
      .rejects.toThrow("Card not in target's hand");
  });

  it("TC-24 [FR-05-FV]: เทิร์นยังเป็นของ requester — ต้องจั่วไพ่ต่อ", async () => {
    buildResponseTx();
    const res = await gameService.favorResponse("room-1", "tok-B", "SK");
    expect(res.nextTurn.player_id).toBe("p-A");
  });
});

// ================================================================
// 4. gameService.comboCard()
// FR-05-C1/C2/C3/C4, NFR-02/03 → S3-07, S3-08, S3-09
// ================================================================

describe("gameService.comboCard() — FR-05-C1/C2 [S3-07/08/09]", () => {
  function buildComboTx(playerCards: string[], targetCards: string[]) {
    const tx = makeTx();
    tx.gameSession.findFirst.mockResolvedValue(makeSession());
    tx.player.findFirst
      .mockResolvedValueOnce({ ...pA })
      .mockResolvedValueOnce({ ...pB });
    tx.cardHand.findUnique
      .mockResolvedValueOnce(makeHand(playerCards, "p-A"))
      .mockResolvedValueOnce(makeHand(targetCards, "p-B"))
      .mockResolvedValueOnce(makeHand(playerCards, "p-A")); // thief final read
    tx.deckState.findUnique.mockResolvedValue(makeDeck([]));
    tx.deckState.update.mockResolvedValue({});
    tx.cardHand.update.mockResolvedValue({});
    tx.gameLog.create.mockResolvedValue({});
    tx.player.findMany.mockResolvedValue([pA, pB]);
    tx.gameSession.update.mockResolvedValue(makeSession());
    setupTx(tx);
    return tx;
  }

  it("TC-25 [FR-05-C1]: Combo 2x คืน ACTION_PENDING รอ Nope Window ก่อนขโมย", async () => {
    buildComboTx(["CAT_TACO", "CAT_TACO", "DF"], ["SK", "AT", "NP"]);
    const res = await gameService.comboCard("room-1", "tok-A", ["CAT_TACO", "CAT_TACO"], "tok-B");
    expect(res.success).toBe(true);
    expect(res.action).toBe("ACTION_PENDING");
  });

  it("TC-26 [FR-05-C1]: Combo 2x — ไพ่ combo ถูกลบออกจากมือก่อน Nope Window", async () => {
    const tx = buildComboTx(["CAT_TACO", "CAT_TACO", "DF"], ["EK", "DF", "SK"]);
    await gameService.comboCard("room-1", "tok-A", ["CAT_TACO", "CAT_TACO"], "tok-B");
    // combo cards go to discard even before Nope Window resolves
    const discard = tx.deckState.update.mock.calls[0][0].data.discard_pile as string[];
    expect(discard).toContain("CAT_TACO");
  });

  it("TC-27 [FR-05-C2]: Combo 3x คืน ACTION_PENDING พร้อม comboType=THREE_CARD", async () => {
    buildComboTx(["CAT_TACO", "CAT_TACO", "CAT_TACO", "DF"], ["SK", "AT", "NP"]);
    const res = await gameService.comboCard(
      "room-1", "tok-A", ["CAT_TACO", "CAT_TACO", "CAT_TACO"], "tok-B", "AT"
    );
    expect(res.success).toBe(true);
    expect(res.action).toBe("ACTION_PENDING");
    expect(res.comboType).toBe("THREE_CARD");
  });

  it("TC-28 [FR-05-C2]: Combo 3x ระบุไพ่ที่ต้องการ — เก็บไว้ใน pending action", async () => {
    buildComboTx(["CAT_TACO", "CAT_TACO", "CAT_TACO"], ["SK", "AT"]);
    const res = await gameService.comboCard(
      "room-1", "tok-A", ["CAT_TACO", "CAT_TACO", "CAT_TACO"], "tok-B", "AT"
    );
    expect(res.action).toBe("ACTION_PENDING");
    expect(res.comboType).toBe("THREE_CARD");
  });

  it("TC-29 [FR-05-C1]: ไพ่ combo ทุกใบถูกย้ายเข้า discard pile", async () => {
    const tx = buildComboTx(["CAT_TACO", "CAT_TACO", "DF"], ["SK"]);
    await gameService.comboCard("room-1", "tok-A", ["CAT_TACO", "CAT_TACO"], "tok-B");
    const discarded = tx.deckState.update.mock.calls[0][0].data.discard_pile as string[];
    expect(discarded.filter((c: string) => c === "CAT_TACO")).toHaveLength(2);
  });

  it("TC-30 [FR-05-C1]: ไม่เปลี่ยนเทิร์น — คืน ACTION_PENDING ยังไม่มี nextTurn", async () => {
    buildComboTx(["CAT_TACO", "CAT_TACO", "DF"], ["SK"]);
    const res = await gameService.comboCard("room-1", "tok-A", ["CAT_TACO", "CAT_TACO"], "tok-B");
    expect(res.action).toBe("ACTION_PENDING");
    // turn not advanced yet — waits for Nope Window to resolve
    expect(res.nextTurn).toBeUndefined();
  });

  it("TC-31 [NFR-03]: pending_action มี comboType และ target สำหรับ socket routing", async () => {
    buildComboTx(["CAT_TACO", "CAT_TACO", "DF"], ["SK", "AT"]);
    const res = await gameService.comboCard("room-1", "tok-A", ["CAT_TACO", "CAT_TACO"], "tok-B");
    expect(res.action).toBe("ACTION_PENDING");
    expect(res.comboType).toBe("TWO_CARD");
    expect(res.playedBy).toBe("p-A");
  });

  it("TC-32 [FR-05-C4]: Feral Cat ใช้แทนไพ่แมวใบอื่นใน combo ได้", async () => {
    buildComboTx(["CAT_TACO", "FC", "DF"], ["AT"]);
    const res = await gameService.comboCard("room-1", "tok-A", ["CAT_TACO", "FC"], "tok-B");
    expect(res.success).toBe(true);
  });

  it("TC-33 [NFR-02]: throw error เมื่อเลือกตัวเองเป็น target", async () => {
    const tx = makeTx();
    tx.gameSession.findFirst.mockResolvedValue(makeSession());
    tx.player.findFirst.mockResolvedValue({ ...pA });
    setupTx(tx);
    await expect(
      gameService.comboCard("room-1", "tok-A", ["CAT_TACO", "CAT_TACO"], "tok-A")
    ).rejects.toThrow("Cannot target yourself");
  });

  it("TC-34 [NFR-02]: throw error เมื่อไพ่ combo ไม่ครบในมือ", async () => {
    buildComboTx(["CAT_TACO", "DF"], ["SK"]); // only 1 CAT_TACO
    await expect(
      gameService.comboCard("room-1", "tok-A", ["CAT_TACO", "CAT_TACO"], "tok-B")
    ).rejects.toThrow("Card CAT_TACO not in hand");
  });

  it("TC-35 [NFR-02]: throw error เมื่อ target ไม่มีไพ่ให้ขโมย", async () => {
    buildComboTx(["CAT_TACO", "CAT_TACO"], []);
    await expect(
      gameService.comboCard("room-1", "tok-A", ["CAT_TACO", "CAT_TACO"], "tok-B")
    ).rejects.toThrow("Target player has no cards");
  });
});

// ================================================================
// 5. gameService.drawCard()
// FR-04-4/6/7/8, FR-05-A1/A2 → S2-19, S3-10
// ================================================================

describe("gameService.drawCard() — FR-04-4/6/7/8, FR-05-A1/A2 [S2-19/S3-10]", () => {
  function buildDrawTx(pending = 0, deck = ["A", "B", "TOP"]) {
    const tx = makeTx();
    tx.room.findUnique.mockResolvedValue(makeRoom());
    tx.gameSession.findFirst.mockResolvedValue(makeSession({ pending_attacks: pending }));
    tx.player.findFirst.mockResolvedValue({ ...pA });
    tx.deckState.findUnique.mockResolvedValue(makeDeck(deck));
    tx.deckState.update.mockResolvedValue({});
    tx.cardHand.findUnique.mockResolvedValue(makeHand(["DF"]));
    tx.cardHand.update.mockResolvedValue({});
    tx.gameLog.create.mockResolvedValue({});
    tx.player.findMany.mockResolvedValue([pA, pB]);
    tx.gameSession.update.mockResolvedValue(makeSession());
    tx.player.update.mockResolvedValue({});
    setupTx(tx);
    return tx;
  }

  it("TC-36 [FR-04-4]: จั่วไพ่บนสุดของกอง (element สุดท้ายของ array)", async () => {
    buildDrawTx(0, ["A", "B", "TOP_CARD"]);
    const res = await gameService.drawCard("room-1", "tok-A");
    expect(res.drawnCard).toBe("TOP_CARD");
  });

  it("TC-37 [FR-04-4]: กองไพ่ลดลง 1 ใบ cards_remaining ลดตาม", async () => {
    const tx = buildDrawTx(0, ["A", "B", "C"]);
    await gameService.drawCard("room-1", "tok-A");
    const deckUpdate = tx.deckState.update.mock.calls[0][0];
    expect(deckUpdate.data.deck_order).toHaveLength(2);
    expect(deckUpdate.data.cards_remaining).toBe(2);
  });

  it("TC-38 [FR-04-4]: ไพ่ที่จั่วได้ถูกเพิ่มเข้ามือผู้เล่น ไพ่เดิมยังอยู่ครบ", async () => {
    const tx = buildDrawTx(0, ["A", "DRAWN"]);
    await gameService.drawCard("room-1", "tok-A");
    const handUpdate = tx.cardHand.update.mock.calls[0][0];
    expect(handUpdate.data.cards).toContain("DRAWN");
    expect(handUpdate.data.cards).toContain("DF");
  });

  it("TC-39 [FR-05-A1]: pending=0 — เปลี่ยนเทิร์นไปผู้เล่นถัดไป", async () => {
    buildDrawTx(0);
    const res = await gameService.drawCard("room-1", "tok-A");
    expect(res.nextTurn?.player_id).toBe("p-B");
  });

  it("TC-40 [FR-05-A2]: pending=3 — ผู้เล่นเดิม pending ลดเป็น 2", async () => {
    buildDrawTx(3);
    const res = await gameService.drawCard("room-1", "tok-A");
    expect(res.nextTurn?.player_id).toBe("p-A");
    expect(res.nextTurn?.pending_attacks).toBe(2);
  });

  it("TC-41 [FR-05-A2]: pending=2 — ผู้เล่นเดิม pending ลดเป็น 1", async () => {
    buildDrawTx(2);
    const res = await gameService.drawCard("room-1", "tok-A");
    expect(res.nextTurn?.player_id).toBe("p-A");
    expect(res.nextTurn?.pending_attacks).toBe(1);
  });

  it("TC-42 [FR-05-A1]: pending=1 — เทิร์นสุดท้าย เปลี่ยนผู้เล่น pending=0", async () => {
    buildDrawTx(1);
    const res = await gameService.drawCard("room-1", "tok-A");
    expect(res.nextTurn?.player_id).toBe("p-B");
    expect(res.nextTurn?.pending_attacks).toBe(0);
  });

  it("TC-43 [FR-04-6]: จั่วได้ EK คืน action DREW_EXPLODING_KITTEN", async () => {
    buildDrawTx(0, ["A", "EK"]);
    const res = await gameService.drawCard("room-1", "tok-A");
    expect(res.action).toBe("DREW_EXPLODING_KITTEN");
    expect("drawnCard" in res && res.drawnCard).toBe("EK");
  });

  it("TC-44 [FR-04-7]: hasDefuse=true เมื่อผู้เล่นมีไพ่ Defuse ในมือ", async () => {
    const tx = makeTx();
    tx.room.findUnique.mockResolvedValue(makeRoom());
    tx.gameSession.findFirst.mockResolvedValue(makeSession());
    tx.player.findFirst.mockResolvedValue({ ...pA });
    tx.deckState.findUnique.mockResolvedValue(makeDeck(["EK"]));
    tx.deckState.update.mockResolvedValue({});
    tx.cardHand.findUnique.mockResolvedValue(makeHand(["DF", "AT"]));
    tx.gameLog.create.mockResolvedValue({});
    tx.player.update.mockResolvedValue({});
    setupTx(tx);
    const res = await gameService.drawCard("room-1", "tok-A");
    expect("hasDefuse" in res && res.hasDefuse).toBe(true);
  });

  it("TC-45 [FR-04-8]: hasDefuse=false เมื่อผู้เล่นไม่มีไพ่ Defuse", async () => {
    const tx = makeTx();
    tx.room.findUnique.mockResolvedValue(makeRoom());
    tx.gameSession.findFirst.mockResolvedValue(makeSession());
    tx.player.findFirst.mockResolvedValue({ ...pA });
    tx.deckState.findUnique.mockResolvedValue(makeDeck(["EK"]));
    tx.deckState.update.mockResolvedValue({});
    tx.cardHand.findUnique.mockResolvedValue(makeHand(["AT", "SK"]));
    tx.gameLog.create.mockResolvedValue({});
    tx.player.update.mockResolvedValue({});
    setupTx(tx);
    const res = await gameService.drawCard("room-1", "tok-A");
    expect("hasDefuse" in res && res.hasDefuse).toBe(false);
  });

  it("TC-46 [FR-04-4c]: จั่วไพ่ manual รีเซ็ต afk_count เป็น 0", async () => {
    const tx = buildDrawTx(0);
    tx.player.findFirst.mockResolvedValue(makePlayer({ afk_count: 1 }));
    await gameService.drawCard("room-1", "tok-A", false);
    const afkReset = (tx.player.update.mock.calls as Array<[{ data: { afk_count?: number } }]>)
      .find((c) => c[0]?.data?.afk_count === 0);
    expect(afkReset).toBeDefined();
  });

  it("TC-47 [NFR-02]: throw error เมื่อไม่ใช่เทิร์นของผู้เล่น", async () => {
    const tx = makeTx();
    tx.room.findUnique.mockResolvedValue(makeRoom());
    tx.gameSession.findFirst.mockResolvedValue(makeSession({ current_turn_player_id: "p-B" }));
    tx.player.findFirst.mockResolvedValue({ ...pA });
    setupTx(tx);
    await expect(gameService.drawCard("room-1", "tok-A")).rejects.toThrow("It's not your turn");
  });

  it("TC-48 [NFR-02]: throw error เมื่อห้องไม่ได้อยู่ใน status PLAYING", async () => {
    const tx = makeTx();
    tx.room.findUnique.mockResolvedValue(makeRoom({ status: "WAITING" }));
    setupTx(tx);
    await expect(gameService.drawCard("room-1", "tok-A")).rejects.toThrow("Game is not active");
  });
});

// ================================================================
// 6. gameService.handleAFK()
// FR-10-1/3/4 → S3-19, S3-21
// ================================================================

describe("gameService.handleAFK() — FR-10-1/3/4 [S3-19/21]", () => {
  const session = makeSession();

  it("TC-49 [FR-10-3]: เพิ่ม afk_count ขึ้น 1", async () => {
    const player = makePlayer({ afk_count: 0 });
    const tx = makeTx();
    tx.player.update.mockResolvedValue({});
    tx.player.findMany.mockResolvedValue([player, pB]);
    tx.gameSession.update.mockResolvedValue({});
    tx.gameLog.create.mockResolvedValue({});
    await gameService.handleAFK(tx as never, session, player, "room-1");
    expect(tx.player.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { afk_count: 1 } })
    );
  });

  it("TC-50 [FR-10-4]: ตั้ง is_alive=false และ role=SPECTATOR เมื่อ afk_count ครบ 2", async () => {
    const player = makePlayer({ afk_count: 1 });
    const tx = makeTx();
    tx.player.update.mockResolvedValue({});
    tx.player.findMany.mockResolvedValue([pB]);
    tx.gameSession.update.mockResolvedValue({});
    tx.room.update.mockResolvedValue({});
    tx.player.updateMany.mockResolvedValue({});
    tx.gameLog.create.mockResolvedValue({});
    await gameService.handleAFK(tx as never, session, player, "room-1");
    const kickCall = (tx.player.update.mock.calls as Array<[{ data: { is_alive?: boolean; role?: string } }]>)
      .find((c) => c[0]?.data?.is_alive === false);
    expect(kickCall).toBeDefined();
    expect(kickCall![0].data.role).toBe("SPECTATOR");
  });

  it("TC-51 [FR-10-4]: คืน null เมื่อ AFK ครั้งแรก — ยังไม่ถึงเกณฑ์เตะออก", async () => {
    const player = makePlayer({ afk_count: 0 });
    const tx = makeTx();
    tx.player.update.mockResolvedValue({});
    tx.player.findMany.mockResolvedValue([player, pB]);
    tx.gameSession.update.mockResolvedValue({});
    tx.gameLog.create.mockResolvedValue({});
    const result = await gameService.handleAFK(tx as never, session, player, "room-1");
    expect(result).toBeNull();
  });

  it("TC-52 [FR-10-4]: ผลลัพธ์การเตะมี isAfkKick=true และ afkPlayerId ถูกต้อง", async () => {
    const player = makePlayer({ afk_count: 1 });
    const tx = makeTx();
    tx.player.update.mockResolvedValue({});
    tx.player.findMany.mockResolvedValue([pB]);
    tx.gameSession.update.mockResolvedValue({});
    tx.room.update.mockResolvedValue({});
    tx.player.updateMany.mockResolvedValue({});
    tx.gameLog.create.mockResolvedValue({});
    const result = await gameService.handleAFK(tx as never, session, player, "room-1");
    expect((result as { isAfkKick?: boolean })?.isAfkKick).toBe(true);
    expect((result as { afkPlayerId?: string })?.afkPlayerId).toBe("p-A");
  });

  it("TC-53 [FR-10-4]: trigger GAME_OVER เมื่อเหลือผู้เล่น 1 คนหลังเตะออก", async () => {
    const player = makePlayer({ afk_count: 1 });
    const tx = makeTx();
    tx.player.update.mockResolvedValue({});
    tx.player.findMany.mockResolvedValue([pB]);
    tx.gameSession.update.mockResolvedValue({});
    tx.room.update.mockResolvedValue({});
    tx.player.updateMany.mockResolvedValue({});
    tx.gameLog.create.mockResolvedValue({});
    const result = await gameService.handleAFK(tx as never, session, player, "room-1");
    expect(result?.action).toBe("GAME_OVER");
  });
});

// ================================================================
// 7. gameService.advanceTurn()
// FR-04-3, FR-05-A3 → S2-09, S2-12, S3-11
// ================================================================

describe("gameService.advanceTurn() — FR-04-3/FR-05-A3 [S2-09/12/S3-11]", () => {
  function buildAdvanceTx(alivePlayers: ReturnType<typeof makePlayer>[]) {
    const tx = makeTx();
    tx.player.findMany.mockResolvedValue(alivePlayers);
    tx.gameSession.update.mockResolvedValue({});
    setupTx(tx);
    return tx;
  }

  it("TC-54 [FR-04-3]: เปลี่ยนเทิร์น A→B ตามลำดับที่นั่ง", async () => {
    const tx = buildAdvanceTx([pA, pB, pC]);
    const res = await gameService.advanceTurn(tx as never, makeSession(), "room-1", "p-A");
    expect(res.nextTurn.player_id).toBe("p-B");
  });

  it("TC-55 [FR-04-3]: วนกลับ C→A เมื่อถึงผู้เล่นคนสุดท้าย", async () => {
    const tx = buildAdvanceTx([pA, pB, pC]);
    const res = await gameService.advanceTurn(tx as never, makeSession(), "room-1", "p-C");
    expect(res.nextTurn.player_id).toBe("p-A");
  });

  it("TC-56 [FR-04-3]: สลับเทิร์นถูกต้องเมื่อมีผู้เล่น 2 คน", async () => {
    const tx = buildAdvanceTx([pA, pB]);
    const res = await gameService.advanceTurn(tx as never, makeSession(), "room-1", "p-A");
    expect(res.nextTurn.player_id).toBe("p-B");
  });

  it("TC-57 [FR-05-A3]: pending_attacks ส่งต่อโดยไม่ลด (ลดใน drawCard เท่านั้น)", async () => {
    const tx = buildAdvanceTx([pA, pB]);
    const res = await gameService.advanceTurn(
      tx as never, makeSession({ pending_attacks: 2 }), "room-1", "p-A"
    );
    expect(res.nextTurn.pending_attacks).toBe(2);
  });

  it("TC-58 [FR-04-3]: turn_number เพิ่มขึ้น 1 ทุกครั้ง", async () => {
    const tx = buildAdvanceTx([pA, pB]);
    const res = await gameService.advanceTurn(
      tx as never, makeSession({ turn_number: 7 }), "room-1", "p-A"
    );
    expect(res.nextTurn.turn_number).toBe(8);
  });

  it("TC-59 [FR-04-3]: คืน action TURN_ADVANCED พร้อม success=true", async () => {
    const tx = buildAdvanceTx([pA, pB]);
    const res = await gameService.advanceTurn(tx as never, makeSession(), "room-1", "p-A");
    expect(res.action).toBe("TURN_ADVANCED");
    expect(res.success).toBe(true);
  });
});

// ================================================================
// 8. gameService.checkWinner()
// FR-04-5, FR-08-1/2/3/5/7 → S2-26/27/28/29
// ================================================================

describe("gameService.checkWinner() — FR-04-5/FR-08 [S2-26/27/28/29]", () => {
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

  it("TC-60 [FR-04-5/FR-08-1]: ประกาศ GAME_OVER เมื่อเหลือผู้เล่น 1 คน", async () => {
    const tx = buildWinnerTx([winner]);
    const res = await gameService.checkWinner(tx as never, session, "room-1", "p-A", "EK");
    expect(res.action).toBe("GAME_OVER");
    expect((res as { winner?: { player_id: string } }).winner?.player_id).toBe("p-B");
  });

  it("TC-61 [FR-08-2]: บันทึก winner_player_id และตั้ง status=FINISHED", async () => {
    const tx = buildWinnerTx([winner]);
    await gameService.checkWinner(tx as never, session, "room-1", "p-A", "EK");
    const su = tx.gameSession.update.mock.calls[0][0];
    expect(su.data.winner_player_id).toBe("p-B");
    expect(su.data.status).toBe("FINISHED");
  });

  it("TC-62 [FR-08-5]: รีเซ็ต room status กลับเป็น WAITING", async () => {
    const tx = buildWinnerTx([winner]);
    await gameService.checkWinner(tx as never, session, "room-1", "p-A", "EK");
    expect(tx.room.update.mock.calls[0][0].data.status).toBe("WAITING");
  });

  it("TC-63 [FR-08-3]: บันทึก last_winner_token สำหรับรอบถัดไป", async () => {
    const tx = buildWinnerTx([winner]);
    await gameService.checkWinner(tx as never, session, "room-1", "p-A", "EK");
    expect(tx.room.update.mock.calls[0][0].data.last_winner_token).toBe("tok-W");
  });

  it("TC-64 [FR-08-7]: รีเซ็ตผู้เล่นทุกคน is_alive=true afk_count=0", async () => {
    const tx = buildWinnerTx([winner]);
    await gameService.checkWinner(tx as never, session, "room-1", "p-A", "EK");
    const rc = tx.player.updateMany.mock.calls[0][0];
    expect(rc.data.is_alive).toBe(true);
    expect(rc.data.afk_count).toBe(0);
  });

  it("TC-65 [FR-04-5]: เปลี่ยนเทิร์น (ไม่ใช่ GAME_OVER) เมื่อเหลือผู้เล่น 2+ คน", async () => {
    const tx = buildWinnerTx([winner, pC]);
    const res = await gameService.checkWinner(tx as never, session, "room-1", "p-A", "EK");
    expect(res.action).toBe("TURN_ADVANCED");
  });
});

// ================================================================
// 9. gameService.playCard()
// FR-05, NFR-02 → S2-13
// ================================================================

describe("gameService.playCard() — FR-05/NFR-02 [S2-13]", () => {
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
      effect: { type: "ATTACK" },
      turnResult: {
        success: true, action: "TURN_ADVANCED",
        nextTurn: { player_id: "p-B", display_name: "Bob", turn_number: 4, pending_attacks: 0 },
      },
    });
    setupTx(tx);
    return tx;
  }

  it("TC-66 [FR-05]: เล่นไพ่คืน ACTION_PENDING รอ Nope Window", async () => {
    buildPlayTx(["AT", "DF"]);
    const res = await gameService.playCard("room-1", "tok-A", "AT");
    expect(res.action).toBe("ACTION_PENDING");
    expect(res.success).toBe(true);
  });

  it("TC-67 [FR-05]: ลบไพ่ออกจากมือ 1 ใบพอดี การ์ดอื่นยังอยู่ครบ", async () => {
    const tx = buildPlayTx(["AT", "SK", "DF"]);
    await gameService.playCard("room-1", "tok-A", "AT");
    const update = tx.cardHand.update.mock.calls[0][0];
    expect(update.data.cards).not.toContain("AT");
    expect(update.data.cards).toContain("SK");
    expect(update.data.cards).toContain("DF");
  });

  it("TC-68 [FR-05]: ไพ่ที่เล่นถูกเพิ่มเข้า discard pile", async () => {
    const tx = buildPlayTx(["AT", "DF"]);
    await gameService.playCard("room-1", "tok-A", "AT");
    expect(tx.deckState.update.mock.calls[0][0].data.discard_pile).toContain("AT");
  });

  it("TC-69 [NFR-02]: throw error เมื่อไม่ใช่เทิร์นของผู้เล่น", async () => {
    buildPlayTx(["AT"], { current_turn_player_id: "p-B" });
    await expect(gameService.playCard("room-1", "tok-A", "AT"))
      .rejects.toThrow("It's not your turn");
  });

  it("TC-70 [NFR-02]: throw error เมื่อไพ่ที่จะเล่นไม่อยู่ในมือ", async () => {
    buildPlayTx(["SK", "DF"]);
    await expect(gameService.playCard("room-1", "tok-A", "AT"))
      .rejects.toThrow("Card not in hand");
  });

  it("TC-71 [NFR-02]: throw error เมื่อห้องไม่ได้อยู่ใน status PLAYING", async () => {
    const tx = makeTx();
    tx.room.findUnique.mockResolvedValue(makeRoom({ status: "WAITING" }));
    setupTx(tx);
    await expect(gameService.playCard("room-1", "tok-A", "AT"))
      .rejects.toThrow("Game is not active");
  });

  it("TC-72 [NFR-02]: รีเซ็ต afk_count เป็น 0 เมื่อเล่นไพ่ manual", async () => {
    const tx = buildPlayTx(["AT"]);
    tx.player.findFirst.mockResolvedValue(makePlayer({ afk_count: 1 }));
    await gameService.playCard("room-1", "tok-A", "AT");
    const afkReset = (tx.player.update.mock.calls as Array<[{ data: { afk_count?: number } }]>)
      .find((c) => c[0]?.data?.afk_count === 0);
    expect(afkReset).toBeDefined();
  });

  it("TC-73 [FR-05]: ไพ่ GVE_ ถูกลบจากมือและเพิ่มเข้า discard pile", async () => {
    const tx = buildPlayTx(["GVE_AT", "DF"]);
    await gameService.playCard("room-1", "tok-A", "GVE_AT");
    const update = tx.cardHand.update.mock.calls[0][0];
    expect(update.data.cards).not.toContain("GVE_AT");
    const discard = tx.deckState.update.mock.calls[0][0].data.discard_pile as string[];
    expect(discard).toContain("GVE_AT");
  });
});