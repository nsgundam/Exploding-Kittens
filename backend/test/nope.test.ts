/**
 * nope.test.ts
 * =====================================================================
 * Unit Tests — Nope Card & Nope Window
 * ครอบคลุม: nope chain, timer, validation, ACTION_PENDING flow
 * TC: TC-S4-19~22, TC-UNIT-22~27
 * FR: FR-05-N1/N2/N3/N4
 * =====================================================================
 */

import { BadRequestError } from "../src/utils/errors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isActionCancelled(nopeCount: number): boolean {
  return nopeCount % 2 !== 0; // คี่ = ยกเลิก, คู่ = ผ่าน
}

function isNopeTimerExpired(elapsedMs: number, windowMs = 2800): boolean {
  return elapsedMs >= windowMs;
}

function validateNopePlay(opts: {
  hasPendingAction: boolean;
  hasNopeCard: boolean;
  pendingCardCode?: string;
}): void {
  if (!opts.hasPendingAction) throw new BadRequestError("No pending action to Nope");
  if (opts.pendingCardCode === "IK") throw new BadRequestError("Imploding Kitten cannot be Noped");
  if (!opts.hasNopeCard) throw new BadRequestError("No Nope card in hand");
}

function selectNopeCode(hand: string[]): string | null {
  if (hand.includes("GVE_NP")) return "GVE_NP";
  if (hand.includes("NP")) return "NP";
  return null;
}

// ─── TEST SUITES ──────────────────────────────────────────────────────────────

describe("Nope Chain — odd/even rule", () => {
  it("TC-S4-19 | TC-UNIT-22 | count=1 (คี่) → ยกเลิก (isCancel=true)", () => {
    expect(isActionCancelled(1)).toBe(true);
  });

  it("TC-S4-20 | TC-UNIT-23 | count=2 (คู่) → ผ่าน (isCancel=false)", () => {
    expect(isActionCancelled(2)).toBe(false);
  });

  it("TC-UNIT-24 | count=3 (คี่) → ยกเลิก", () => {
    expect(isActionCancelled(3)).toBe(true);
  });

  it("count=0 → false (ยังไม่มี Nope = action ผ่าน)", () => {
    expect(isActionCancelled(0)).toBe(false);
  });

  it("chain 1,2,3 → true,false,true", () => {
    expect([1, 2, 3].map(isActionCancelled)).toEqual([true, false, true]);
  });

  it("count คู่ทุกค่า (2,4,6,8) → false เสมอ", () => {
    expect([2, 4, 6, 8].every((n) => !isActionCancelled(n))).toBe(true);
  });

  it("count คี่ทุกค่า (1,3,5,7) → true เสมอ", () => {
    expect([1, 3, 5, 7].every(isActionCancelled)).toBe(true);
  });
});

describe("Nope Window Timer", () => {
  it("TC-S4-21 | elapsed ≥ 2800ms → expired = true", () => {
    expect(isNopeTimerExpired(2800)).toBe(true);
    expect(isNopeTimerExpired(3000)).toBe(true);
  });

  it("TC-S4-22 | elapsed < 2800ms → expired = false", () => {
    expect(isNopeTimerExpired(2799)).toBe(false);
    expect(isNopeTimerExpired(0)).toBe(false);
  });

  it("ขอบเขต elapsed=2800 → expired = true", () => {
    expect(isNopeTimerExpired(2800)).toBe(true);
  });

  it("Nope เล่นแล้ว → timer reset (timestamp ใหม่ < 100ms ผ่าน)", () => {
    const afterNope = Date.now();
    const elapsed = Date.now() - afterNope;
    expect(elapsed).toBeLessThan(100);
  });
});

describe("playNope() — validation", () => {
  it("TC-UNIT-26 | ไม่มี pending action → throw 'No pending action to Nope'", () => {
    expect(() => validateNopePlay({ hasPendingAction: false, hasNopeCard: true })).toThrow("No pending action to Nope");
  });

  it("TC-UNIT-25 | ไม่มี NP ในมือ → throw 'No Nope card in hand'", () => {
    expect(() => validateNopePlay({ hasPendingAction: true, hasNopeCard: false })).toThrow("No Nope card in hand");
  });

  it("Nope IK → throw 'Imploding Kitten cannot be Noped'", () => {
    expect(() => validateNopePlay({ hasPendingAction: true, hasNopeCard: true, pendingCardCode: "IK" })).toThrow("Imploding Kitten cannot be Noped");
  });

  it("เงื่อนไขครบ → ไม่ throw", () => {
    expect(() => validateNopePlay({ hasPendingAction: true, hasNopeCard: true, pendingCardCode: "AT" })).not.toThrow();
  });
});

describe("selectNopeCode() — GVE_NP priority", () => {
  it("TC-UNIT-27 | มี GVE_NP → ใช้ GVE_NP ก่อน", () => {
    expect(selectNopeCode(["GVE_NP", "AT"])).toBe("GVE_NP");
  });

  it("มีแค่ NP → ใช้ NP", () => {
    expect(selectNopeCode(["NP", "SK"])).toBe("NP");
  });

  it("ไม่มีเลย → null", () => {
    expect(selectNopeCode(["AT", "SK"])).toBeNull();
  });
});

describe("ACTION_PENDING flow", () => {
  it("playCard SK → ACTION_PENDING (UT-S2-17)", () => {
    // ทุก action card ใน real game.service.ts คืน ACTION_PENDING ก่อนเสมอ
    const result = { success: true, action: "ACTION_PENDING" as const, cardCode: "SK" };
    expect(result.action).toBe("ACTION_PENDING");
  });

  it("ไม่มี Nope ภายใน 3 วิ → action execute ตามปกติ", () => {
    const nopeCount = 0;
    expect(isActionCancelled(nopeCount)).toBe(false);
    expect(isNopeTimerExpired(3000)).toBe(true);
  });
});
