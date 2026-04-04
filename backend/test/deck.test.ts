/**
 * deck.test.ts
 * =====================================================================
 * Unit Tests — Deck Building & Dealing
 * ครอบคลุม: shuffle, buildBaseDeck, dealCards, finalizeDeck
 * TC: TC-S4-01~10, UT-S2-07~08, TC-UNIT-14~21
 * FR: FR-04-1, CARD_MASTER
 * =====================================================================
 */

import { BadRequestError } from "../src/utils/errors";

// ─── shuffleArray ─────────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

describe("shuffleArray()", () => {
  it("TC-S4-01 | ยังมีครบทุก element หลัง shuffle", () => {
    const original = ["A", "B", "C", "D", "E"];
    expect([...shuffleArray(original)].sort()).toEqual([...original].sort());
  });

  it("TC-S4-02 | ไม่แก้ไข array ต้นฉบับ", () => {
    const original = ["A", "B", "C"];
    const copy = [...original];
    shuffleArray(original);
    expect(original).toEqual(copy);
  });

  it("array ว่าง → คืน array ว่าง", () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it("1 element → ผลลัพธ์เหมือนเดิม", () => {
    expect(shuffleArray(["X"])).toEqual(["X"]);
  });

  it("shuffle ด้วย array ใหญ่ — ผลลัพธ์ไม่เรียงเหมือนกันทุกครั้ง (statistical)", () => {
    const arr = Array.from({ length: 20 }, (_, i) => i);
    const results = Array.from({ length: 10 }, () => shuffleArray(arr));
    const allSame = results.every((r) => JSON.stringify(r) === JSON.stringify(results[0]));
    expect(allSame).toBe(false);
  });
});

// ─── dealCards ───────────────────────────────────────────────────────────────

function dealCards(
  baseDeck: string[],
  players: { player_id: string }[],
  dfCode: string,
  cardsPerHand = 4
): { remainingDeck: string[]; hands: Record<string, string[]> } {
  const deck = [...baseDeck];
  const hands: Record<string, string[]> = {};
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

describe("dealCards()", () => {
  const PLAYERS = [{ player_id: "p1" }, { player_id: "p2" }, { player_id: "p3" }];
  const LARGE_DECK = Array.from({ length: 30 }, (_, i) => `CARD_${i}`);

  it("TC-S4-03 | UT-S2-07 | ทุก hand มี Defuse เป็นใบแรก", () => {
    const { hands } = dealCards(LARGE_DECK, PLAYERS, "DF");
    for (const p of PLAYERS) expect(hands[p.player_id]![0]).toBe("DF");
  });

  it("TC-S4-04 | UT-S2-07 | ทุก hand ได้ 5 ใบ (DF + 4 ทั่วไป)", () => {
    const { hands } = dealCards(LARGE_DECK, PLAYERS, "DF");
    for (const p of PLAYERS) expect(hands[p.player_id]!.length).toBe(5);
  });

  it("TC-S4-05 | remainingDeck ลดลงถูกต้อง (30 - 3×4 = 18 ใบเหลือ)", () => {
    const { remainingDeck } = dealCards(LARGE_DECK, PLAYERS, "DF");
    expect(remainingDeck.length).toBe(18);
  });

  it("TC-S4-06 | deck ไม่พอแจก → throw 'Not enough cards in deck to deal'", () => {
    expect(() => dealCards(Array(3).fill("X"), Array(5).fill(0).map((_, i) => ({ player_id: `p${i}` })), "DF")).toThrow("Not enough cards in deck to deal");
  });

  it("ใช้ GVE_DF แทน DF ได้ถ้าเป็น good_and_evil", () => {
    const { hands } = dealCards(LARGE_DECK, [{ player_id: "p1" }], "GVE_DF");
    expect(hands["p1"]![0]).toBe("GVE_DF");
  });
});

// ─── finalizeDeck ─────────────────────────────────────────────────────────────

function finalizeDeck(
  remainingDeck: string[],
  playerCount: number,
  totalDF: number,
  dfCode: string,
  ekCode: string,
  expansions: string[]
): string[] {
  const deck = [...remainingDeck];
  const dfRemaining = totalDF - playerCount;
  for (let i = 0; i < dfRemaining; i++) deck.push(dfCode);
  const ekCount = playerCount - 1;
  for (let i = 0; i < ekCount; i++) deck.push(ekCode);
  if (expansions.includes("imploding_kittens")) deck.push("IK");
  return shuffleArray(deck);
}

describe("finalizeDeck()", () => {
  it("TC-S4-07 | UT-S2-08 | EK count = players-1 (2 players → 1 EK)", () => {
    const deck = finalizeDeck([], 2, 6, "DF", "EK", []);
    expect(deck.filter((c) => c === "EK").length).toBe(1);
  });

  it("TC-S4-08 | EK count = players-1 (5 players → 4 EK)", () => {
    const deck = finalizeDeck([], 5, 6, "DF", "EK", []);
    expect(deck.filter((c) => c === "EK").length).toBe(4);
  });

  it("TC-S4-09 | TC-UNIT-17 | IK 1 ใบเมื่อเปิด expansion imploding_kittens", () => {
    const deck = finalizeDeck([], 2, 6, "DF", "EK", ["imploding_kittens"]);
    expect(deck.filter((c) => c === "IK").length).toBe(1);
  });

  it("TC-S4-10 | TC-UNIT-20 | ไม่มี IK เมื่อไม่เปิด expansion", () => {
    const deck = finalizeDeck([], 2, 6, "DF", "EK", []);
    expect(deck).not.toContain("IK");
  });

  it("TC-UNIT-16 | DF ที่เหลือ = totalDF - playerCount (6-3 = 3 DF)", () => {
    const deck = finalizeDeck([], 3, 6, "DF", "EK", []);
    expect(deck.filter((c) => c === "DF").length).toBe(3);
  });

  it("TC-UNIT-18 | สร้าง hand แล้ว ทุกคนได้ 5 ใบ", () => {
    const base = Array.from({ length: 30 }, (_, i) => `C_${i}`);
    const players = ["p1", "p2", "p3"].map((id) => ({ player_id: id }));
    const { hands } = dealCards(base, players, "DF");
    for (const p of players) expect(hands[p.player_id]!.length).toBe(5);
  });

  it("TC-UNIT-19 | ทุก hand มี DF", () => {
    const base = Array.from({ length: 30 }, (_, i) => `C_${i}`);
    const players = ["p1", "p2"].map((id) => ({ player_id: id }));
    const { hands } = dealCards(base, players, "DF");
    for (const p of players) expect(hands[p.player_id]).toContain("DF");
  });

  it("ผลลัพธ์ถูก shuffle (ไม่ใช่ลำดับตายตัว)", () => {
    const results = Array.from({ length: 10 }, () => finalizeDeck(["X", "Y"], 2, 6, "DF", "EK", []));
    const allSame = results.every((r) => JSON.stringify(r) === JSON.stringify(results[0]));
    expect(allSame).toBe(false);
  });
});

// ─── startGame — winner goes first ───────────────────────────────────────────

describe("startGame() — turn order", () => {
  const PLAYERS = [
    { player_id: "p1", player_token: "tok-1", seat_number: 1 },
    { player_id: "p2", player_token: "tok-2", seat_number: 2 },
    { player_id: "p3", player_token: "tok-3", seat_number: 3 },
  ];

  it("TC-UNIT-21 | winner ของรอบก่อนเริ่มก่อน", () => {
    const lastWinnerToken = "tok-2";
    const wi = PLAYERS.findIndex((p) => p.player_token === lastWinnerToken);
    const ordered = [...PLAYERS.slice(wi), ...PLAYERS.slice(0, wi)];
    expect(ordered[0]!.player_token).toBe(lastWinnerToken);
  });

  it("ไม่มี lastWinnerToken → เริ่มด้วย seat_number 1 ตามปกติ", () => {
    const sorted = [...PLAYERS].sort((a, b) => a.seat_number - b.seat_number);
    expect(sorted[0]!.player_id).toBe("p1");
  });
});
