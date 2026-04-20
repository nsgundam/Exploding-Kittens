import React, { useEffect, useRef, useState } from "react";

export interface GameLogPanelProps {
  gameLogs: string[];
}

interface LogEntry {
  id: number;
  text: string;
  icon: string;
  bg: string;
  textColor: string;
}

// ── Card-specific themes (cardCode → style) ────────────────────────────────
const CARD_THEMES: Record<string, { icon: string; bg: string; textColor: string }> = {
  AT:             { icon: "⚡", bg: "linear-gradient(100deg,rgba(60,5,5,0.94),rgba(100,12,12,0.82))",   textColor: "#fca5a5" },
  TA:             { icon: "🎯", bg: "linear-gradient(100deg,rgba(60,5,5,0.94),rgba(100,12,12,0.82))",   textColor: "#fca5a5" },
  SK:             { icon: "⏭️", bg: "linear-gradient(100deg,rgba(5,35,18,0.94),rgba(8,60,28,0.82))",    textColor: "#6ee7b7" },
  SF:             { icon: "🔮", bg: "linear-gradient(100deg,rgba(5,18,45,0.94),rgba(8,32,75,0.82))",    textColor: "#93c5fd" },
  AF:             { icon: "✨", bg: "linear-gradient(100deg,rgba(12,5,45,0.94),rgba(20,10,75,0.82))",   textColor: "#c4b5fd" },
  SH:             { icon: "🔀", bg: "linear-gradient(100deg,rgba(10,5,40,0.94),rgba(18,8,70,0.82))",    textColor: "#c4b5fd" },
  RV:             { icon: "🔄", bg: "linear-gradient(100deg,rgba(5,28,38,0.94),rgba(8,48,65,0.82))",    textColor: "#7dd3fc" },
  FV:             { icon: "🤝", bg: "linear-gradient(100deg,rgba(38,24,0,0.94),rgba(65,40,0,0.82))",    textColor: "#fcd34d" },
  NP:             { icon: "🚫", bg: "linear-gradient(100deg,rgba(55,8,8,0.94),rgba(95,12,12,0.82))",    textColor: "#fca5a5" },
  DF:             { icon: "🛡️", bg: "linear-gradient(100deg,rgba(5,40,15,0.94),rgba(8,65,24,0.82))",    textColor: "#86efac" },
  EK:             { icon: "💣", bg: "linear-gradient(100deg,rgba(55,22,0,0.94),rgba(90,36,0,0.82))",    textColor: "#fcd34d" },
  IK:             { icon: "🐱", bg: "linear-gradient(100deg,rgba(25,5,50,0.94),rgba(42,8,85,0.82))",    textColor: "#e9d5ff" },
  CAT_TACO:       { icon: "🌮", bg: "linear-gradient(100deg,rgba(38,20,5,0.94),rgba(65,34,8,0.82))",    textColor: "#fde68a" },
  CAT_WATERMELON: { icon: "🍉", bg: "linear-gradient(100deg,rgba(5,38,15,0.94),rgba(8,65,25,0.82))",    textColor: "#86efac" },
  CAT_POTATO:     { icon: "🥔", bg: "linear-gradient(100deg,rgba(38,30,5,0.94),rgba(65,50,8,0.82))",    textColor: "#fde68a" },
  CAT_BEARD:      { icon: "🧔", bg: "linear-gradient(100deg,rgba(15,10,38,0.94),rgba(25,15,65,0.82))",  textColor: "#c4b5fd" },
  CAT_RAINBOW:    { icon: "🌈", bg: "linear-gradient(100deg,rgba(35,5,35,0.94),rgba(60,8,60,0.82))",    textColor: "#f9a8d4" },
  GVE_AT:         { icon: "⚡", bg: "linear-gradient(100deg,rgba(60,5,5,0.94),rgba(100,12,12,0.82))",   textColor: "#fca5a5" },
  GVE_SK:         { icon: "⏭️", bg: "linear-gradient(100deg,rgba(5,35,18,0.94),rgba(8,60,28,0.82))",    textColor: "#6ee7b7" },
  GVE_DF:         { icon: "🛡️", bg: "linear-gradient(100deg,rgba(5,40,15,0.94),rgba(8,65,24,0.82))",    textColor: "#86efac" },
};

