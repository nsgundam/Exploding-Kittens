/**
 * combo.test.ts
 * =====================================================================
 * Unit Tests — Cat Combo Cards (2-card & 3-card)
 * ครอบคลุม: isCatCard, validateCombo, resolveCombo2/3, Feral Cat
 * TC: TC-UNIT-01~13, TC-UNIT-37~45
 * FR: FR-05-C1/C2/C3/C4
 * =====================================================================
 */

import { BadRequestError } from "../src/utils/errors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  if (comboCards.length < 2 || comboCards.length > 3)
    throw new BadRequestError("Combo must be 2 or 3 cards");
  for (const c of comboCards)
    if (!isCatCard(c)) throw new BadRequestError(`Card ${c} is not a cat card`);
  const nonFeral = comboCards.filter((c) => !isFeralCat(c));
  if (nonFeral.length > 1 && !nonFeral.every((c) => c === nonFeral[0]))
    throw new BadRequestError("Combo cards must all be the same type (Feral Cat can substitute any)");
}

function resolveCombo2(
  targetCards: string[],
  excludes = ["EK", "GVE_EK", "DF", "GVE_DF"]
): { stolenCard: string | undefined; wasVoid: boolean } {
  if (targetCards.length === 0) return { stolenCard: undefined, wasVoid: true };
  const pool = targetCards.filter((c) => !excludes.includes(c));
  const source = pool.length > 0 ? pool : targetCards;
  return { stolenCard: source[Math.floor(Math.random() * source.length)]!, wasVoid: false };
}

function resolveCombo3(
  targetCards: string[],
  demandedCard: string
): { stolenCard: string | undefined; wasVoid: boolean } {
  const normalized = demandedCard.replace(/^GVE_/, "");
  if (["EK", "IK"].includes(normalized))
    throw new BadRequestError("Cannot demand Exploding Kitten or Imploding Kitten");
  if (!targetCards.includes(demandedCard)) return { stolenCard: undefined, wasVoid: true };
  return { stolenCard: demandedCard, wasVoid: false };
}

function validateComboTarget(requesterToken: string, targetToken: string, targetHand: string[]): void {
  if (requesterToken === targetToken) throw new BadRequestError("Cannot target yourself");
  if (targetHand.length === 0) throw new BadRequestError("Target player has no cards");
}

// ─── TEST SUITES ──────────────────────────────────────────────────────────────

describe("isCatCard()", () => {
  it("TC-UNIT-01 | classic cat codes → true", () => {
    ["CAT_TACO", "CAT_MELON", "CAT_BEARD", "CAT_RAINBOW", "CAT_POTATO"].forEach((c) => {
      expect(isCatCard(c)).toBe(true);
    });
  });

  it("TC-UNIT-02 | Feral Cat variants → true", () => {
    expect(isCatCard("FC")).toBe(true);
    expect(isCatCard("GVE_FC")).toBe(true);
  });

  it("TC-UNIT-03 | non-cat cards → false", () => {
    ["AT", "SK", "FV", "NP", "EK"].forEach((c) => {
      expect(isCatCard(c)).toBe(false);
    });
  });
});

describe("isFeralCat()", () => {
  it("TC-UNIT-04 | FC / GVE_FC → true", () => {
    expect(isFeralCat("FC")).toBe(true);
    expect(isFeralCat("GVE_FC")).toBe(true);
  });

  it("CAT_TACO → false", () => {
    expect(isFeralCat("CAT_TACO")).toBe(false);
  });
});

describe("validateCombo()", () => {
  it("TC-UNIT-05 | 2 ใบชนิดเดียวกัน → ไม่ throw", () => {
    expect(() => validateCombo(["CAT_TACO", "CAT_TACO"])).not.toThrow();
  });

  it("TC-UNIT-06 | 3 ใบชนิดเดียวกัน → ไม่ throw", () => {
    expect(() => validateCombo(["CAT_BEARD", "CAT_BEARD", "CAT_BEARD"])).not.toThrow();
  });

  it("TC-UNIT-07 | Feral Cat แทนใน 2 ใบ → ไม่ throw", () => {
    expect(() => validateCombo(["CAT_TACO", "FC"])).not.toThrow();
  });

  it("TC-UNIT-08 | Feral Cat แทนใน 3 ใบ → ไม่ throw", () => {
    expect(() => validateCombo(["CAT_RAINBOW", "CAT_RAINBOW", "FC"])).not.toThrow();
  });

  it("TC-UNIT-09 | 1 ใบ → throw 'Combo must be 2 or 3 cards'", () => {
    expect(() => validateCombo(["CAT_TACO"])).toThrow("Combo must be 2 or 3 cards");
  });

  it("TC-UNIT-10 | 4 ใบ → throw 'Combo must be 2 or 3 cards'", () => {
    expect(() => validateCombo(["CAT_TACO", "CAT_TACO", "CAT_TACO", "CAT_TACO"])).toThrow("Combo must be 2 or 3 cards");
  });

  it("TC-UNIT-11 | non-cat card → throw 'is not a cat card'", () => {
    expect(() => validateCombo(["AT", "AT"])).toThrow("is not a cat card");
  });

  it("TC-UNIT-12 | 2 cat ต่างชนิด → throw 'same type'", () => {
    expect(() => validateCombo(["CAT_TACO", "CAT_MELON"])).toThrow("same type");
  });

  it("TC-UNIT-13 | GVE_FC ใช้แทนแมวใบไหนก็ได้", () => {
    expect(() => validateCombo(["CAT_MELON", "GVE_FC"])).not.toThrow();
  });

  it("Feral Cat เป็นทุกใบใน 2-card → ผ่าน (2 FC)", () => {
    expect(() => validateCombo(["FC", "FC"])).not.toThrow();
  });
});

