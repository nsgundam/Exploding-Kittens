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

export default function RoomCard({
  id, name, deck, addon, players, maxPlayers, status, onClick
}: RoomCardProps) {
  const isClickable = status === 'waiting';

  return (
    <div
      className={[
        'bg-linear-to-br from-[#2a2a2a] to-[#1a1a1a]',
        'border-[3px] border-white rounded-2xl',
        'px-4 py-4 flex items-center gap-4 shrink-0',
        'transition-all duration-300 animate-slide-in',
        'shadow-[0_0_12px_rgba(255,215,0,0.25)]',
        isClickable
          ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(255,170,0,0.5)] hover:border-[#FFD700]'
          : 'opacity-50 cursor-not-allowed grayscale-50',
      ].join(' ')}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Deck badge */}
      <div className="bg-linear-to-br from-[#d97706] to-[#ea580c] border-2 border-black rounded-xl flex flex-col items-center justify-center gap-0.5 w-[100px] h-[100px] shrink-0 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_#ff0000_0%,_transparent_70%)]" />
        <span className="text-2xl relative z-10">🎴</span>
        <span className="font-bold text-[9px] text-black leading-tight relative z-10">สำรับ {deck}</span>
        {addon
          ? <span className="font-bold text-[8px] text-black leading-tight relative z-10">+ADD-ON</span>
          : <span className="text-[7px] text-black/50 leading-tight relative z-10">ไม่ADD-ON</span>
        }
      </div>

      {/* Room name */}
      <div className="bg-linear-to-r from-gray-200 to-gray-300 border-2 border-black rounded-[20px] px-5 h-[60px] flex-1 flex items-center justify-center relative shadow-inner min-w-0">
        <span className="absolute left-2 top-1 text-xs opacity-20">🐾</span>
        <span className="absolute right-2 bottom-1 text-xs opacity-20">🐾</span>
        <span className="text-sm font-bold text-black text-center truncate">
          ❄ {id}.{name} ❄
        </span>
      </div>

      {/* Players circle */}
      <div className="bg-linear-to-br from-[#2c3e50] to-[#34495e] border-2 border-white rounded-full w-[70px] h-[70px] flex flex-col items-center justify-center text-white relative shrink-0">
        <span className="absolute -top-1.5 -right-1.5 text-sm animate-float">💥</span>
        <span className="text-[8px] font-bold opacity-70 uppercase">Players</span>
        <span className="text-base font-bold">{players}/{maxPlayers}</span>
      </div>

      {/* Status */}
      <div className={[
        status === 'waiting' ? 'bg-linear-to-br from-[#ea580c] to-[#dc2626]' : 'bg-linear-to-br from-[#d97706] to-[#a16207]',
        'border-2 border-black rounded-xl px-4 w-[110px] h-[76px] flex items-center justify-center relative shrink-0',
        status === 'waiting' ? 'animate-pulse-custom' : '',
      ].join(' ')}>
        <span className="absolute -top-1.5 left-2 text-sm text-yellow-300 animate-pulse-custom">★</span>
        <span className="text-xs font-bold text-black italic uppercase tracking-wide">
          {status === 'waiting' ? 'WAITING' : 'PLAYING'}
        </span>
        <span className="absolute -bottom-1.5 right-2 text-sm text-yellow-300 animate-pulse-custom">★</span>
      </div>
    </div>
  );
}
