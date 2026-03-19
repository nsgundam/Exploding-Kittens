import React, { useEffect, useState } from "react";
import { Card } from "./Card";

interface SeeTheFutureModalProps {
  cards: string[];
  isOpen: boolean;
  onClose: () => void;
}

export function SeeTheFutureModal({ cards, isOpen, onClose }: SeeTheFutureModalProps) {
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    if (!isOpen) return;
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeLeft(5);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  if (!isOpen || cards.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-2000 animate-fade-in backdrop-blur-sm">
      <div className="bg-zinc-900/90 border-2 border-cyan-500 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(6,182,212,0.4)] animate-scale-in max-w-2xl w-full mx-4">
        
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🔮</div>
          <h2 className="text-3xl font-bold text-cyan-400 font-bungee drop-shadow-md">
            THE FUTURE REACHES OUT
          </h2>
          <p className="text-gray-300 mt-2 font-medium">นี่คือไพ่ 3 ใบบนสุดของสำรับ (ซ้าย = บนสุด)</p>
        </div>

        <div className="flex justify-center gap-6 my-4 w-full">
          {cards.map((cardCode, index) => (
            <div key={`${cardCode}-${index}`} className="flex flex-col items-center gap-2">
              <span className="text-xs text-cyan-500 font-bold bg-cyan-500/10 px-2 py-1 rounded">
                ใบที่ {index + 1}
              </span>
              <Card 
                cardCode={cardCode} 
                className="scale-125 mx-4 shadow-xl shadow-cyan-500/20" 
              />
            </div>
          ))}
        </div>

        <div className="w-full bg-gray-800 rounded-full h-2 mt-4 overflow-hidden">
          <div 
            className="bg-cyan-500 h-full transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 5) * 100}%` }}
          />
        </div>

        <button
          onClick={onClose}
          className="mt-2 bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bungee py-3 px-12 rounded-xl text-lg shadow-lg transition-transform hover:scale-105 active:scale-95 border-2 border-cyan-400"
        >
          ตกลง ({timeLeft}s)
        </button>
      </div>
    </div>
  );
}