// ── Event-based themes (emoji prefix → style) ─────────────────────────────
const EVENT_THEMES: Array<{ match: RegExp; icon: string; bg: string; textColor: string }> = [
  { match: /^💣|^💥/, icon: "💣", bg: "linear-gradient(100deg,rgba(55,22,0,0.94),rgba(90,36,0,0.82))",    textColor: "#fcd34d" },
  { match: /^🛡/,      icon: "🛡️", bg: "linear-gradient(100deg,rgba(5,40,15,0.94),rgba(8,65,24,0.82))",    textColor: "#86efac" },
  { match: /^🏆/,      icon: "🏆", bg: "linear-gradient(100deg,rgba(25,38,5,0.94),rgba(42,65,8,0.82))",    textColor: "#bbf7d0" },
  { match: /^🚫/,      icon: "🚫", bg: "linear-gradient(100deg,rgba(55,8,8,0.94),rgba(95,12,12,0.82))",    textColor: "#fca5a5" },
  { match: /^🐱/,      icon: "🐱", bg: "linear-gradient(100deg,rgba(38,28,0,0.94),rgba(65,48,0,0.82))",    textColor: "#fde68a" },
  { match: /^🤝/,      icon: "🤝", bg: "linear-gradient(100deg,rgba(38,24,0,0.94),rgba(65,40,0,0.82))",    textColor: "#fcd34d" },
  { match: /^✨/,      icon: "✨", bg: "linear-gradient(100deg,rgba(12,5,45,0.94),rgba(20,10,75,0.82))",   textColor: "#c4b5fd" },
  { match: /^🎮/,      icon: "🎮", bg: "linear-gradient(100deg,rgba(10,5,32,0.94),rgba(18,10,55,0.82))",   textColor: "#c4b5fd" },
  { match: /^🃏|^⬇️/, icon: "🃏", bg: "linear-gradient(100deg,rgba(5,18,45,0.94),rgba(8,32,75,0.82))",    textColor: "#93c5fd" },
  { match: /^⏱️/,     icon: "⏱️", bg: "linear-gradient(100deg,rgba(38,28,5,0.94),rgba(65,48,8,0.82))",   textColor: "#fde68a" },
  { match: /^🔌|^🚪/, icon: "🔌", bg: "linear-gradient(100deg,rgba(15,12,10,0.94),rgba(28,22,15,0.82))",  textColor: "rgba(255,220,180,0.7)" },
  { match: /^⚙️/,     icon: "⚙️", bg: "linear-gradient(100deg,rgba(15,12,10,0.94),rgba(28,22,15,0.82))",  textColor: "rgba(255,220,180,0.7)" },
  { match: /^🔄/,      icon: "🔄", bg: "linear-gradient(100deg,rgba(5,28,38,0.94),rgba(8,48,65,0.82))",    textColor: "#7dd3fc" },
];

const DEFAULT_THEME = {
  icon: "▸",
  bg: "linear-gradient(100deg,rgba(15,10,5,0.94),rgba(28,18,8,0.82))",
  textColor: "rgba(255,230,190,0.75)",
};

// Parse cardCode from log text like "🎴 Arm007x เล่นไพ่ SK"
const CARD_CODE_RE = /\b(GVE_[A-Z_]+|CAT_[A-Z]+|AT|TA|SK|SF|AF|SH|RV|FV|NP|DF|EK|IK)\b/;

function resolveTheme(text: string): { icon: string; bg: string; textColor: string } {
  // 1) Card played — parse cardCode from text
  if (text.startsWith("🎴")) {
    const m = text.match(CARD_CODE_RE);
    if (m && CARD_THEMES[m[1]]) return CARD_THEMES[m[1]];
    return { icon: "🎴", bg: "linear-gradient(100deg,rgba(20,12,5,0.94),rgba(38,20,8,0.82))", textColor: "rgba(255,220,160,0.85)" };
  }
  // 2) Event emoji prefix
  for (const ev of EVENT_THEMES) {
    if (ev.match.test(text)) return ev;
  }
  return DEFAULT_THEME;
}

