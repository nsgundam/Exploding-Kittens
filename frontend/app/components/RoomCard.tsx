'use client';

import React from 'react';

interface RoomCardProps {
  id: string;
  name: string;
  deck: number;
  addon: boolean;
  players: number;
  maxPlayers: number;
  status: 'waiting' | 'playing';
  onClick: () => void;
}

export default function RoomCard({ id, name, deck, addon, players, maxPlayers, status, onClick }: RoomCardProps) {
  const isClickable = status === 'waiting';

  return (
    <div 
      className={`
        bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] border-[3px] border-white rounded-[15px] p-5 flex items-center gap-5 transition-all duration-300 min-h-[100px]
        ${!isClickable ? 'opacity-50 cursor-not-allowed grayscale-[50%]' : 'cursor-pointer hover:-translate-y-[3px] hover:shadow-[0_8px_20px_rgba(255,170,0,0.4)] animate-[slideIn_0.5s_ease-out]'}
      `}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Card Addon Box */}
      <div className="flex items-center gap-2.5 bg-gradient-to-br from-[#ff8800] to-[#ff6600] border-[3px] border-black rounded-[10px] p-4 min-w-[200px] shrink-0">
        <span className="text-[2em]">🎴</span>
        <span className="font-bold text-[1.1em] text-black">
          สำรับ {deck}{addon ? ' + Add-on' : ''}
        </span>
      </div>

      {/* Room Name Container */}
      <div className="flex-1 flex items-center justify-center bg-[#f0f0f0] border-[3px] border-black rounded-[25px] py-3 px-[30px]">
        <span className="text-[1.2em] font-bold text-black text-center break-all uppercase">
          ❄ {id}.{name} ❄
        </span>
      </div>

      {/* Player Count */}
      <div className="relative w-[70px] h-[70px] flex flex-col items-center justify-center bg-[#2c3e50] border-[3px] border-white rounded-full text-white shrink-0">
        <span className="absolute -top-2.5 -right-2.5 text-[1.5em] animate-[float_2s_ease-in-out_infinite]">💥</span>
        <span className="text-[1.3em] font-bold">{players}/{maxPlayers}</span>
      </div>

      {/* Status Button */}
      <div className={`
        min-w-[150px] py-[15px] px-[30px] border-[3px] border-black rounded-[10px] text-center font-bold italic text-black shrink-0
        ${status === 'waiting' ? 'bg-gradient-to-br from-[#ff6600] to-[#ff4400]' : 'bg-gradient-to-br from-[#ff8800] to-[#ff6600]'}
      `}>
        {status.toUpperCase()}
      </div>

      <style jsx>{`
        @keyframes slideIn { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
      `}</style>
    </div>
  );
}