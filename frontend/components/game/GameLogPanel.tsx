import React from "react";

export interface GameLogPanelProps {
  gameLogs: string[];
}

export function GameLogPanel({ gameLogs }: GameLogPanelProps) {
  if (!gameLogs || gameLogs.length === 0) return null;

  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-60 z-20">
      <div
        className="rounded-2xl px-3 py-3 flex flex-col gap-1.5"
        style={{
          background: "rgba(240,220,170,0.72)",
          backdropFilter: "blur(18px)",
          border: "1px solid rgba(120,70,10,0.45)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          maxHeight: "220px",
          overflowY: "auto",
        }}
      >
        <div
          className="text-[10px] uppercase tracking-widest mb-1 pb-1 font-bold"
          style={{
            color: "rgba(120,60,0,0.85)",
            borderBottom: "1px solid rgba(120,60,0,0.2)",
          }}
        >
          📋 Game Log
        </div>
        {gameLogs.slice(-7).map((log, i, arr) => (
          <div
            key={i}
            className="text-xs leading-snug"
            style={{
              color:
                i === arr.length - 1
                  ? "rgba(60,30,0,0.95)"
                  : `rgba(80,40,0,${0.4 + i * 0.12})`,
            }}
          >
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
