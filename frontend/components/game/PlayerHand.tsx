"use client";

import React from "react";
import { Card } from "@/components/game/Card";

export interface PlayerHandProps {
  myCards: string[];
  status: string;
  isMyTurn: boolean;
  onPlayCard: (cardCode: string, target?: string) => void;
  actionPending?: { message: string; cardCode: string; endTime: number } | null;
}

function ActionPendingBanner({ endTime }: { endTime: number }) {
  const [timeLeftStr, setTimeLeftStr] = React.useState("");

  React.useEffect(() => {
    const updateTime = () => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeftStr((remaining / 1000).toFixed(1));
    };
    updateTime();
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="bg-red-600/95 border-2 border-red-400 text-white px-6 py-2 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse backdrop-blur-sm text-center">
      <div className="font-bungee text-lg tracking-wider uppercase" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)"}}>
        DOES ANYONE WANT TO PLAY NOPE? <span className="text-yellow-300">{timeLeftStr}s</span>
      </div>
    </div>
  );
}

export function PlayerHand({
  myCards,
  status,
  isMyTurn,
  onPlayCard,
  actionPending,
}: PlayerHandProps) {
  if (status !== "PLAYING" && status !== "playing") return null;

  const mid = Math.floor(myCards.length / 2);

  return (
    <div className="flex items-end flex-1 justify-center z-50 relative">
      {actionPending && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none w-max z-50">
          <ActionPendingBanner endTime={actionPending.endTime} />
        </div>
      )}
      {myCards.map((cardCode, i) => {
        const isNopeCard = cardCode === "NP" || cardCode === "GVE_NP";
        let isActive = false;
        if (actionPending) {
          isActive = isNopeCard;
        } else {
          isActive =
            isMyTurn &&
            cardCode !== "DF" &&
            cardCode !== "EK" &&
            cardCode !== "GVE_EK";
        }

        return (
          <div
            key={`${i}-${cardCode}`}
            style={{
              transform: `rotate(${(i - mid) * 5}deg) translateY(${Math.abs(i - mid) * 4}px)`,
              marginLeft: i === 0 ? 0 : "-16px",
              zIndex: i === mid ? 5 : i,
              transition: "transform 0.2s ease, z-index 0s",
            }}
            onMouseEnter={(e) => {
              if (isActive) {
                (e.currentTarget as HTMLElement).style.transform =
                  "rotate(0deg) translateY(-24px) scale(1.08)";
                (e.currentTarget as HTMLElement).style.zIndex = "20";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform =
                `rotate(${(i - mid) * 5}deg) translateY(${Math.abs(i - mid) * 4}px)`;
              (e.currentTarget as HTMLElement).style.zIndex = String(
                i === mid ? 5 : i,
              );
            }}
          >
            <Card
              cardCode={cardCode}
              disabled={!isActive}
              onClick={() => onPlayCard(cardCode)}
            />
          </div>
        );
      })}
    </div>
  );
}
