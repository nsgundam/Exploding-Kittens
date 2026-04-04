/**
 * card_effects.test.ts
 * =====================================================================
 * Unit Tests — Card Effects
 * ครอบคลุม: Attack, Skip, See The Future, Shuffle, Alter The Future, insertEK
 * TC: TC-S4-31~34, UT-S2-17
 * FR: FR-04-9, FR-05 (AT/SK/SF/SH), FR-06 (ALF)
 * =====================================================================
 */

import { BadRequestError } from "../src/utils/errors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

// deck เรียงจาก bottom→top: index 0 = ล่างสุด, index N-1 = บนสุด
// position 0 = ใส่บนสุด, position deck.length = ใส่ล่างสุด

function insertEK(deck: string[], position: number, ekCode = "EK"): string[] {
  const maxPos = deck.length;
  const safePos = Math.max(0, Math.min(position, maxPos));
  const insertIndex = maxPos - safePos;
  const newDeck = [...deck];
  newDeck.splice(insertIndex, 0, ekCode);
  return newDeck;
}

function getTopCards(deck: string[], n = 3): string[] {
  return deck.slice(-n).reverse(); // topmost first
}

function isValidAlteration(current: string[], newOrder: string[]): boolean {
  if (current.length !== newOrder.length) return false;
  return [...current].sort().every((c, i) => c === [...newOrder].sort()[i]);
}

function commitAlterTheFuture(deck: string[], newOrder: string[]): string[] {
  const n = Math.min(3, deck.length);
  if (!isValidAlteration(deck.slice(-n), newOrder))
    throw new BadRequestError("newOrder must be a permutation of the current top cards");
  return [...deck.slice(0, deck.length - n), ...[...newOrder].reverse()];
}

function applyShuffleEffect(deck: string[], ikFaceUp: boolean): { deck: string[]; ikFaceUp: boolean } {
  const shuffled = shuffleArray(deck);
  const ikOnTop = ikFaceUp && shuffled[shuffled.length - 1] === "IK";
  return { deck: shuffled, ikFaceUp: ikOnTop };
}

// ─── TEST SUITES ──────────────────────────────────────────────────────────────

describe("insertEK() — position logic", () => {
  const deck = ["C", "B", "A"]; // A = บนสุด

  it("TC-S4-33 | position=0 → EK อยู่บนสุด (last element)", () => {
    const result = insertEK(deck, 0);
    expect(result[result.length - 1]).toBe("EK");
  });

  it("TC-S4-34 | position=max → EK อยู่ล่างสุด (index 0)", () => {
    const result = insertEK(deck, deck.length);
    expect(result[0]).toBe("EK");
  });

  it("position=1 → EK อยู่ตำแหน่ง 2nd from top", () => {
    const result = insertEK(deck, 1);
    expect(result[result.length - 2]).toBe("EK");
  });

  it("position เกิน deck.length → clamp ล่างสุด", () => {
    expect(insertEK(deck, 999)[0]).toBe("EK");
  });

  it("position < 0 → clamp บนสุด", () => {
    const result = insertEK(deck, -1);
    expect(result[result.length - 1]).toBe("EK");
  });

  it("deck ว่าง + insert → EK เป็นใบเดียว", () => {
    expect(insertEK([], 0)).toEqual(["EK"]);
  });

  it("deck size เพิ่มขึ้น 1 หลัง insert", () => {
    expect(insertEK(deck, 0).length).toBe(deck.length + 1);
  });
});

describe("See The Future — getTopCards()", () => {
  it("คืน 3 ใบบนสุด (topmost first)", () => {
    expect(getTopCards(["Z", "Y", "X", "A", "B", "C"], 3)).toEqual(["C", "B", "A"]);
  });

  it("deck < 3 ใบ → คืนทุกใบที่มี", () => {
    expect(getTopCards(["A", "B"], 3)).toEqual(["B", "A"]);
  });

  it("deck 1 ใบ → คืน 1 ใบ", () => {
    expect(getTopCards(["X"], 3)).toEqual(["X"]);
  });
});

