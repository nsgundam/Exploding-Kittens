'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import RoomCard from '../components/RoomCard';
import JoinModal from '../components/JoinModal';
import CreateRoomModal from '../components/CreateRoomModal';

interface Room {
  id: string;
  name: string;
  deck: number;
  addon: boolean;
  players: number;
  maxPlayers: number;
  status: 'waiting' | 'playing';
}

export default function LobbyPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Mock Data (คงไว้ตาม logic เดิม)
  useEffect(() => {
    const mock = Array.from({ length: 10 }, (_, i) => ({
      id: (i + 1).toString(),
      name: 'Adventure',
      deck: 1,
      addon: true,
      players: 3,
      maxPlayers: 5,
      status: 'waiting' as const,
    }));
    setRooms(mock);
  }, []);

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) || room.id.includes(searchQuery)
  );

  return (
    <div className="min-h-screen p-5 flex flex-col gap-5 max-w-[1400px] mx-auto">
      {/* Header จาก page.module.css */}
      <header className="relative overflow-hidden text-center py-[30px] px-5 bg-gradient-to-br from-[rgba(255,215,0,0.2)] to-[rgba(255,102,0,0.2)] border-4 border-white rounded-[20px]">
        {/* Shine Animation Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/10 to-transparent -rotate-45 -translate-x-full -translate-y-full animate-[shine_3s_infinite]" />
        
        <h1 className="relative z-10 text-[2.5em] font-bold text-[#FFD700] tracking-[2px] [text-shadow:2px_2px_4px_rgba(0,0,0,0.3)]">
          <span className="inline-block animate-bounce mx-2">🎮</span>
          EXPLODING KITTENS LOBBY
          <span className="inline-block animate-bounce mx-2">🎮</span>
        </h1>
      </header>

      {/* Lobby Frame */}
      <div className="bg-[rgba(0,0,0,0.4)] border-[5px] border-[#FFD700] rounded-[20px] p-5 flex flex-col shadow-[0_0_20px_rgba(255,215,0,0.3),inset_0_0_30px_rgba(255,215,0,0.1)] relative h-[550px]">
        <div className="flex-1 overflow-y-auto pr-2.5 flex flex-col gap-[15px] scrollbar-thin scrollbar-thumb-[#FFD700]">
          {filteredRooms.map((room) => (
            <RoomCard key={room.id} {...room} onClick={() => { setSelectedRoom(room); setIsJoinModalOpen(true); }} />
          ))}
          <div ref={observerTarget} className="h-5" />
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex gap-[15px] items-center p-5 bg-[rgba(0,0,0,0.4)] border-4 border-white rounded-[20px] shadow-[0_5px_15px_rgba(0,0,0,0.3)]">
        <button className="bg-gradient-to-br from-[#FFD700] to-[#FF9900] border-[3px] border-black rounded-[15px] py-[15px] px-[30px] text-[1.2em] font-bold text-black flex items-center gap-2 hover:-translate-y-0.5 transition-transform active:translate-y-0 shadow-[0_4px_8px_rgba(0,0,0,0.3)]">
          <span>◄</span> BACK
        </button>

        <div className="flex-1 relative flex items-center bg-white border-[3px] border-black rounded-[25px] px-5 py-1">
          <span className="text-[1.5em] mr-2.5">🔍</span>
          <input
            type="text"
            className="flex-1 border-none text-[1.2em] p-2.5 outline-none italic bg-transparent text-black"
            placeholder="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button 
          className="bg-gradient-to-br from-[#FFD700] to-[#FF9900] border-[3px] border-black rounded-[15px] py-[15px] px-[30px] text-[1.2em] font-bold text-black hover:-translate-y-0.5 transition-transform shadow-[0_4px_8px_rgba(0,0,0,0.3)]"
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create
        </button>

        <button className="w-[60px] h-[60px] flex items-center justify-center bg-gradient-to-br from-[#FFD700] to-[#FF9900] border-[3px] border-black rounded-full text-[2em] font-bold text-black hover:rotate-[360deg] transition-all duration-500 shadow-[0_4px_8px_rgba(0,0,0,0.3)]">
          ?
        </button>
      </div>

      {/* Modals */}
      <JoinModal isOpen={isJoinModalOpen} roomId={selectedRoom?.id || ''} roomName={selectedRoom?.name || ''} onConfirm={() => setIsJoinModalOpen(false)} onClose={() => setIsJoinModalOpen(false)} />
      <CreateRoomModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onCreate={(n, d, a) => console.log(n)} />
      
      {/* CSS Keyframes สำหรับ Animation */}
      <style jsx global>{`
        @keyframes shine {
          0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
          100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }
      `}</style>
    </div>
  );
}