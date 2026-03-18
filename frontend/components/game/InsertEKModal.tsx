import React, { useState } from "react";
import { Card } from "./Card";

interface InsertEKModalProps {
  drawnCard: string;
  deckCount: number;
  isOpen: boolean;
  onConfirm: (position: number) => void;
}

export function InsertEKModal({
  drawnCard,
  deckCount,
  isOpen,
  onConfirm,
}: InsertEKModalProps) {
  const [selectedPosition, setSelectedPosition] = useState<number>(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] animate-fade-in backdrop-blur-sm">
      <div className="bg-zinc-900/90 border-2 border-green-500/50 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(34,197,94,0.3)] animate-scale-in max-w-2xl w-full mx-4">
        
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🛡️</div>
          <h2 className="text-3xl font-bold text-green-400 font-bungee drop-shadow-md">
            DEFUSE สำเร็จ!
          </h2>
          <p className="text-gray-300 mt-2 font-medium">คุณต้องการใส่ระเบิดกลับเข้าไปตรงไหนของสำรับ?</p>
          <p className="text-sm text-gray-500 mt-1">(คนอื่นจะไม่เห็นตำแหน่งที่คุณเลือก)</p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-10 my-6 bg-black/40 p-6 rounded-3xl border border-white/10 w-full justify-center">
          
          {/* Card to insert */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-sm text-red-500 font-bold bg-red-500/10 px-3 py-1 rounded">ใส่ใบนี้กลับ</span>
            <div className="relative group">
              <div className="absolute -inset-2 bg-red-500/20 rounded-xl blur-lg group-hover:bg-red-500/30 transition-all opacity-0 group-hover:opacity-100" />
              <Card cardCode={drawnCard} className="transform scale-110 relative z-10" />
            </div>
          </div>

          <div className="hidden md:block text-4xl text-white/20">➡️</div>
          <div className="md:hidden text-4xl text-white/20 rotate-90">➡️</div>

          {/* Position Selector */}
          <div className="flex flex-col items-center gap-4 w-full md:w-auto">
            <label className="text-sm text-green-400 font-bold bg-green-500/10 px-3 py-1 rounded w-full text-center">
              ไพ่ในกอง: {deckCount} ใบ
            </label>
            
            <div className="bg-gray-800 p-4 rounded-2xl border border-gray-600 w-full max-w-[250px] flex flex-col items-center gap-3">
              <div className="text-center w-full pb-2 border-b border-gray-700">
                <div className="text-3xl font-bungee text-white mb-1">
                  {selectedPosition === 0 ? "บนสุด" : 
                   selectedPosition === deckCount ? "ล่างสุด" : 
                   `ใบที่ ${selectedPosition + 1}`}
                </div>
              </div>
              
              <input 
                type="range" 
                min="0" 
                max={deckCount} 
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(parseInt(e.target.value, 10))}
                className="w-full accent-green-500 cursor-pointer my-2 outline-none h-2 bg-gray-900 rounded-lg appearance-none"
                style={{
                  background: `linear-gradient(to right, #22c55e ${(selectedPosition / deckCount) * 100}%, #111827 ${(selectedPosition / deckCount) * 100}%)`
                }}
              />
              
              <div className="flex justify-between w-full text-xs text-gray-400 font-bold">
                <span>บนสุด (0)</span>
                <span>ล่างสุด ({deckCount})</span>
              </div>
            </div>
          </div>

        </div>

        <button
          onClick={() => onConfirm(selectedPosition)}
          className="mt-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bungee py-4 px-16 rounded-xl text-xl shadow-lg shadow-green-900/50 transition-transform hover:scale-105 active:scale-95 border-2 border-green-400"
        >
          ยืนยัน
        </button>
      </div>
    </div>
  );
}
