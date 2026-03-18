"use client";

// Map card_code → emoji, label, color
export const CARD_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  DF:         { emoji: "🛡️",  label: "DEFUSE",      color: "#4ade80" },
  GVE_DF:     { emoji: "🛡️",  label: "DEFUSE",      color: "#4ade80" },
  EK:         { emoji: "💣",  label: "EK",           color: "#ef4444" },
  GVE_EK:     { emoji: "💣",  label: "EK",           color: "#ef4444" },
  AT:         { emoji: "⚡",  label: "ATTACK",       color: "#f97316" },
  SK:         { emoji: "⏭️",  label: "SKIP",         color: "#3b82f6" },
  SHF:        { emoji: "🔀",  label: "SHUFFLE",      color: "#8b5cf6" },
  FV:         { emoji: "🔭",  label: "SEE FUTURE",   color: "#06b6d4" },
  NP:         { emoji: "🚫",  label: "NOPE",         color: "#dc2626" },
  CAT_TACO:   { emoji: "🌮",  label: "TACO CAT",     color: "#f59e0b" },
  CAT_BEARD:  { emoji: "🐱",  label: "BEARD CAT",    color: "#a78bfa" },
  CAT_MELO:   { emoji: "🍉",  label: "CATTER MELON", color: "#34d399" },
  CAT_POTATO: { emoji: "🥔",  label: "POTATO CAT",   color: "#fbbf24" },
  CAT_RC:     { emoji: "🚀",  label: "RAINBOW CAT",  color: "#f472b6" },
  SF:         { emoji: "🔮",  label: "SEE FUTURE",   color: "#06b6d4" },
  DR:         { emoji: "🎲",  label: "DRAW",         color: "#84cc16" },
  IK:         { emoji: "💥",  label: "IMPLODING",    color: "#ef4444" },
};

export interface PlayerHandProps {
  myCards: string[];
  status: string;
}

export function PlayerHand({ myCards, status }: PlayerHandProps) {
  if (!["playing", "PLAYING"].includes(status)) return null;

  return (
    <div className="flex items-end flex-1 justify-center">
      {myCards.map((cardCode, i) => {
        const cfg = CARD_CONFIG[cardCode] ?? { emoji: "🃏", label: cardCode, color: "#f5a623" };
        return (
          <div
            key={i}
            className="relative w-24 h-36 rounded-xl cursor-pointer transition-all duration-200 card-shadow group"
            style={{
              background: `linear-gradient(160deg, ${cfg.color}33, #1a0a02)`,
              border: `2px solid ${cfg.color}88`,
              transform: `rotate(${(i - 2) * 5}deg) translateY(${Math.abs(i - 2) * 4}px)`,
              marginLeft: i === 0 ? 0 : "-16px",
              zIndex: i === Math.floor(myCards.length / 2) ? 5 : i,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = `rotate(0deg) translateY(-24px) scale(1.12)`;
              (e.currentTarget as HTMLElement).style.zIndex = "10";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = `rotate(${(i - 2) * 5}deg) translateY(${Math.abs(i - 2) * 4}px)`;
              (e.currentTarget as HTMLElement).style.zIndex = String(i === Math.floor(myCards.length / 2) ? 5 : i);
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2">
              <span className="text-4xl">{cfg.emoji}</span>
              <span
                className="text-xs font-black tracking-wider text-center leading-none"
                style={{ color: cfg.color }}
              >
                {cfg.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
