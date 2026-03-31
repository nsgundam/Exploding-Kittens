import React from "react";

export interface EliminatedModalProps {
  isMe: boolean;
  displayName: string;
  onDismiss: () => void;
}

export function EliminatedModal({ isMe, displayName, onDismiss }: EliminatedModalProps) {
  if (!isMe) return null; // Only show screen to the player who actually blew up

  return (
    <div className="fixed inset-0 z-2000 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 flex flex-col items-center gap-4 p-8 rounded-3xl text-center"
        style={{
          width: "380px",
          background: "rgba(10,0,0,0.93)",
          border: "2px solid rgba(239,68,68,0.5)",
          boxShadow: "0 0 60px rgba(239,68,68,0.3), 0 24px 60px rgba(0,0,0,0.8)",
        }}
      >
        <div className="text-6xl animate-bounce">💥</div>
        <h2
          className="text-3xl font-black text-white font-bungee uppercase tracking-wider"
          style={{ textShadow: "0 0 20px rgba(239,68,68,0.8)" }}
        >
          {isMe ? "คุณแพ้แล้ว!" : `${displayName} แพ้แล้ว!`}
        </h2>
        <p className="text-gray-400 text-base">
          {isMe
            ? "คุณถูกระเบิด Exploding Kitten!"
            : `${displayName} ถูกระเบิดหลุดออกจากเกม`}
        </p>
        <button
          onClick={onDismiss}
          className="mt-2 px-8 py-3 rounded-2xl font-black text-white font-bungee text-lg transition-all hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #dc2626, #7f1d1d)",
            border: "2px solid rgba(239,68,68,0.5)",
            boxShadow: "0 4px 0 #450a0a",
          }}
        >
          ตกลง
        </button>
      </div>
    </div>
  );
}
