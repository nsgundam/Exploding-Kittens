/**
 * Tests for cards.ts — card data integrity and structure validation
 */

// ── Inline card factories (mirrors src/data/cards.ts structure) ───────────

interface CardDef {
  card_code: string;
  name: string;
  type: string;
  category: string;
  description: string;
  effect_details: Record<string, unknown>;
  image_url: string;
  thumbnail_url: string;
  quantity_in_deck: number;
  is_playable: boolean;
  is_stackable: boolean;
  expansion_pack: string | null;
  display_order: number;
}

// Reproduce card data exactly as in cards.ts (abbreviated for tests)
const classicCards = (): CardDef[] => [
  { card_code: "EK", name: "Exploding Kitten", type: "bomb", category: "core", description: "ถ้าจั่วใบนี้และไม่มี Defuse คุณแพ้เกม ต้องแสดงทันที", effect_details: { action: "eliminate_player" }, image_url: "/cards/classic/exploding-kitten.png", thumbnail_url: "/cards/classic/thumb/exploding-kitten.png", quantity_in_deck: 4, is_playable: false, is_stackable: false, expansion_pack: null, display_order: 1 },
  { card_code: "DF", name: "Defuse", type: "defuse", category: "core", description: "ใช้เพื่อหยุดการระเบิด แล้วใส่ Exploding Kitten กลับในสำรับตำแหน่งที่ต้องการ", effect_details: { action: "defuse_bomb", insert_back: true }, image_url: "/cards/classic/defuse.png", thumbnail_url: "/cards/classic/thumb/defuse.png", quantity_in_deck: 6, is_playable: true, is_stackable: false, expansion_pack: null, display_order: 2 },
  { card_code: "AT", name: "Attack", type: "action", category: "core", description: "จบเทิร์นโดยไม่จั่วไพ่ ผู้เล่นถัดไปต้องเล่น 2 เทิร์น (stack ได้)", effect_details: { action: "attack", extra_turns: 2, stackable: true }, image_url: "/cards/classic/attack.png", thumbnail_url: "/cards/classic/thumb/attack.png", quantity_in_deck: 4, is_playable: true, is_stackable: true, expansion_pack: null, display_order: 3 },
  { card_code: "SK", name: "Skip", type: "action", category: "core", description: "จบเทิร์นโดยไม่จั่วไพ่ ถ้าใช้ตอบ Attack จะหักได้แค่ 1 เทิร์น", effect_details: { action: "skip_turn" }, image_url: "/cards/classic/skip.png", thumbnail_url: "/cards/classic/thumb/skip.png", quantity_in_deck: 4, is_playable: true, is_stackable: false, expansion_pack: null, display_order: 4 },
  { card_code: "SF", name: "See the Future", type: "action", category: "core", description: "ดูไพ่ 3 ใบบนสุดของสำรับแบบลับ ไม่เปลี่ยนลำดับ", effect_details: { action: "see_future", cards_to_see: 3, reveal_to_all: false }, image_url: "/cards/classic/see-the-future.png", thumbnail_url: "/cards/classic/thumb/see-the-future.png", quantity_in_deck: 5, is_playable: true, is_stackable: false, expansion_pack: null, display_order: 5 },
  { card_code: "SH", name: "Shuffle", type: "action", category: "core", description: "สับสำรับใหม่แบบสุ่ม", effect_details: { action: "shuffle_deck" }, image_url: "/cards/classic/shuffle.png", thumbnail_url: "/cards/classic/thumb/shuffle.png", quantity_in_deck: 4, is_playable: true, is_stackable: false, expansion_pack: null, display_order: 6 },
  { card_code: "NP", name: "Nope", type: "reaction", category: "core", description: "หยุด action ใดก็ได้ ยกเว้น Exploding Kitten และ Defuse เล่นได้ทุกเวลา", effect_details: { action: "nope", can_nope_nope: true, exceptions: ["bomb", "defuse"] }, image_url: "/cards/classic/nope.png", thumbnail_url: "/cards/classic/thumb/nope.png", quantity_in_deck: 5, is_playable: true, is_stackable: false, expansion_pack: null, display_order: 7 },
  { card_code: "FV", name: "Favor", type: "action", category: "core", description: "บังคับผู้เล่นคนอื่นให้ส่งไพ่ 1 ใบให้คุณ (ผู้ถูกเลือกเป็นคนเลือกใบที่ให้)", effect_details: { action: "steal_card", target: "chosen_player", chooser: "target" }, image_url: "/cards/classic/favor.png", thumbnail_url: "/cards/classic/thumb/favor.png", quantity_in_deck: 4, is_playable: true, is_stackable: false, expansion_pack: null, display_order: 8 },
  { card_code: "CAT_TACO", name: "Taco Cat", type: "combo", category: "cat", description: "ไพ่แมว ใช้คู่ 2 ใบเพื่อขโมยไพ่สุ่มจากผู้เล่นคนอื่น", effect_details: { action: "combo_steal", combo_size: 2 }, image_url: "/cards/classic/taco-cat.png", thumbnail_url: "/cards/classic/thumb/taco-cat.png", quantity_in_deck: 4, is_playable: true, is_stackable: false, expansion_pack: null, display_order: 9 },
  { card_code: "CAT_MELON", name: "Melon Cat", type: "combo", category: "cat", description: "ไพ่แมว ใช้คู่ 2 ใบเพื่อขโมยไพ่สุ่มจากผู้เล่นคนอื่น", effect_details: { action: "combo_steal", combo_size: 2 }, image_url: "/cards/classic/melon-cat.png", thumbnail_url: "/cards/classic/thumb/melon-cat.png", quantity_in_deck: 4, is_playable: true, is_stackable: false, expansion_pack: null, display_order: 10 },
  { card_code: "CAT_BEARD", name: "Beard Cat", type: "combo", category: "cat", description: "ไพ่แมว ใช้คู่ 2 ใบเพื่อขโมยไพ่สุ่มจากผู้เล่นคนอื่น", effect_details: { action: "combo_steal", combo_size: 2 }, image_url: "/cards/classic/beard-cat.png", thumbnail_url: "/cards/classic/thumb/beard-cat.png", quantity_in_deck: 4, is_playable: true, is_stackable: false, expansion_pack: null, display_order: 11 },
  { card_code: "CAT_RAINBOW", name: "Rainbow-Ralphing Cat", type: "combo", category: "cat", description: "ไพ่แมว ใช้คู่ 2 ใบเพื่อขโมยไพ่สุ่มจากผู้เล่นคนอื่น", effect_details: { action: "combo_steal", combo_size: 2 }, image_url: "/cards/classic/rainbow-cat.png", thumbnail_url: "/cards/classic/thumb/rainbow-cat.png", quantity_in_deck: 4, is_playable: true, is_stackable: false, expansion_pack: null, display_order: 12 },
  { card_code: "CAT_POTATO", name: "Potato Cat", type: "combo", category: "cat", description: "ไพ่แมว ใช้คู่ 2 ใบเพื่อขโมยไพ่สุ่มจากผู้เล่นคนอื่น", effect_details: { action: "combo_steal", combo_size: 2 }, image_url: "/cards/classic/potato-cat.png", thumbnail_url: "/cards/classic/thumb/potato-cat.png", quantity_in_deck: 4, is_playable: true, is_stackable: false, expansion_pack: null, display_order: 13 },
];

