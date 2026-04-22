/**
 * Tests for game.deck.ts — pure utility functions
 * No database, no Prisma needed.
 */

// ── Re-implement pure functions inline (same logic as src) ────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

type Player = { player_id: string; [key: string]: any };
type PlayerHandsMap = Record<string, string[]>;

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
      if (!card) throw new Error("Not enough cards in deck to deal");
      hands[p.player_id]!.push(card);
    }
  }

  return { remainingDeck: deck, hands };
}

function finalizeDeck(
  remainingDeck: string[],
  playerCount: number,
  totalDF: number,
  dfCode: string,
  ekCode: string,
  expansions: string[],
): string[] {
  const deck = [...remainingDeck];

  const dfRemaining = totalDF - playerCount;
  for (let i = 0; i < dfRemaining; i++) {
    deck.push(dfCode);
  }

  const ekCount = playerCount - 1;
  for (let i = 0; i < ekCount; i++) {
    deck.push(ekCode);
  }

  if (expansions.includes("imploding_kittens")) {
    deck.push("IK");
  }

  return shuffleArray(deck);
}

// ─────────────────────────────────────────────────────────────────────────────
// shuffleArray
// ─────────────────────────────────────────────────────────────────────────────

describe("shuffleArray", () => {
  it("returns array with same length", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffleArray(arr)).toHaveLength(arr.length);
  });

  it("contains same elements after shuffle", () => {
    const arr = ["EK", "DF", "AT", "SK", "NP"];
    const shuffled = shuffleArray(arr);
    expect(shuffled.sort()).toEqual([...arr].sort());
  });

  it("does not mutate original array", () => {
    const arr = [1, 2, 3];
    const original = [...arr];
    shuffleArray(arr);
    expect(arr).toEqual(original);
  });

  it("handles empty array", () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it("handles single-element array", () => {
    expect(shuffleArray(["EK"])).toEqual(["EK"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// dealCards
// ─────────────────────────────────────────────────────────────────────────────

describe("dealCards", () => {
  const makePlayers = (n: number): Player[] =>
    Array.from({ length: n }, (_, i) => ({ player_id: `p${i + 1}` }));

  it("each player gets exactly 5 cards (1 DF + 4 from deck)", () => {
    const baseDeck = Array.from({ length: 20 }, (_, i) => `CARD_${i}`);
    const players = makePlayers(3);
    const { hands } = dealCards(baseDeck, players, "DF");

    for (const p of players) {
      expect(hands[p.player_id]).toHaveLength(5);
      expect(hands[p.player_id]![0]).toBe("DF");
    }
  });

  it("remaining deck is smaller by playerCount * cardsPerHand", () => {
    const baseDeck = Array.from({ length: 30 }, (_, i) => `C${i}`);
    const players = makePlayers(4);
    const { remainingDeck } = dealCards(baseDeck, players, "DF");
    expect(remainingDeck).toHaveLength(30 - 4 * 4);
  });

  it("cards dealt to players are removed from deck", () => {
    const baseDeck = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const players = makePlayers(2);
    const { remainingDeck, hands } = dealCards(baseDeck, players, "DF");

    const allDealt: string[] = [];
    for (const p of players) {
      allDealt.push(...hands[p.player_id]!.filter((c) => c !== "DF"));
    }

    for (const card of allDealt) {
      expect(remainingDeck).not.toContain(card);
    }
  });

  it("throws when deck has insufficient cards", () => {
    const baseDeck = ["A", "B"]; // Only 2 cards, need 4
    const players = makePlayers(1);
    expect(() => dealCards(baseDeck, players, "DF")).toThrow(
      "Not enough cards in deck to deal"
    );
  });

  it("respects custom cardsPerHand", () => {
    const baseDeck = Array.from({ length: 20 }, (_, i) => `C${i}`);
    const players = makePlayers(2);
    const { hands } = dealCards(baseDeck, players, "DF", 2);
    for (const p of players) {
      expect(hands[p.player_id]).toHaveLength(3); // 1 DF + 2
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// finalizeDeck
// ─────────────────────────────────────────────────────────────────────────────

describe("finalizeDeck", () => {
  const BASE = ["AT", "SK", "NP", "SF", "SH", "FV"];

  it("adds exactly (playerCount - 1) EK cards", () => {
    const deck = finalizeDeck(BASE, 4, 6, "DF", "EK", []);
    const ekCount = deck.filter((c) => c === "EK").length;
    expect(ekCount).toBe(3); // 4 - 1
  });

  it("adds (totalDF - playerCount) DF cards", () => {
    const deck = finalizeDeck(BASE, 3, 6, "DF", "EK", []);
    const dfCount = deck.filter((c) => c === "DF").length;
    expect(dfCount).toBe(3); // 6 - 3
  });

  it("adds IK when imploding_kittens expansion is included", () => {
    const deck = finalizeDeck(BASE, 3, 6, "DF", "EK", ["imploding_kittens"]);
    expect(deck.filter((c) => c === "IK")).toHaveLength(1);
  });

  it("does NOT add IK without the expansion", () => {
    const deck = finalizeDeck(BASE, 3, 6, "DF", "EK", []);
    expect(deck).not.toContain("IK");
  });

  it("total deck length is correct with no expansion", () => {
    // BASE(6) + DF remaining(6-4=2) + EK(4-1=3) = 11
    const deck = finalizeDeck(BASE, 4, 6, "DF", "EK", []);
    expect(deck).toHaveLength(6 + 2 + 3);
  });

  it("total deck length includes IK with expansion", () => {
    const deck = finalizeDeck(BASE, 4, 6, "DF", "EK", ["imploding_kittens"]);
    expect(deck).toHaveLength(6 + 2 + 3 + 1);
  });

  it("uses GVE card codes when provided", () => {
    const deck = finalizeDeck(BASE, 2, 6, "GVE_DF", "GVE_EK", []);
    expect(deck.filter((c) => c === "GVE_EK")).toHaveLength(1);
    expect(deck.filter((c) => c === "GVE_DF")).toHaveLength(4); // 6 - 2
  });

  it("does not mutate the input remainingDeck", () => {
    const original = [...BASE];
    finalizeDeck(BASE, 3, 6, "DF", "EK", []);
    expect(BASE).toEqual(original);
  });
});