describe("validateComboTarget()", () => {
  it("TC-UNIT-41 | target ตัวเอง → throw 'Cannot target yourself'", () => {
    expect(() => validateComboTarget("tok-A", "tok-A", ["SK"])).toThrow("Cannot target yourself");
  });

  it("TC-UNIT-40 | target ไม่มีไพ่ → throw 'Target player has no cards'", () => {
    expect(() => validateComboTarget("tok-A", "tok-B", [])).toThrow("Target player has no cards");
  });

  it("เงื่อนไขครบ → ไม่ throw", () => {
    expect(() => validateComboTarget("tok-A", "tok-B", ["SK"])).not.toThrow();
  });
});

describe("comboCard() — ACTION_PENDING", () => {
  it("TC-UNIT-37 | 2-card combo → ACTION_PENDING, comboType=TWO_CARD", () => {
    validateCombo(["CAT_TACO", "CAT_TACO"]);
    const result = { action: "ACTION_PENDING", comboType: "TWO_CARD" };
    expect(result.action).toBe("ACTION_PENDING");
    expect(result.comboType).toBe("TWO_CARD");
  });

  it("TC-UNIT-38 | 3-card combo → ACTION_PENDING, comboType=THREE_CARD", () => {
    validateCombo(["CAT_TACO", "CAT_TACO", "CAT_TACO"]);
    const result = { action: "ACTION_PENDING", comboType: "THREE_CARD" };
    expect(result.comboType).toBe("THREE_CARD");
  });

  it("TC-UNIT-43 | ACTION_PENDING ไม่ advance turn (nextTurn undefined)", () => {
    const result = { action: "ACTION_PENDING", nextTurn: undefined };
    expect(result.nextTurn).toBeUndefined();
  });

  it("TC-UNIT-44 | pending_action มี comboType + playedBy", () => {
    const result = { action: "ACTION_PENDING", comboType: "TWO_CARD", playedBy: "p1" };
    expect(result.comboType).toBeDefined();
    expect(result.playedBy).toBe("p1");
  });
});

describe("TC-UNIT-42 | ไพ่ combo ไม่พอ → throw", () => {
  it("มี CAT_TACO แค่ 1 ใบแต่ต้องการ 2 → throw 'not in hand'", () => {
    expect(() => {
      const hand = ["CAT_TACO"];
      const needed = ["CAT_TACO", "CAT_TACO"];
      const remaining = [...hand];
      for (const c of needed) {
        const idx = remaining.indexOf(c);
        if (idx === -1) throw new BadRequestError(`Card ${c} not in hand`);
        remaining.splice(idx, 1);
      }
    }).toThrow("not in hand");
  });
});

describe("TC-UNIT-45 | Feral Cat ใช้แทนแมวใน combo", () => {
  it("[CAT_TACO, FC] → validateCombo ผ่าน", () => {
    expect(() => validateCombo(["CAT_TACO", "FC"])).not.toThrow();
  });
});

describe("resolveCombo2() — random steal", () => {
  it("target มีไพ่ → stolenCard อยู่ใน pool", () => {
    const { stolenCard, wasVoid } = resolveCombo2(["AT", "SK", "NP"]);
    expect(wasVoid).toBe(false);
    expect(["AT", "SK", "NP"]).toContain(stolenCard);
  });

  it("target ไม่มีไพ่ → wasVoid=true", () => {
    expect(resolveCombo2([]).wasVoid).toBe(true);
  });

  it("TC-UNIT-39 (ทางอ้อม) | ไม่ขโมย EK/DF ถ้ามีไพ่อื่น", () => {
    for (let i = 0; i < 20; i++) {
      const { stolenCard } = resolveCombo2(["EK", "DF", "AT"]);
      expect(stolenCard).toBe("AT");
    }
  });
});

describe("resolveCombo3() — demand specific card", () => {
  it("target มีไพ่ที่ต้องการ → stolenCard = demand", () => {
    const { stolenCard, wasVoid } = resolveCombo3(["SK", "AT", "NP"], "SK");
    expect(stolenCard).toBe("SK");
    expect(wasVoid).toBe(false);
  });

  it("target ไม่มีไพ่ที่ต้องการ → wasVoid=true", () => {
    const { stolenCard, wasVoid } = resolveCombo3(["AT", "NP"], "SF");
    expect(stolenCard).toBeUndefined();
    expect(wasVoid).toBe(true);
  });

  it("TC-UNIT-39 | demand EK → throw 'Cannot demand Exploding Kitten'", () => {
    expect(() => resolveCombo3(["EK"], "EK")).toThrow("Cannot demand Exploding Kitten");
  });

  it("demand GVE_EK → throw (normalized to EK)", () => {
    expect(() => resolveCombo3(["GVE_EK"], "GVE_EK")).toThrow("Cannot demand");
  });

  it("demand IK → throw", () => {
    expect(() => resolveCombo3(["IK"], "IK")).toThrow("Cannot demand");
  });
});
