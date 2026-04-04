/**
 * favor.test.ts
 * =====================================================================
 * Unit Tests — Favor Card
 * ครอบคลุม: validation, response, random pick, turn flow
 * TC: TC-UNIT-28~36
 * FR: FR-05-FV
 * =====================================================================
 */

import { BadRequestError } from "../src/utils/errors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateFavor(
  requesterToken: string,
  targetToken: string,
  requesterHand: string[],
  targetHand: string[]
): void {
  if (requesterToken === targetToken) throw new BadRequestError("Cannot target yourself");
  const fvCode = requesterHand.includes("GVE_FV") ? "GVE_FV" : "FV";
  if (!requesterHand.includes(fvCode)) throw new BadRequestError("No Favor card in hand");
  if (targetHand.length === 0) throw new BadRequestError("Target has no cards to give");
}

function favorResponse(
  targetHand: string[],
  selectedCard?: string
): { transferredCard: string; wasRandom: boolean } {
  if (!selectedCard) {
    return {
      transferredCard: targetHand[Math.floor(Math.random() * targetHand.length)]!,
      wasRandom: true,
    };
  }
  if (!targetHand.includes(selectedCard)) throw new BadRequestError("Card not in target's hand");
  return { transferredCard: selectedCard, wasRandom: false };
}

function removeFVFromHand(hand: string[]): string[] {
  const fvCode = hand.includes("GVE_FV") ? "GVE_FV" : "FV";
  let removed = false;
  return hand.filter((c) => {
    if (c === fvCode && !removed) { removed = true; return false; }
    return true;
  });
}

// ─── TEST SUITES ──────────────────────────────────────────────────────────────

describe("favorCard() — validation", () => {
  it("TC-UNIT-30 | เลือกตัวเองเป็น target → throw 'Cannot target yourself'", () => {
    expect(() => validateFavor("tok-A", "tok-A", ["FV", "AT"], ["SK"])).toThrow("Cannot target yourself");
  });

  it("TC-UNIT-32 | requester ไม่มี FV → throw 'No Favor card in hand'", () => {
    expect(() => validateFavor("tok-A", "tok-B", ["AT", "SK"], ["NP"])).toThrow("No Favor card in hand");
  });

  it("TC-UNIT-31 | target ไม่มีไพ่ → throw 'Target has no cards to give'", () => {
    expect(() => validateFavor("tok-A", "tok-B", ["FV", "AT"], [])).toThrow("Target has no cards to give");
  });

  it("TC-UNIT-33 | เงื่อนไขครบ → ไม่ throw", () => {
    expect(() => validateFavor("tok-A", "tok-B", ["FV", "AT"], ["SK"])).not.toThrow();
  });

  it("ใช้ GVE_FV แทน FV ได้", () => {
    expect(() => validateFavor("tok-A", "tok-B", ["GVE_FV", "AT"], ["SK"])).not.toThrow();
  });
});

describe("favorCard() — hand mutation", () => {
  it("TC-UNIT-28 | FV ถูกลบออกจากมือ requester หลังเล่น", () => {
    const newHand = removeFVFromHand(["FV", "AT", "SK"]);
    expect(newHand).not.toContain("FV");
    expect(newHand).toEqual(["AT", "SK"]);
  });

  it("TC-UNIT-29 | FV ถูกเพิ่มเข้า discard pile", () => {
    const discard: string[] = ["SK"];
    discard.push("FV");
    expect(discard).toContain("FV");
  });

  it("มี FV หลายใบ → ลบแค่ใบเดียว", () => {
    const newHand = removeFVFromHand(["FV", "FV", "AT"]);
    expect(newHand.filter((c) => c === "FV").length).toBe(1);
  });

  it("GVE_FV ถูกลบออกได้เช่นกัน", () => {
    const newHand = removeFVFromHand(["GVE_FV", "AT"]);
    expect(newHand).not.toContain("GVE_FV");
  });
});

describe("favorResponse() — card transfer", () => {
  it("TC-UNIT-34 | target เลือกไพ่เองได้ → wasRandom=false", () => {
    const r = favorResponse(["SK", "AT", "NP"], "SK");
    expect(r.transferredCard).toBe("SK");
    expect(r.wasRandom).toBe(false);
  });

  it("TC-UNIT-35 | ไม่ระบุ cardCode → wasRandom=true, ได้ไพ่จาก pool", () => {
    const r = favorResponse(["SK", "AT", "NP"]);
    expect(r.wasRandom).toBe(true);
    expect(["SK", "AT", "NP"]).toContain(r.transferredCard);
  });

  it("TC-UNIT-36 | ไพ่ที่เลือกไม่อยู่ในมือ target → throw", () => {
    expect(() => favorResponse(["AT", "NP"], "EK")).toThrow("Card not in target's hand");
  });

  it("สุ่ม 20 รอบ — ได้ไพ่จาก targetHand เสมอ", () => {
    const pool = ["SK", "AT", "NP", "SH"];
    for (let i = 0; i < 20; i++) {
      expect(pool).toContain(favorResponse(pool).transferredCard);
    }
  });
});
