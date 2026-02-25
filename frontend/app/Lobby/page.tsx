'use client';

import React, { useState, useEffect, useRef } from 'react';
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

const generateMockRooms = (startId: number, count: number): Room[] => {
  const rooms: Room[] = [];
  const names = ['Adventure', 'Epic', 'Legends', 'Warriors', 'Dragons', 'Phoenix', 'Thunder', 'Mystic'];
  for (let i = 0; i < count; i++) {
    const id = (startId + i).toString();
    rooms.push({
      id,
      name: names[Math.floor(Math.random() * names.length)],
      deck: Math.random() > 0.5 ? 1 : 2,
      addon: Math.random() > 0.5,
      players: Math.floor(Math.random() * 5) + 1,
      maxPlayers: 5,
      status: Math.random() > 0.3 ? 'waiting' : 'playing',
    });
  }
  return rooms;
};

export default function LobbyPage() {
  const [rooms] = useState<Room[]>(() => generateMockRooms(1234, 20));
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const nextId = useRef(1234 + 20);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRooms(rooms);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredRooms(
        rooms.filter(
          (room) =>
            room.name.toLowerCase().includes(query) ||
            room.id.includes(query) ||
            `${room.id}.${room.name}`.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, rooms]);

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    setIsJoinModalOpen(true);
  };

  const handleJoinConfirm = () => {
    if (selectedRoom) alert(`กำลังเข้าร่วมห้อง ${selectedRoom.id}.${selectedRoom.name}...`);
    setIsJoinModalOpen(false);
    setSelectedRoom(null);
  };

  const handleCreateRoom = (name: string, deck: number, addon: boolean) => {
    const newId = (nextId.current++).toString();
    const newRoom: Room = { id: newId, name, deck, addon, players: 1, maxPlayers: 5, status: 'waiting' };
    setFilteredRooms((prev) => [newRoom, ...prev]);
    setIsCreateModalOpen(false);
    alert(`สร้างห้อง "${name}" สำเร็จ!`);
  };

  const handleBack = () => {
    if (confirm('คุณต้องการกลับไปหน้า Login หรือไม่?')) alert('กำลังกลับไปหน้า Login...');
  };

  return (
    <div className="h-screen flex flex-col gap-3 px-8 py-5 max-w-[1550px] w-full mx-auto overflow-hidden">

      {/* Background Decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <span className="absolute top-10 left-10 text-6xl opacity-10 animate-float" style={{ animationDelay: '0s' }}>🐱</span>
        <span className="absolute top-20 right-20 text-5xl opacity-10 animate-float" style={{ animationDelay: '1s' }}>🐈</span>
        <span className="absolute bottom-20 left-20 text-7xl opacity-10 animate-float" style={{ animationDelay: '2s' }}>😸</span>
        <span className="absolute bottom-10 right-10 text-6xl opacity-10 animate-float" style={{ animationDelay: '1.5s' }}>😺</span>
        <span className="absolute top-1/2 left-1/4 text-4xl opacity-10 animate-float" style={{ animationDelay: '0.5s' }}>💣</span>
        <span className="absolute top-1/3 right-1/3 text-4xl opacity-10 animate-float" style={{ animationDelay: '2.5s' }}>💥</span>
      </div>

      {/* ═══ HEADER ═══ */}
      <div className="relative flex items-center justify-center min-h-[110px] px-16 bg-linear-to-r from-amber-900/40 via-orange-900/40 to-amber-900/40 border-[5px] border-white rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(255,215,0,0.4)] z-10 shrink-0">
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shine pointer-events-none" />
        <span className="absolute top-3 left-5 text-4xl animate-float">🐱</span>
        <span className="absolute top-3 right-5 text-4xl animate-float" style={{ animationDelay: '1s' }}>🐱</span>
        <h1 className="relative z-10 text-5xl text-[#FFD700] font-bungee animate-pulse-custom tracking-wider drop-shadow-[6px_6px_15px_rgba(255,102,0,0.8)]">
          <span className="inline-block animate-float mx-2">🎮</span>
          EXPLODING KITTENS LOBBY
          <span className="inline-block animate-float mx-2">🎮</span>
        </h1>
      </div>

      {/* ═══ LOBBY FRAME ═══ */}
      <div className="relative bg-linear-to-br from-black/60 to-black/40 border-[6px] border-[#FFD700] rounded-3xl shadow-[0_0_40px_rgba(255,215,0,0.5),_inset_0_0_40px_rgba(255,215,0,0.15)] z-10 flex-1 min-h-0 overflow-hidden">
        <div className="absolute inset-0 border-[3px] border-[#FF6600] rounded-[22px] pointer-events-none m-[3px] z-10" />
        <span className="absolute top-3 left-3 text-xl opacity-50 z-20">😼</span>
        <span className="absolute top-3 right-3 text-xl opacity-50 z-20">😼</span>
        <span className="absolute bottom-3 left-3 text-xl opacity-50 z-20">😼</span>
        <span className="absolute bottom-3 right-3 text-xl opacity-50 z-20">😼</span>

        {/* Scrollable room list — padded on all 4 sides */}
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden px-8 py-5 flex flex-col gap-3">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              id={room.id}
              name={room.name}
              deck={room.deck}
              addon={room.addon}
              players={room.players}
              maxPlayers={room.maxPlayers}
              status={room.status}
              onClick={() => handleRoomClick(room)}
            />
          ))}
          {filteredRooms.length === 0 && searchQuery && (
            <div className="text-center p-12 text-[#FFD700] text-2xl font-bold">
              😿 ไม่พบห้องที่ค้นหา &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      </div>

      {/* ═══ CONTROLS ═══ */}
      <div className="relative flex gap-4 items-center px-8 py-8 bg-linear-to-r from-black/60 via-black/50 to-black/60 border-[5px] border-white rounded-3xl shadow-[0_8px_30px_rgba(255,215,0,0.3)] z-10 shrink-0">
        <span className="absolute -top-3 left-1/4 text-2xl animate-float">💣</span>
        <span className="absolute -top-3 right-1/4 text-2xl animate-float" style={{ animationDelay: '1s' }}>💣</span>

        <button
          onClick={handleBack}
          className="bg-linear-to-br from-[#FFD700] via-[#FFB700] to-[#FF9900] border-4 border-black rounded-2xl px-12 min-h-[55px] text-xl font-bold text-black font-bungee whitespace-nowrap shadow-[0_6px_12px_rgba(0,0,0,0.4)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(255,170,0,0.6)] hover:border-[#FF6600] relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="relative z-10">◄ BACK</span>
        </button>

        <div className="flex-1 flex items-center bg-white border-4 border-black rounded-[30px] px-5 min-h-[55px] shadow-[0_6px_12px_rgba(0,0,0,0.4),_inset_0_2px_8px_rgba(0,0,0,0.1)]">
          <span className="text-2xl mr-3">🔍</span>
          <input
            type="text"
            className="flex-1 border-none text-xl outline-none italic font-bungee bg-transparent placeholder:text-gray-400 text-black"
            placeholder="SEARCH"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <span className="cursor-pointer text-2xl text-gray-500 hover:text-black hover:scale-125 transition-all" onClick={() => setSearchQuery('')}>✕</span>
          )}
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-linear-to-br from-[#FFD700] via-[#FFB700] to-[#FF9900] border-4 border-black rounded-2xl px-12 min-h-[55px] text-xl font-bold text-black font-bungee whitespace-nowrap shadow-[0_6px_12px_rgba(0,0,0,0.4)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(255,170,0,0.6)] hover:border-[#FF6600] relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="relative z-10">CREATE</span>
        </button>

        <button className="bg-linear-to-br from-[#FFD700] via-[#FFB700] to-[#FF9900] border-4 border-black rounded-full w-[68px] h-[68px] flex items-center justify-center text-2xl font-bold text-black font-bungee shrink-0 shadow-[0_6px_12px_rgba(0,0,0,0.4)] transition-all hover:rotate-[360deg] hover:scale-110 duration-500 cursor-pointer">
          ?
        </button>
      </div>

      <JoinModal
        isOpen={isJoinModalOpen}
        roomId={selectedRoom?.id || ''}
        roomName={selectedRoom?.name || ''}
        onConfirm={handleJoinConfirm}
        onClose={() => setIsJoinModalOpen(false)}
      />
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateRoom}
      />
    </div>
  );
}