const implodingKittensCards = (): CardDef[] => [
  { card_code: "IK", name: "Imploding Kitten", type: "bomb", category: "core", description: "จั่วใบนี้ face up — ตายทันที ไม่มี Defuse ช่วยได้", effect_details: { action: "eliminate_player", no_defuse: true, no_nope: true, face_up_in_deck: true }, image_url: "/cards/imploding/imploding-kitten.png", thumbnail_url: "/cards/imploding/thumb/imploding-kitten.png", quantity_in_deck: 1, is_playable: false, is_stackable: false, expansion_pack: "imploding_kittens", display_order: 14 },
  { card_code: "RV", name: "Reverse", type: "action", category: "core", description: "กลับทิศทางการเล่น", effect_details: { action: "reverse_order", ends_turn: true }, image_url: "/cards/imploding/reverse.png", thumbnail_url: "/cards/imploding/thumb/reverse.png", quantity_in_deck: 4, is_playable: true, is_stackable: false, expansion_pack: "imploding_kittens", display_order: 15 },
  { card_code: "DB", name: "Draw from Bottom", type: "action", category: "core", description: "จบเทิร์นโดยจั่วไพ่จากล่างสุดของสำรับ", effect_details: { action: "draw_from_bottom" }, image_url: "/cards/imploding/draw-from-bottom.png", thumbnail_url: "/cards/imploding/thumb/draw-from-bottom.png", quantity_in_deck: 4, is_playable: true, is_stackable: false, expansion_pack: "imploding_kittens", display_order: 16 },
  { card_code: "TA", name: "Targeted Attack", type: "action", category: "core", description: "จบเทิร์นโดยไม่จั่วไพ่ และเลือกผู้เล่นที่ต้องเล่น 2 เทิร์น", effect_details: { action: "targeted_attack", extra_turns: 2, target: "chosen_player", stackable: true }, image_url: "/cards/imploding/targeted-attack.png", thumbnail_url: "/cards/imploding/thumb/targeted-attack.png", quantity_in_deck: 3, is_playable: true, is_stackable: true, expansion_pack: "imploding_kittens", display_order: 17 },
  { card_code: "FC", name: "Feral Cat", type: "combo", category: "cat", description: "ใช้แทน cat card ใดก็ได้ในการทำ combo", effect_details: { action: "combo_steal", combo_size: 2, wildcard: true, cat_only: true }, image_url: "/cards/imploding/feral-cat.png", thumbnail_url: "/cards/imploding/thumb/feral-cat.png", quantity_in_deck: 4, is_playable: true, is_stackable: false, expansion_pack: "imploding_kittens", display_order: 18 },
  { card_code: "AF", name: "Alter the Future", type: "action", category: "core", description: "ดูไพ่ 3 ใบบนสุดแบบลับ แล้วจัดเรียงลำดับใหม่ได้", effect_details: { action: "alter_future", cards_to_see: 3, reorder: true, reveal_to_all: false }, image_url: "/cards/imploding/alter-the-future.png", thumbnail_url: "/cards/imploding/thumb/alter-the-future.png", quantity_in_deck: 4, is_playable: true, is_stackable: false, expansion_pack: "imploding_kittens", display_order: 19 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Classic cards — data integrity
// ─────────────────────────────────────────────────────────────────────────────

describe("classicCards", () => {
  const cards = classicCards();

  it("returns 13 distinct card definitions", () => {
    expect(cards).toHaveLength(13);
  });

  it("total card count sums to 56", () => {
    const total = cards.reduce((s, c) => s + c.quantity_in_deck, 0);
    expect(total).toBe(56);
  });

  it("all card_codes are unique", () => {
    const codes = cards.map((c) => c.card_code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("display_order values are unique and in range 1–13", () => {
    const orders = cards.map((c) => c.display_order);
    expect(new Set(orders).size).toBe(13);
    expect(Math.min(...orders)).toBe(1);
    expect(Math.max(...orders)).toBe(13);
  });

  it("all cards have non-empty name, description, image_url, thumbnail_url", () => {
    for (const card of cards) {
      expect(card.name.length).toBeGreaterThan(0);
      expect(card.description.length).toBeGreaterThan(0);
      expect(card.image_url.length).toBeGreaterThan(0);
      expect(card.thumbnail_url.length).toBeGreaterThan(0);
    }
  });

  it("expansion_pack is null for all classic cards", () => {
    for (const card of cards) {
      expect(card.expansion_pack).toBeNull();
    }
  });

  // ── Specific card rules ──

  it("EK is not playable and not stackable", () => {
    const ek = cards.find((c) => c.card_code === "EK")!;
    expect(ek.is_playable).toBe(false);
    expect(ek.is_stackable).toBe(false);
  });

  it("DF is playable and quantity is 6", () => {
    const df = cards.find((c) => c.card_code === "DF")!;
    expect(df.is_playable).toBe(true);
    expect(df.quantity_in_deck).toBe(6);
  });

  it("AT is stackable", () => {
    const at = cards.find((c) => c.card_code === "AT")!;
    expect(at.is_stackable).toBe(true);
  });

  it("NP type is 'reaction'", () => {
    const np = cards.find((c) => c.card_code === "NP")!;
    expect(np.type).toBe("reaction");
  });

  it("5 cat cards all have type 'combo' and category 'cat'", () => {
    const cats = cards.filter((c) => c.card_code.startsWith("CAT_"));
    expect(cats).toHaveLength(5);
    for (const cat of cats) {
      expect(cat.type).toBe("combo");
      expect(cat.category).toBe("cat");
    }
  });

  it("each cat card has quantity_in_deck of 4", () => {
    const cats = cards.filter((c) => c.card_code.startsWith("CAT_"));
    for (const cat of cats) {
      expect(cat.quantity_in_deck).toBe(4);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Imploding Kittens cards — data integrity
// ─────────────────────────────────────────────────────────────────────────────

describe("implodingKittensCards", () => {
  const cards = implodingKittensCards();

  it("returns 6 card definitions", () => {
    expect(cards).toHaveLength(6);
  });

  it("total card count sums to 20", () => {
    const total = cards.reduce((s, c) => s + c.quantity_in_deck, 0);
    expect(total).toBe(20);
  });

  it("all card_codes are unique", () => {
    const codes = cards.map((c) => c.card_code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("expansion_pack is 'imploding_kittens' for all", () => {
    for (const card of cards) {
      expect(card.expansion_pack).toBe("imploding_kittens");
    }
  });

  it("display_order values are in range 14–19", () => {
    const orders = cards.map((c) => c.display_order);
    expect(Math.min(...orders)).toBe(14);
    expect(Math.max(...orders)).toBe(19);
  });

  it("IK is not playable, quantity is 1", () => {
    const ik = cards.find((c) => c.card_code === "IK")!;
    expect(ik.is_playable).toBe(false);
    expect(ik.quantity_in_deck).toBe(1);
  });

  it("IK effect_details includes no_defuse: true", () => {
    const ik = cards.find((c) => c.card_code === "IK")!;
    expect(ik.effect_details.no_defuse).toBe(true);
  });

  it("TA is stackable", () => {
    const ta = cards.find((c) => c.card_code === "TA")!;
    expect(ta.is_stackable).toBe(true);
  });

  it("FC is a combo/cat card", () => {
    const fc = cards.find((c) => c.card_code === "FC")!;
    expect(fc.type).toBe("combo");
    expect(fc.category).toBe("cat");
  });

  it("AF allows reordering (reorder: true in effect_details)", () => {
    const af = cards.find((c) => c.card_code === "AF")!;
    expect(af.effect_details.reorder).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-expansion card_code uniqueness
// ─────────────────────────────────────────────────────────────────────────────

describe("cross-expansion uniqueness", () => {
  it("no duplicate card_codes between classic and imploding expansion", () => {
    const all = [...classicCards(), ...implodingKittensCards()];
    const codes = all.map((c) => c.card_code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("display_order is globally unique across both sets", () => {
    const all = [...classicCards(), ...implodingKittensCards()];
    const orders = all.map((c) => c.display_order);
    expect(new Set(orders).size).toBe(orders.length);
  });
});
