"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatedBackground } from "@/components/lobby/AnimatedBackground";
import RoomCard from "@/components/lobby/RoomCard";
import JoinModal from "@/components/lobby/JoinModal";
import CreateRoomModal, { RoomCreatePayload } from "@/components/lobby/CreateRoomModal";
import type { LobbyRoom, ApiRoom } from "@/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

const mapApiRoomToUi = (r: ApiRoom): LobbyRoom => {
  const playerCount = (r.players ?? []).filter((p) => p.role === "PLAYER").length;

  return {
    id: r.room_id,
    name: r.room_name,
    cardVersion: r.deck_config?.card_version === "good_and_evil" ? "Good vs. Evil" : "Original",
    addon: Boolean(r.deck_config?.expansions?.includes("imploding_kittens")),
    players: playerCount,
    maxPlayers: r.max_players,
    status: r.status === "PLAYING" ? "playing" : "waiting",
  };
};

export default function LobbyPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<LobbyRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<LobbyRoom | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/rooms`, {
          // ensure we don't cache this frequently changing data
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Fetch rooms failed: ${res.status}`);

        const data: ApiRoom[] = await res.json();
        const uiRooms = data.map(mapApiRoomToUi);

        setRooms(uiRooms);
      } catch (err) {
        console.error(err);
      }
    };

    fetchRooms();
    // In a real app, this would use a socket for live updates, but polling every few seconds works for now
    const timer = setInterval(fetchRooms, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredRooms(rooms);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredRooms(
        rooms.filter(
          (room) =>
            room.name.toLowerCase().includes(query) ||
            room.id.includes(query) ||
            `${room.id}.${room.name}`.toLowerCase().includes(query),
        ),
      );
    }
  }, [searchQuery, rooms]);

  const handleRoomClick = (room: LobbyRoom) => {
    setSelectedRoom(room);
    setIsJoinModalOpen(true);
  };

  const handleJoinConfirm = async () => {
    if (selectedRoom) {
      const playerToken = localStorage.getItem("player_token");
      const displayName = localStorage.getItem("display_name");

      if (!playerToken || !displayName) {
         alert("ไม่พบ Token หรือชื่อของผู้เล่น กรุณาเข้าสู่ระบบใหม่");
         router.push("/");
         return;
      }

      try {
        const res = await fetch(`/api/rooms/${selectedRoom.id}/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-player-token": playerToken,
          },
          body: JSON.stringify({ displayName }),
        });

        if (!res.ok) {
           const err = await res.json().catch(() => ({}));
           throw new Error(err?.message || "Join room failed");
        }

        router.push(`/room/${selectedRoom.id}`);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to join room");
      }
    }
    setIsJoinModalOpen(false);
    setSelectedRoom(null);
  };

  const handleCreateRoom = async (payload: RoomCreatePayload) => {
    try {
      const { name, cardVersion, expansions } = payload;
      const playerToken = localStorage.getItem("player_token");
      if (!playerToken) {
        alert("ไม่พบ Token หรือชื่อของผู้เล่น กรุณาเข้าสู่ระบบใหม่");
        router.push("/");
        return;
      }
      const maxPlayers = 5;
      const hostName = localStorage.getItem("display_name") || "Player_" + Math.floor(Math.random() * 1000);

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-player-token": playerToken,
        },
        body: JSON.stringify({
          roomName: name,
          hostName,
          maxPlayers,
          cardVersion: cardVersion,
          expansions: { addons: expansions.includes("imploding") ? ["imploding_kittens"] : [] },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Create room failed: ${res.status}`);
      }

      const createdRoom = await res.json();
      router.push(`/room/${createdRoom.room_id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "สร้างห้องไม่สำเร็จ");
      console.error(e);
    } finally {
      setIsCreateModalOpen(false);
    }
  };

  const handleBack = () => {
    router.push("/");
  };

  return (
    <div className="h-screen flex flex-col gap-3 px-8 py-5 max-w-8xl w-full mx-auto overflow-hidden text-white relative">
      <AnimatedBackground />
      
      {/* ═══ HEADER ═══ */}
      <div className="relative flex items-center justify-center min-h-27.5 px-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(255,215,0,0.2)] z-10 shrink-0">
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent animate-shine pointer-events-none" />
        <span className="absolute top-3 left-5 text-4xl animate-float">🐱</span>
        <span className="absolute top-3 right-5 text-4xl animate-float" style={{ animationDelay: "1s" }}>🐱</span>
        <h1 className="relative z-10 text-4xl md:text-5xl text-yellow-400 font-bungee tracking-wider drop-shadow-md">
          <span className="inline-block animate-float mx-2">🎮</span>
          EXPLODING KITTENS LOBBY
          <span className="inline-block animate-float mx-2">🎮</span>
        </h1>
      </div>

      {/* ═══ LOBBY FRAME ═══ */}
      <div className="relative bg-white/5 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_0_40px_rgba(255,215,0,0.1)] z-10 flex-1 min-h-0 overflow-hidden">
        <div className="absolute inset-0 border-2 border-white/20 rounded-3xl pointer-events-none z-10" />
        
        {/* Scrollable room list */}
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden px-8 py-5 flex flex-col gap-3">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              id={room.id}
              name={room.name}
              deck={1} // The component currently expects a number, let's keep it as 1 for now or adapt RoomCard 
              addon={room.addon}
              players={room.players}
              maxPlayers={room.maxPlayers}
              status={room.status}
              onClick={() => handleRoomClick(room)}
            />
          ))}
          {filteredRooms.length === 0 && (
            <div className="text-center p-12 text-yellow-400 text-2xl font-bold font-bungee">
              {searchQuery ? `😿 ไม่พบห้องที่ค้นหา "${searchQuery}"` : "😿 ยังไม่มีห้องถูกสร้าง ลองสร้างเลย!"}
            </div>
          )}
        </div>
      </div>

      {/* ═══ CONTROLS ═══ */}
      <div className="relative flex gap-4 items-center px-8 py-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-10 shrink-0 flex-wrap md:flex-nowrap">
        
        <button
          onClick={handleBack}
          className="bg-linear-to-br from-yellow-400 via-yellow-500 to-orange-500 border-4 border-black rounded-2xl px-8 min-h-13.75 text-xl font-bold text-black font-bungee whitespace-nowrap shadow-md transition-all hover:-translate-y-1 hover:shadow-lg relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="relative z-10">◄ BACK</span>
        </button>

        <div className="flex-1 flex items-center bg-white border-4 border-black rounded-full px-5 min-h-13.75 shadow-inner">
          <span className="text-2xl mr-3">🔍</span>
          <input
            type="text"
            className="flex-1 border-none text-xl outline-none italic font-bungee bg-transparent placeholder:text-gray-400 text-black w-full"
            placeholder="SEARCH ROOMS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <span
              className="cursor-pointer text-2xl text-gray-500 hover:text-black hover:scale-125 transition-all"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </span>
          )}
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-linear-to-br from-yellow-400 via-yellow-500 to-orange-500 border-4 border-black rounded-2xl px-12 min-h-13.75 text-xl font-bold text-black font-bungee whitespace-nowrap shadow-md transition-all hover:-translate-y-1 hover:shadow-lg relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="relative z-10">CREATE ROOM</span>
        </button>
      </div>

      <JoinModal
        isOpen={isJoinModalOpen}
        roomId={selectedRoom?.id || ""}
        roomName={selectedRoom?.name || ""}
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
