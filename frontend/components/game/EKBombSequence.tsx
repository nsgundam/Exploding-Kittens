import React, { useEffect, useState } from "react";
import { Card } from "./Card";

interface EKBombSequenceProps {
  drawnCard: string;
  hasDefuse: boolean;
  onDefuse: () => void;
  onExplode: () => void;
  active: boolean;
}

export function EKBombSequence({
  drawnCard,
  hasDefuse,
  onDefuse,
  onExplode,
  active,
}: EKBombSequenceProps) {
  const [timeLeft, setTimeLeft] = useState(10); // Standard 10s fuse timer

  useEffect(() => {
    if (!active) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeLeft(10);
    const fuseInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(fuseInterval);
          onExplode(); // Explode if timer runs out!
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(fuseInterval);
  }, [active, onExplode]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 bg-red-950/90 flex flex-col items-center justify-center z-[3000] animate-fade-in backdrop-blur-md">
      
      {/* Background radial gradient pulsing effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600/30 via-transparent to-transparent animate-pulse-custom pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-2xl w-full p-8">
        
        {/* Warning Header */}
        <div className="text-center mb-8 animate-bounce">
          <span className="text-7xl drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">💣</span>
          <h1 className="text-6xl font-black text-white font-bungee mt-6 text-shadow-red uppercase animate-pulse-custom">
            EXPLODING KITTEN!
          </h1>
        </div>

        {/* The Card */}
        <div className="mb-10 transform scale-150 animate-wiggle drop-shadow-[0_0_40px_rgba(239,68,68,0.6)]">
          <Card cardCode={drawnCard} />
        </div>

        {/* Action Area */}
        <div className="bg-black/60 border border-red-500/50 rounded-3xl p-8 w-full backdrop-blur-md shadow-2xl flex flex-col items-center gap-6">
          
          <div className="text-center w-full">
            <p className="text-gray-300 text-lg mb-2 font-medium">คุณมีเวลาแก้สถานการณ์</p>
            <div className="text-6xl font-bungee text-red-500 drop-shadow-md mb-4 bg-black/40 py-2 rounded-xl">
              00:{timeLeft.toString().padStart(2, "0")}
            </div>
            {/* Fuse progress bar */}
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden border border-red-900/50">
              <div 
                className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 3 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}
                style={{ width: `${(timeLeft / 10) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex gap-4 w-full mt-4 justify-center">
            {hasDefuse ? (
              <button
                onClick={onDefuse}
                className="flex-1 max-w-[250px] bg-gradient-to-br from-green-500 to-emerald-700 hover:from-green-400 hover:to-emerald-600 border-2 border-green-300 text-white font-bungee py-4 px-6 rounded-2xl text-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>🛡️</span> ใช้ DEFUSE!
              </button>
            ) : (
              <div className="flex-1 max-w-[250px] bg-gray-800/80 border-2 border-gray-600 text-gray-400 font-bungee py-4 px-6 rounded-2xl text-lg flex items-center justify-center gap-2 cursor-not-allowed">
                <span>🚫</span> ไม่มี DEFUSE
              </div>
            )}

            <button
              onClick={onExplode}
              className="flex-1 max-w-[250px] bg-gradient-to-br from-red-600 to-rose-900 hover:from-red-500 hover:to-rose-800 border-2 border-red-400 text-white font-bungee py-4 px-6 rounded-2xl text-xl shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <span>💀</span> ยอมแพ้
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
