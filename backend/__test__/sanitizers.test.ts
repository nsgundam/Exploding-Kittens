/**
 * Tests for sanitizers.ts — anti-cheat hand sanitization
 */

// ── Inline types & functions (mirrors src/utils/sanitizers.ts) ────────────

interface CardHand {
  hand_id: string;
  player_id: string;
  session_id: string;
  cards: unknown;
  card_count: number;
  updated_at: Date;
}

interface SanitizedCardHand {
  hand_id: string;
  player_id: string;
  session_id: string;
  cards: string[];
  card_count: number;
  updated_at: Date;
}

function sanitizeCardHands(
  cardHands: CardHand[],
  viewerPlayerId: string | undefined,
): SanitizedCardHand[] {
  return cardHands.map((hand) => {
    if (viewerPlayerId && hand.player_id === viewerPlayerId) {
      return { ...hand, cards: (hand.cards ?? []) as string[] };
    }
    return { ...hand, cards: [] };
  });
}

function getPublicComboResult(result: any) {
  return {
    ...result,
    stolenCard: undefined,
    thiefHand: undefined,
    targetHand: undefined,
    robbedFromToken: undefined,
  };
}

// ─── fixtures ────────────────────────────────────────────────────────────────

const NOW = new Date("2024-01-01T00:00:00.000Z");

const makeHand = (player_id: string, cards: string[]): CardHand => ({
  hand_id: `hand-${player_id}`,
  player_id,
  session_id: "session-1",
  cards,
  card_count: cards.length,
  updated_at: NOW,
});

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeCardHands
// ─────────────────────────────────────────────────────────────────────────────

describe("sanitizeCardHands", () => {
  const hand1 = makeHand("p1", ["EK", "DF", "AT"]);
  const hand2 = makeHand("p2", ["NP", "SK"]);
  const hand3 = makeHand("p3", ["SH", "SF", "FV"]);

  it("returns cards for the viewer's own hand", () => {
    const result = sanitizeCardHands([hand1, hand2], "p1");
    const ownHand = result.find((h) => h.player_id === "p1")!;
    expect(ownHand.cards).toEqual(["EK", "DF", "AT"]);
  });

  it("returns empty cards array for other players", () => {
    const result = sanitizeCardHands([hand1, hand2], "p1");
    const other = result.find((h) => h.player_id === "p2")!;
    expect(other.cards).toEqual([]);
  });

  it("all hands are empty when viewerPlayerId is undefined", () => {
    const result = sanitizeCardHands([hand1, hand2, hand3], undefined);
    for (const h of result) {
      expect(h.cards).toEqual([]);
    }
  });

  it("preserves card_count for all hands", () => {
    const result = sanitizeCardHands([hand1, hand2], "p1");
    const p1 = result.find((h) => h.player_id === "p1")!;
    const p2 = result.find((h) => h.player_id === "p2")!;
    expect(p1.card_count).toBe(3);
    expect(p2.card_count).toBe(2);
  });

  it("preserves hand_id and session_id for all hands", () => {
    const result = sanitizeCardHands([hand1], "p1");
    expect(result[0]!.hand_id).toBe("hand-p1");
    expect(result[0]!.session_id).toBe("session-1");
  });

  it("preserves updated_at", () => {
    const result = sanitizeCardHands([hand1], "p1");
    expect(result[0]!.updated_at).toBe(NOW);
  });

  it("handles empty hand list", () => {
    expect(sanitizeCardHands([], "p1")).toEqual([]);
  });

  it("viewer with no matching hand gets all empty", () => {
    const result = sanitizeCardHands([hand1, hand2], "p-nonexistent");
    for (const h of result) {
      expect(h.cards).toEqual([]);
    }
  });

  it("does not mutate original hand objects", () => {
    const original = ["EK", "DF"];
    const hand = makeHand("p1", original);
    sanitizeCardHands([hand], "p99"); // viewer is not p1 → should strip
    expect(hand.cards).toEqual(["EK", "DF"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPublicComboResult
// ─────────────────────────────────────────────────────────────────────────────

describe("getPublicComboResult", () => {
  const fullResult = {
    success: true,
    action: "COMBO_PLAYED",
    comboType: "TWO_CARD",
    stolenCard: "DF",
    thiefHand: ["AT", "SK"],
    targetHand: ["NP"],
    robbedFromToken: "secret-token",
    robbedFromDisplayName: "Bob",
    robbedFromPlayerId: "p2",
    playedBy: "p1",
    wasVoid: false,
  };

  it("removes stolenCard", () => {
    const pub = getPublicComboResult(fullResult);
    expect(pub.stolenCard).toBeUndefined();
  });

  it("removes thiefHand", () => {
    const pub = getPublicComboResult(fullResult);
    expect(pub.thiefHand).toBeUndefined();
  });

  it("removes targetHand", () => {
    const pub = getPublicComboResult(fullResult);
    expect(pub.targetHand).toBeUndefined();
  });

  it("removes robbedFromToken", () => {
    const pub = getPublicComboResult(fullResult);
    expect(pub.robbedFromToken).toBeUndefined();
  });

  it("keeps public fields intact", () => {
    const pub = getPublicComboResult(fullResult);
    expect(pub.success).toBe(true);
    expect(pub.action).toBe("COMBO_PLAYED");
    expect(pub.comboType).toBe("TWO_CARD");
    expect(pub.robbedFromDisplayName).toBe("Bob");
    expect(pub.robbedFromPlayerId).toBe("p2");
    expect(pub.playedBy).toBe("p1");
    expect(pub.wasVoid).toBe(false);
  });

  it("does not mutate the original result", () => {
    const copy = { ...fullResult };
    getPublicComboResult(fullResult);
    expect(fullResult.stolenCard).toBe("DF");
    expect(fullResult.thiefHand).toEqual(["AT", "SK"]);
  });
});
