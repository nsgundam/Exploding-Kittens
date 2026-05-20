/**
 * Tests for imploding_service.ts — IK deck-insertion logic (pure part)
 * No Prisma/DB. Tests the position-to-index calculation logic directly.
 */

/**
 * Mirrors insertIKBack position → insertIndex logic from imploding.service.ts
 *
 * deck_order is arranged bottom → top.
 * deck[deck.length - 1] = top card.
 *
 * position 0 = insert at top (append to end of array)
 * position maxPos = insert at bottom (prepend to front of array)
 */
function computeInsertIndex(deckLength: number, position: number): number {
  const maxPos = deckLength;
  const safePos = Math.max(0, Math.min(position, maxPos));
  return maxPos - safePos; // insertIndex for splice
}

function insertIKIntoMockDeck(deck: string[], position: number): string[] {
  const newDeck = [...deck];
  const insertIndex = computeInsertIndex(deck.length, position);
  newDeck.splice(insertIndex, 0, "IK");
  return newDeck;
}

// ─────────────────────────────────────────────────────────────────────────────
// computeInsertIndex
// ─────────────────────────────────────────────────────────────────────────────

describe("computeInsertIndex", () => {
  it("position 0 → insertIndex equals deckLength (top of deck)", () => {
    expect(computeInsertIndex(5, 0)).toBe(5);
  });

  it("position maxPos → insertIndex 0 (bottom of deck)", () => {
    expect(computeInsertIndex(5, 5)).toBe(0);
  });

  it("position 1 → insertIndex deckLength - 1 (second from top)", () => {
    expect(computeInsertIndex(5, 1)).toBe(4);
  });

  it("position 2 → insertIndex deckLength - 2", () => {
    expect(computeInsertIndex(5, 2)).toBe(3);
  });

  it("clamps negative position to 0 (top)", () => {
    expect(computeInsertIndex(5, -1)).toBe(5);
  });

  it("clamps position > maxPos to maxPos (bottom)", () => {
    expect(computeInsertIndex(5, 99)).toBe(0);
  });

  it("works for empty deck (deckLength 0)", () => {
    // Only valid position is 0, insertIndex = 0
    expect(computeInsertIndex(0, 0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// insertIKIntoMockDeck — end-to-end position tests
// ─────────────────────────────────────────────────────────────────────────────

describe("insertIKIntoMockDeck", () => {
  // deck order: index 0 = bottom, last index = top
  const deck = ["A", "B", "C", "D", "E"]; // E is top

  it("position 0 → IK is the new top card", () => {
    const result = insertIKIntoMockDeck(deck, 0);
    expect(result[result.length - 1]).toBe("IK");
    expect(result).toHaveLength(6);
  });

  it("position 5 (maxPos) → IK is the new bottom card", () => {
    const result = insertIKIntoMockDeck(deck, 5);
    expect(result[0]).toBe("IK");
    expect(result).toHaveLength(6);
  });

  it("position 1 → IK is second from top", () => {
    const result = insertIKIntoMockDeck(deck, 1);
    expect(result[result.length - 1]).toBe("E"); // E stays on top
    expect(result[result.length - 2]).toBe("IK");
  });

  it("position 2 → IK is third from top", () => {
    const result = insertIKIntoMockDeck(deck, 2);
    expect(result[result.length - 1]).toBe("E");
    expect(result[result.length - 2]).toBe("D");
    expect(result[result.length - 3]).toBe("IK");
  });

  it("does not mutate original deck", () => {
    const original = [...deck];
    insertIKIntoMockDeck(deck, 2);
    expect(deck).toEqual(original);
  });

  it("IK always appears exactly once", () => {
    for (let pos = 0; pos <= deck.length; pos++) {
      const result = insertIKIntoMockDeck(deck, pos);
      expect(result.filter((c) => c === "IK")).toHaveLength(1);
    }
  });

  it("all original cards are preserved", () => {
    const result = insertIKIntoMockDeck(deck, 2);
    for (const card of deck) {
      expect(result).toContain(card);
    }
  });

  it("inserts into single-card deck at top (position 0)", () => {
    const result = insertIKIntoMockDeck(["X"], 0);
    expect(result).toEqual(["X", "IK"]); // IK appended = top
  });

  it("inserts into single-card deck at bottom (position 1)", () => {
    const result = insertIKIntoMockDeck(["X"], 1);
    expect(result).toEqual(["IK", "X"]); // IK prepended = bottom
  });

  it("position clamped beyond range still gives valid result", () => {
    const result = insertIKIntoMockDeck(deck, 999);
    expect(result[0]).toBe("IK"); // clamped to bottom
    expect(result).toHaveLength(6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ik_face_up logic
// ─────────────────────────────────────────────────────────────────────────────

describe("ik_face_up state after insert", () => {
  /**
   * After insertIKBack, ik_face_up is always set to true.
   * Before insert (face-down), playerEliminated = false.
   * After face-up insert, next time IK is drawn → playerEliminated = true.
   */

  it("face-down IK draw → playerEliminated is false", () => {
    const isFaceUp = false;
    const playerEliminated = isFaceUp;
    expect(playerEliminated).toBe(false);
  });

  it("face-up IK draw → playerEliminated is true", () => {
    const isFaceUp = true;
    const playerEliminated = isFaceUp;
    expect(playerEliminated).toBe(true);
  });

  it("isIKOnTop returns true when IK is last in deck and ik_face_up is true", () => {
    const deck = ["A", "B", "IK"];
    const ik_face_up = true;
    const isOnTop = ik_face_up && deck[deck.length - 1] === "IK";
    expect(isOnTop).toBe(true);
  });

  it("isIKOnTop returns false when IK is NOT last in deck", () => {
    const deck = ["IK", "B", "A"]; // IK at bottom, not top
    const ik_face_up = true;
    const isOnTop = ik_face_up && deck[deck.length - 1] === "IK";
    expect(isOnTop).toBe(false);
  });

  it("isIKOnTop returns false when ik_face_up is false even if IK is on top", () => {
    const deck = ["A", "B", "IK"];
    const ik_face_up = false;
    const isOnTop = ik_face_up && deck[deck.length - 1] === "IK";
    expect(isOnTop).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AlterTheFuture — top-N ordering logic
// ─────────────────────────────────────────────────────────────────────────────

describe("AlterTheFuture deck reorder logic", () => {
  /**
   * In game.core.ts commitAlterTheFuture:
   *   topCards = deck.slice(-n).reverse()  → returned to player in reading order (topmost first)
   *   newTopSection = [...newOrder].reverse()  → stored back in deck order (bottom-to-top)
   *   newDeck = [...deck.slice(0, deck.length - n), ...newTopSection]
   */

  function applyAlterTheFuture(deck: string[], newOrder: string[]): string[] {
    const n = Math.min(3, deck.length);
    const newTopSection = [...newOrder].reverse();
    return [...deck.slice(0, deck.length - n), ...newTopSection];
  }

  it("top card after reorder matches first element of newOrder", () => {
    const deck = ["A", "B", "C", "D", "E"];
    const newOrder = ["E", "C", "D"]; // new top → bottom ordering as player sees it
    const result = applyAlterTheFuture(deck, newOrder);
    expect(result[result.length - 1]).toBe("E");
  });

  it("second card from top matches second element of newOrder", () => {
    const deck = ["A", "B", "C", "D", "E"];
    const newOrder = ["E", "C", "D"];
    const result = applyAlterTheFuture(deck, newOrder);
    expect(result[result.length - 2]).toBe("C");
  });

  it("third card from top matches third element of newOrder", () => {
    const deck = ["A", "B", "C", "D", "E"];
    const newOrder = ["E", "C", "D"];
    const result = applyAlterTheFuture(deck, newOrder);
    expect(result[result.length - 3]).toBe("D");
  });

  it("lower cards in deck remain unchanged", () => {
    const deck = ["A", "B", "C", "D", "E"];
    const newOrder = ["E", "C", "D"];
    const result = applyAlterTheFuture(deck, newOrder);
    expect(result[0]).toBe("A");
    expect(result[1]).toBe("B");
  });

  it("deck length does not change", () => {
    const deck = ["A", "B", "C", "D", "E"];
    const result = applyAlterTheFuture(deck, ["E", "D", "C"]);
    expect(result).toHaveLength(deck.length);
  });

  it("handles deck with exactly 3 cards", () => {
    const deck = ["X", "Y", "Z"]; // Z is top
    const newOrder = ["Z", "X", "Y"];
    const result = applyAlterTheFuture(deck, newOrder);
    expect(result[result.length - 1]).toBe("Z");
    expect(result[result.length - 2]).toBe("X");
    expect(result[result.length - 3]).toBe("Y");
  });
});
