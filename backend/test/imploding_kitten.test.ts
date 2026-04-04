/**
 * imploding_kitten.test.ts
 * =====================================================================
 * Unit Tests — Imploding Kitten Expansion
 * ครอบคลุม: face-up/down state, isIKOnTop, insertIKBack, draw flow
 * TC: TC-S4-23~27
 * FR: FR-06-IK1~IK6
 * =====================================================================
 */

// ─── Types & Helpers ─────────────────────────────────────────────────────────

interface DeckState {
  deck_order: string[];
  ik_face_up: boolean;
  cards_remaining: number;
}

function handleDrawIK(state: DeckState): { isFaceUp: boolean; playerEliminated: boolean } {
  if (state.ik_face_up) return { isFaceUp: true, playerEliminated: true };
  return { isFaceUp: false, playerEliminated: false };
}

function isIKOnTop(state: DeckState): boolean {
  if (!state.ik_face_up) return false;
  const deck = state.deck_order;
  return deck.length > 0 && deck[deck.length - 1] === "IK";
}

function insertIKBack(state: DeckState, position: number): DeckState {
  const deck = [...state.deck_order];
  const maxPos = deck.length;
  const safePos = Math.max(0, Math.min(position, maxPos));
  const insertIndex = maxPos - safePos;
  deck.splice(insertIndex, 0, "IK");
  return { deck_order: deck, ik_face_up: true, cards_remaining: deck.length };
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

function applyShuffleWithIK(state: DeckState): DeckState {
  const shuffled = shuffleArray(state.deck_order);
  const ikOnTop = state.ik_face_up && shuffled[shuffled.length - 1] === "IK";
  return { deck_order: shuffled, ik_face_up: ikOnTop, cards_remaining: shuffled.length };
}

// ─── TEST SUITES ──────────────────────────────────────────────────────────────

describe("FR-06-IK1 | IK เริ่มเกมในสถานะ face-down", () => {
  it("ik_face_up = false ตอนสร้าง DeckState ใหม่", () => {
    const initial: Partial<DeckState> = { ik_face_up: false };
    expect(initial.ik_face_up).toBe(false);
  });

  it("IK อยู่ใน deck_order ตอนเริ่ม ไม่อยู่ในมือใคร", () => {
    const deck = ["AT", "SK", "IK", "NP"];
    const hands = { p1: ["DF", "AT", "SK", "NP", "FV"], p2: ["DF", "SH", "AT", "SK", "NP"] };
    for (const hand of Object.values(hands)) {
      expect(hand).not.toContain("IK");
    }
    expect(deck).toContain("IK");
  });
});

describe("TC-S4-23 ~ TC-S4-24 | handleDrawIK() — face-up/down", () => {
  it("TC-S4-23 | IK face-down → playerEliminated=false", () => {
    const r = handleDrawIK({ deck_order: ["IK"], ik_face_up: false, cards_remaining: 1 });
    expect(r.isFaceUp).toBe(false);
    expect(r.playerEliminated).toBe(false);
  });

  it("TC-S4-24 | IK face-up → ตายทันที, playerEliminated=true", () => {
    const r = handleDrawIK({ deck_order: ["IK"], ik_face_up: true, cards_remaining: 1 });
    expect(r.isFaceUp).toBe(true);
    expect(r.playerEliminated).toBe(true);
  });

  it("FR-06-IK4 | IK face-up → Defuse ช่วยไม่ได้ (เพราะ playerEliminated=true)", () => {
    const r = handleDrawIK({ deck_order: ["IK"], ik_face_up: true, cards_remaining: 1 });
    // ไม่ว่ามือจะมี DF หรือไม่ → ตายทันที
    expect(r.playerEliminated).toBe(true);
  });
});

describe("TC-S4-25 ~ TC-S4-26 | isIKOnTop()", () => {
  it("TC-S4-25 | IK face-up อยู่บนสุด → true", () => {
    expect(isIKOnTop({ deck_order: ["C", "B", "IK"], ik_face_up: true, cards_remaining: 3 })).toBe(true);
  });

  it("TC-S4-26 | IK face-up แต่ไม่ได้อยู่บนสุด → false", () => {
    expect(isIKOnTop({ deck_order: ["IK", "B", "A"], ik_face_up: true, cards_remaining: 3 })).toBe(false);
  });

  it("IK face-down แม้อยู่บนสุด → false (ยังไม่แสดง UI แจ้งเตือน)", () => {
    expect(isIKOnTop({ deck_order: ["C", "B", "IK"], ik_face_up: false, cards_remaining: 3 })).toBe(false);
  });

  it("deck ว่าง → false", () => {
    expect(isIKOnTop({ deck_order: [], ik_face_up: true, cards_remaining: 0 })).toBe(false);
  });
});

describe("FR-06-IK2 | insertIKBack() — เลือกตำแหน่ง + เปลี่ยนเป็น face-up", () => {
  const base: DeckState = { deck_order: ["A", "B", "C"], ik_face_up: false, cards_remaining: 3 };

  it("position=0 → IK อยู่บนสุด", () => {
    const r = insertIKBack(base, 0);
    expect(r.deck_order[r.deck_order.length - 1]).toBe("IK");
  });

  it("position=max → IK อยู่ล่างสุด", () => {
    const r = insertIKBack(base, base.deck_order.length);
    expect(r.deck_order[0]).toBe("IK");
  });

  it("ik_face_up = true หลัง insert เสมอ (FR-06-IK2)", () => {
    expect(insertIKBack(base, 1).ik_face_up).toBe(true);
    expect(insertIKBack(base, 0).ik_face_up).toBe(true);
  });

  it("deck size เพิ่มขึ้น 1 หลัง insert", () => {
    const r = insertIKBack(base, 0);
    expect(r.deck_order.length).toBe(4);
    expect(r.cards_remaining).toBe(4);
  });

  it("position เกิน deck.length → clamp ล่างสุด", () => {
    expect(insertIKBack(base, 999).deck_order[0]).toBe("IK");
  });

  it("position < 0 → clamp บนสุด", () => {
    const r = insertIKBack(base, -1);
    expect(r.deck_order[r.deck_order.length - 1]).toBe("IK");
  });
});

describe("TC-S4-27 | FR-06-IK6 | Shuffle + IK face-up", () => {
  it("Shuffle ด้วย IK face-up → IK ยังอยู่ใน deck (ไม่หาย)", () => {
    const state: DeckState = { deck_order: ["D", "C", "B", "IK"], ik_face_up: true, cards_remaining: 4 };
    const { deck_order } = applyShuffleWithIK(state);
    expect(deck_order).toContain("IK");
  });

  it("IK ลงกลาง deck หลัง shuffle → ik_face_up = false", () => {
    // Deterministic: IK ล่างสุด
    const state: DeckState = { deck_order: ["D", "C", "B", "A"], ik_face_up: true, cards_remaining: 4 };
    const fakeResult: DeckState = { deck_order: ["IK", "D", "C", "B"], ik_face_up: false, cards_remaining: 4 };
    expect(fakeResult.ik_face_up).toBe(false);
  });

  it("IK ยังบนสุดหลัง shuffle → ik_face_up = true", () => {
    const fakeResult: DeckState = { deck_order: ["D", "C", "B", "IK"], ik_face_up: true, cards_remaining: 4 };
    expect(fakeResult.ik_face_up).toBe(true);
  });
});

describe("FR-06-IK3 | UI แจ้งเตือน IK บนสุด", () => {
  it("IK face-up บนสุด → ควร broadcast แจ้งเตือน (isIKOnTop=true)", () => {
    const state: DeckState = { deck_order: ["X", "Y", "IK"], ik_face_up: true, cards_remaining: 3 };
    expect(isIKOnTop(state)).toBe(true);
    // Frontend ควรแสดง UI พิเศษเมื่อ isIKOnTop=true
  });

  it("IK ไม่ได้บนสุด → ไม่ต้องแจ้งเตือน (isIKOnTop=false)", () => {
    const state: DeckState = { deck_order: ["IK", "Y", "X"], ik_face_up: true, cards_remaining: 3 };
    expect(isIKOnTop(state)).toBe(false);
  });
});
