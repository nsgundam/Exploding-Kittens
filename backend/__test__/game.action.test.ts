/**
 * Tests for game.action.ts — pure validation logic extracted from service
 * Tests combo validation, cat card rules, feral cat wildcarding
 */

// ── Inline validation helpers (mirrors game.action.ts) ───────────────────

class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

function isCatCard(code: string): boolean {
  const CAT_CODES = new Set([
    "CAT_TACO", "CAT_MELON", "CAT_BEARD", "CAT_RAINBOW", "CAT_POTATO",
    "FC", "GVE_FC", "MC", "GVE_MC",
  ]);
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

// ─────────────────────────────────────────────────────────────────────────────
// isCatCard
// ─────────────────────────────────────────────────────────────────────────────

describe("isCatCard", () => {
  const validCats = [
    "CAT_TACO", "CAT_MELON", "CAT_BEARD", "CAT_RAINBOW", "CAT_POTATO",
    "FC", "GVE_FC", "MC", "GVE_MC",
  ];

  it.each(validCats)("'%s' is a cat card", (code) => {
    expect(isCatCard(code)).toBe(true);
  });

  const nonCats = ["EK", "DF", "AT", "SK", "NP", "SH", "SF", "FV", "IK", "TA", "RV"];
  it.each(nonCats)("'%s' is NOT a cat card", (code) => {
    expect(isCatCard(code)).toBe(false);
  });

  it("empty string is not a cat card", () => {
    expect(isCatCard("")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isFeralCat
// ─────────────────────────────────────────────────────────────────────────────

describe("isFeralCat", () => {
  it("'FC' is a feral cat", () => expect(isFeralCat("FC")).toBe(true));
  it("'GVE_FC' is a feral cat", () => expect(isFeralCat("GVE_FC")).toBe(true));
  it("'CAT_TACO' is NOT a feral cat", () => expect(isFeralCat("CAT_TACO")).toBe(false));
  it("'MC' is NOT a feral cat", () => expect(isFeralCat("MC")).toBe(false));
});

// ─────────────────────────────────────────────────────────────────────────────
// validateCombo
// ─────────────────────────────────────────────────────────────────────────────

describe("validateCombo", () => {
  // ── Valid combos ──

  it("accepts 2 identical cat cards", () => {
    expect(() => validateCombo(["CAT_TACO", "CAT_TACO"])).not.toThrow();
  });

  it("accepts 3 identical cat cards", () => {
    expect(() => validateCombo(["CAT_MELON", "CAT_MELON", "CAT_MELON"])).not.toThrow();
  });

  it("accepts 2 cards: one normal cat + one FC wildcard", () => {
    expect(() => validateCombo(["CAT_TACO", "FC"])).not.toThrow();
  });

  it("accepts 2 FC wildcards", () => {
    expect(() => validateCombo(["FC", "FC"])).not.toThrow();
  });

  it("accepts 3 cards: 2 normal cat + 1 FC", () => {
    expect(() => validateCombo(["CAT_BEARD", "CAT_BEARD", "FC"])).not.toThrow();
  });

  it("accepts 3 FC wildcards", () => {
    expect(() => validateCombo(["FC", "FC", "FC"])).not.toThrow();
  });

  it("accepts GVE_FC as wildcard with normal cat", () => {
    expect(() => validateCombo(["CAT_RAINBOW", "GVE_FC"])).not.toThrow();
  });

  // ── Invalid combos — wrong size ──

  it("throws when only 1 card provided", () => {
    expect(() => validateCombo(["CAT_TACO"])).toThrow("Combo must be 2 or 3 cards");
  });

  it("throws when 4 cards provided", () => {
    expect(() =>
      validateCombo(["CAT_TACO", "CAT_TACO", "CAT_TACO", "CAT_TACO"])
    ).toThrow("Combo must be 2 or 3 cards");
  });

  it("throws for empty array", () => {
    expect(() => validateCombo([])).toThrow("Combo must be 2 or 3 cards");
  });

  // ── Invalid combos — non-cat card ──

  it("throws when an action card is included", () => {
    expect(() => validateCombo(["CAT_TACO", "AT"])).toThrow(
      "Card AT is not a cat card"
    );
  });

  it("throws when EK is included", () => {
    expect(() => validateCombo(["CAT_TACO", "EK"])).toThrow(
      "Card EK is not a cat card"
    );
  });

  it("throws when NP is included", () => {
    expect(() => validateCombo(["NP", "CAT_MELON"])).toThrow(
      "Card NP is not a cat card"
    );
  });

  // ── Invalid combos — mixed types ──

  it("throws for 2 different non-feral cat cards", () => {
    expect(() => validateCombo(["CAT_TACO", "CAT_MELON"])).toThrow(
      "Combo cards must all be the same type"
    );
  });

  it("throws for 3 cards with 2 different non-feral types", () => {
    expect(() => validateCombo(["CAT_TACO", "CAT_MELON", "FC"])).toThrow(
      "Combo cards must all be the same type"
    );
  });

  it("throws for 3 all-different non-feral cats", () => {
    expect(() =>
      validateCombo(["CAT_TACO", "CAT_BEARD", "CAT_RAINBOW"])
    ).toThrow("Combo cards must all be the same type");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Nope logic helpers
// ─────────────────────────────────────────────────────────────────────────────

describe("Nope cancel logic", () => {
  /**
   * In game.nope.ts: isCancel = newNopeCount % 2 !== 0
   * Odd nope_count → action is cancelled
   * Even nope_count → action proceeds (double-noped = reinstated)
   */
  const isCancel = (nopeCount: number) => nopeCount % 2 !== 0;

  it("nope_count 1 (first Nope) → action is cancelled", () => {
    expect(isCancel(1)).toBe(true);
  });

  it("nope_count 2 (second Nope) → action proceeds", () => {
    expect(isCancel(2)).toBe(false);
  });

  it("nope_count 3 → action is cancelled again", () => {
    expect(isCancel(3)).toBe(true);
  });

  it("nope_count 4 → action proceeds again", () => {
    expect(isCancel(4)).toBe(false);
  });

  it("nope_count 0 → not cancelled (initial state)", () => {
    expect(isCancel(0)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Nope window timing
// ─────────────────────────────────────────────────────────────────────────────

describe("Nope window timing", () => {
  /**
   * In game.nope.ts: elapsed >= 2500 → window closed
   */
  const isWindowOpen = (elapsedMs: number) => elapsedMs < 2500;

  it("0ms elapsed → window is open", () => {
    expect(isWindowOpen(0)).toBe(true);
  });

  it("2499ms elapsed → window is still open", () => {
    expect(isWindowOpen(2499)).toBe(true);
  });

  it("2500ms elapsed → window is closed", () => {
    expect(isWindowOpen(2500)).toBe(false);
  });

  it("3000ms elapsed → window is closed", () => {
    expect(isWindowOpen(3000)).toBe(false);
  });
});
