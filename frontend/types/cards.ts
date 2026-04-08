// ============================================================
// Card Configuration — Maps card_code to display metadata
// Must match backend CardMaster seed data exactly
// ============================================================

export interface CardDisplayConfig {
  emoji: string;
  label: string;
  color: string;
}

/**
 * CARD_CONFIG maps backend `card_code` values to frontend display properties.
 * 
 * Sources:
 * - Classic cards:          backend/prisma/cards.ts → classicCards()
 * - Imploding Kittens:     backend/prisma/cards.ts → implodingKittensCards()
 * - Good vs Evil:          backend/prisma/cards.ts → goodAndEvilCards()
 */
export const CARD_CONFIG: Record<string, CardDisplayConfig> = {
  // ── Classic Deck (56 cards) ─────────────────────────────────
  EK:           { emoji: "💣",  label: "EXPLODING KITTEN",   color: "#ef4444" },
  DF:           { emoji: "🛡️",  label: "DEFUSE",             color: "#4ade80" },
  AT:           { emoji: "⚡",  label: "ATTACK",             color: "#f97316" },
  SK:           { emoji: "⏭️",  label: "SKIP",               color: "#3b82f6" },
  SF:           { emoji: "🔮",  label: "SEE THE FUTURE",     color: "#06b6d4" },
  SH:           { emoji: "🔀",  label: "SHUFFLE",            color: "#8b5cf6" },
  NP:           { emoji: "🚫",  label: "NOPE",               color: "#dc2626" },
  FV:           { emoji: "🤝",  label: "FAVOR",              color: "#f59e0b" },
  CAT_TACO:     { emoji: "🌮",  label: "TACO CAT",           color: "#f59e0b" },
  CAT_MELON:    { emoji: "🍉",  label: "MELON CAT",          color: "#34d399" },
  CAT_BEARD:    { emoji: "🧔",  label: "BEARD CAT",          color: "#a78bfa" },
  CAT_RAINBOW:  { emoji: "🌈",  label: "RAINBOW CAT",        color: "#f472b6" },
  CAT_POTATO:   { emoji: "🥔",  label: "POTATO CAT",         color: "#fbbf24" },

  // ── Imploding Kittens Add-on (20 cards) ─────────────────────
  IK:           { emoji: "💥",  label: "IMPLODING KITTEN",   color: "#4c00ff" },
  RV:           { emoji: "🔄",  label: "REVERSE",            color: "#6366f1" },
  DB:           { emoji: "⬇️",  label: "DRAW FROM BOTTOM",   color: "#84cc16" },
  TA:           { emoji: "🎯",  label: "TARGETED ATTACK",    color: "#f97316" },
  FC:           { emoji: "🐱",  label: "FERAL CAT",          color: "#e879f9" },
  AF:           { emoji: "🔮",  label: "ALTER THE FUTURE",   color: "#14b8a6" },

  // ── Good vs Evil Deck (53 cards) ────────────────────────────
  GVE_EK:       { emoji: "💣",  label: "EXPLODING KITTEN",   color: "#ef4444" },
  GVE_DF:       { emoji: "🛡️",  label: "DEFUSE",             color: "#4ade80" },
  GVE_NP:       { emoji: "🚫",  label: "NOPE",               color: "#dc2626" },
  GVE_AT:       { emoji: "⚡",  label: "ATTACK",             color: "#f97316" },
  GVE_TA:       { emoji: "🎯",  label: "TARGETED ATTACK",    color: "#f97316" },
  GVE_SH:       { emoji: "🔀",  label: "SHUFFLE",            color: "#8b5cf6" },
  GVE_RF:       { emoji: "👁️",  label: "REVEAL THE FUTURE",  color: "#06b6d4" },
  GVE_FV:       { emoji: "🤝",  label: "FAVOR",              color: "#f59e0b" },
  GVE_RH:       { emoji: "🃏",  label: "RAISING HECK",       color: "#84cc16" },
  GVE_AG:       { emoji: "☄️",  label: "ARMAGEDDON",         color: "#ef4444" },
  GVE_GC:       { emoji: "😇",  label: "GODCAT",             color: "#fbbf24" },
  GVE_DC:       { emoji: "😈",  label: "DEVILCAT",           color: "#7c3aed" },
  GVE_FC:       { emoji: "🐱",  label: "FERAL CAT",          color: "#e879f9" },
  GVE_MC:       { emoji: "🧜",  label: "MERCAT",             color: "#38bdf8" },
};

/** Fallback config for unknown card codes */
export const UNKNOWN_CARD: CardDisplayConfig = {
  emoji: "🃏",
  label: "UNKNOWN",
  color: "#f5a623",
};

/** Get card display config safely */
export const getCardConfig = (cardCode: string): CardDisplayConfig => {
  return CARD_CONFIG[cardCode] ?? UNKNOWN_CARD;
};
