"use client";

import React from "react";
import { Card } from "@/components/game/Card";

export interface PlayerHandProps {
  myCards: string[];
  status: string;
  isMyTurn: boolean;
  onPlayCard: (cardCode: string, target?: string) => void;
}

export function PlayerHand({
  myCards,
  status,
  isMyTurn,
  onPlayCard,
}: PlayerHandProps) {
  if (status !== "PLAYING" && status !== "playing") return null;

  const mid = Math.floor(myCards.length / 2);

  return (
    <div className="flex items-end flex-1 justify-center z-50">
      {myCards.map((cardCode, i) => {
        const isActive =
          isMyTurn &&
          cardCode !== "DF" &&
          cardCode !== "EK" &&
          cardCode !== "GVE_EK";

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