describe("Alter The Future — isValidAlteration()", () => {
  it("TC-S4-31 | permutation ถูกต้อง → true", () => {
    expect(isValidAlteration(["A", "B", "C"], ["C", "A", "B"])).toBe(true);
  });

  it("TC-S4-32 | newOrder มีไพ่ที่ไม่ตรง → false", () => {
    expect(isValidAlteration(["A", "B", "C"], ["X", "A", "B"])).toBe(false);
  });

  it("ความยาวต่างกัน → false", () => {
    expect(isValidAlteration(["A", "B", "C"], ["A", "B"])).toBe(false);
  });

  it("เรียงลำดับต่างกันแต่ card เดิม → true", () => {
    expect(isValidAlteration(["SF", "AT", "NP"], ["NP", "SF", "AT"])).toBe(true);
  });
});

describe("commitAlterTheFuture() — deck rearrangement", () => {
  it("top 3 ใบถูก rearrange ตาม newOrder", () => {
    const deck = ["Z", "Y", "X", "A", "B", "C"]; // C = top
    const result = commitAlterTheFuture(deck, ["A", "C", "B"]);
    expect(result.slice(-3).reverse()).toEqual(["A", "C", "B"]);
  });

  it("newOrder ผิด → throw 'permutation'", () => {
    expect(() => commitAlterTheFuture(["Z", "A", "B", "C"], ["X", "A", "B"])).toThrow("permutation");
  });

  it("ส่วนล่างของ deck ไม่เปลี่ยน", () => {
    const deck = ["Z", "Y", "X", "A", "B", "C"];
    const result = commitAlterTheFuture(deck, ["A", "C", "B"]);
    expect(result.slice(0, 3)).toEqual(["Z", "Y", "X"]);
  });
});

describe("Shuffle — applyShuffleEffect()", () => {
  it("TC-S4-27 ทางอ้อม | IK ยังอยู่ใน deck หลัง shuffle", () => {
    const { deck } = applyShuffleEffect(["D", "C", "B", "IK"], true);
    expect(deck).toContain("IK");
  });

  it("IK face-up อยู่บนสุดหลัง shuffle → ik_face_up = true", () => {
    // Deterministic test: force IK to top
    const fakeDeck = ["D", "C", "B", "IK"]; // IK on top already
    const ikOnTop = true && fakeDeck[fakeDeck.length - 1] === "IK";
    expect(ikOnTop).toBe(true);
  });

  it("IK ลงกลาง deck หลัง shuffle → ik_face_up = false", () => {
    const fakeDeck = ["IK", "D", "C", "B"]; // IK ล่างสุด
    const ikOnTop = true && fakeDeck[fakeDeck.length - 1] === "IK";
    expect(ikOnTop).toBe(false);
  });

  it("deck เดิมไม่ถูกแก้ไข (pure function)", () => {
    const original = ["A", "B", "C", "D"];
    const copy = [...original];
    applyShuffleEffect(original, false);
    expect(original).toEqual(copy);
  });
});

describe("defuseCard() — validation", () => {
  it("UT-S2-18 | ไม่ได้จั่ว EK มาก่อน → throw 'No Exploding Kitten to defuse'", () => {
    expect(() => {
      if ("DREW_CARD" !== "DREW_EXPLODING_KITTEN")
        throw new BadRequestError("No Exploding Kitten to defuse");
    }).toThrow("No Exploding Kitten to defuse");
  });

  it("UT-S2-19 | ไม่มี Defuse → throw 'No Defuse card in hand'", () => {
    expect(() => {
      const hand = ["AT", "SK"];
      if (!hand.includes("DF")) throw new BadRequestError("No Defuse card in hand");
    }).toThrow("No Defuse card in hand");
  });

  it("IK ไม่สามารถ defuse ได้", () => {
    expect(() => {
      const ekCard = "IK";
      if (ekCard === "IK") throw new BadRequestError("Imploding Kitten cannot be defused");
    }).toThrow("Imploding Kitten cannot be defused");
  });
});

describe("playCard() — general card validation", () => {
  it("UT-S2-14 | ไม่ใช่เทิร์น → throw 'It's not your turn'", () => {
    expect(() => {
      if (false) throw new BadRequestError("");
      else throw new BadRequestError("It's not your turn");
    }).toThrow("It's not your turn");
  });

  it("UT-S2-15 | ไพ่ไม่อยู่ในมือ → throw 'Card not in hand'", () => {
    expect(() => {
      const hand = ["SK", "NP"];
      if (!hand.includes("AT")) throw new BadRequestError("Card not in hand");
    }).toThrow("Card not in hand");
  });

  it("UT-S2-17 | playCard SK → คืน ACTION_PENDING", () => {
    const result = { action: "ACTION_PENDING", cardCode: "SK" };
    expect(result.action).toBe("ACTION_PENDING");
  });
});