// ── Keyframe injection ─────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes glog-in {
  0%   { transform: translateX(-115%) skewX(-5deg); opacity: 0; }
  18%  { opacity: 1; }
  68%  { transform: translateX(0%) skewX(-5deg); }
  82%  { transform: translateX(0%) skewX(0deg); }
  100% { transform: translateX(0%) skewX(0deg); opacity: 1; }
}
@keyframes glog-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes glog-icon-pop {
  0%   { transform: scale(0) rotate(-18deg); opacity: 0; }
  55%  { transform: scale(1.22) rotate(4deg); opacity: 1; }
  80%  { transform: scale(0.93) rotate(-1deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes glog-ring {
  0%,55% { box-shadow: inset 0 0 0 1px rgba(255,215,70,0.45); }
  100%   { box-shadow: inset 0 0 0 1px transparent; }
}
`;

let _styleInjected = false;
function injectStyles() {
  if (_styleInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = KEYFRAMES;
  document.head.appendChild(el);
  _styleInjected = true;
}

let _idCounter = 0;
const MAX_VISIBLE = 3;

export function GameLogPanel({ gameLogs }: GameLogPanelProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const prevLogsRef = useRef<string[]>([]);

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    if (!gameLogs || gameLogs.length === 0) return;
    const prev = prevLogsRef.current;
    const newLogs = gameLogs.slice(prev.length);
    prevLogsRef.current = [...gameLogs];
    if (newLogs.length === 0) return;

    setEntries((old) => {
      const added: LogEntry[] = newLogs.map((text) => {
        const { icon, bg, textColor } = resolveTheme(text);
        // Strip leading emoji cluster + whitespace for display text
        const displayText = text.replace(/^[\p{Emoji}\uFE0F\u20E3\s]+/u, "").trim();
        return { id: ++_idCounter, text: displayText, icon, bg, textColor };
      });
      return [...old, ...added].slice(-MAX_VISIBLE);
    });
  }, [gameLogs]);

  if (!gameLogs || gameLogs.length === 0) return null;

  return (
    <div
      className="absolute left-3 top-1/2 -translate-y-1/2 z-20"
      style={{ width: "240px" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "0 2px 6px",
          borderBottom: "1px solid rgba(255,200,100,0.12)",
          marginBottom: "6px",
        }}
      >
        <span style={{ fontSize: "11px" }}>📋</span>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 800,
            letterSpacing: "2.5px",
            textTransform: "uppercase",
            color: "rgba(255,200,100,0.35)",
            fontFamily: "'Fredoka One', cursive",
          }}
        >
          Game Log
        </span>
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {entries.map((entry, i) => {
          const isLatest = i === entries.length - 1;
          const isOldest = entries.length === MAX_VISIBLE && i === 0;
          const delayS = (i * 0.055).toFixed(3);
          const iconDelayS = (i * 0.055 + 0.12).toFixed(3);

          return (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "7px 10px",
                borderRadius: "7px",
                background: entry.bg,
                position: "relative",
                overflow: "hidden",
                opacity: isOldest ? 0.48 : 1,
                transition: "opacity 0.35s",
                animation: [
                  `glog-in 0.5s cubic-bezier(0.22,1,0.36,1) ${delayS}s both`,
                  isLatest ? `glog-ring 2.2s 0.3s ease-out both` : "",
                ].filter(Boolean).join(", "),
              }}
            >
              {/* Shimmer */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "7px",
                  background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.08) 50%,transparent 100%)",
                  backgroundSize: "200% 100%",
                  animation: `glog-shimmer 1s ${delayS}s ease-out`,
                  pointerEvents: "none",
                }}
              />

              {/* Icon */}
              <span
                style={{
                  fontSize: "15px",
                  flexShrink: 0,
                  lineHeight: 1,
                  animation: `glog-icon-pop 0.4s cubic-bezier(0.175,0.885,0.32,1.275) ${iconDelayS}s both`,
                  display: "block",
                }}
              >
                {entry.icon}
              </span>

              {/* Text */}
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: entry.textColor,
                  letterSpacing: "0.2px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontFamily: "'Fredoka One', cursive",
                  lineHeight: 1.35,
                }}
              >
                {entry.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}