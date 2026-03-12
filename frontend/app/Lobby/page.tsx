"use client";

import React, { useState, useEffect } from "react";
import { AnimatedBackground } from "../components/AnimatedBackground";
import RoomCard from "../components/RoomCard";
import JoinModal from "../components/JoinModal";
import CreateRoomModal, {
  RoomCreatePayload,
} from "../components/CreateRoomModal";


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
interface Room {
  id: string;
  name: string;
  deck: number;
  addon: boolean;
  players: number;
  maxPlayers: number;
  status: "waiting" | "playing";
}

type ApiRoom = {
  room_id: string;
  room_name: string;
  status: "WAITING" | "PLAYING" | "FINISHED";
  max_players: number;
  players?: Array<{ role: "SPECTATOR" | "PLAYER" }>;
  deck_config?: { expansions?: { imploding?: boolean } };
};

const mapApiRoomToUi = (r: ApiRoom): Room => {
  const playerCount = (r.players ?? []).filter(
    (p) => p.role === "PLAYER",
  ).length;

  return {
    id: r.room_id,
    name: r.room_name,
    deck: 1, // backend ยังไม่มี field deck ชัด ๆ เอา default ก่อน
    addon: Boolean(r.deck_config?.expansions?.imploding),
    players: playerCount,
    maxPlayers: r.max_players,
    status: r.status === "PLAYING" ? "playing" : "waiting",
  };
};

export default function LobbyPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/rooms`);
        if (!res.ok) throw new Error(`Fetch rooms failed: ${res.status}`);

        const data: ApiRoom[] = await res.json();
        const uiRooms = data.map(mapApiRoomToUi);

        setRooms(uiRooms);
      } catch (err) {
        console.error(err);
      }
    };

    fetchRooms();
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

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    setIsJoinModalOpen(true);
  };

  const handleJoinConfirm = async () => {
    if (selectedRoom) {
      const playerToken = localStorage.getItem("player_token");
      const displayName = localStorage.getItem("display_name");

      if (!playerToken) {
         alert("ไม่พบ Token ของผู้เล่น กรุณาเข้าสู่ระบบใหม่");
         window.location.href = "/";
         return;
      }

      if (!displayName) {
         alert("ไม่พบชื่อผู้เล่น กรุณาเข้าสู่ระบบใหม่");
         window.location.href = "/";
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

        window.location.href = `/room/${selectedRoom.id}`;
      } catch (err) {
        alert(err || "Failed to join room");
      }
    }
    setIsJoinModalOpen(false);
    setSelectedRoom(null);
  };

  const handleCreateRoom = async (payload: RoomCreatePayload) => {
    try {
      const { name, cardVersion, expansions } = payload;
      const playerToken =
        localStorage.getItem("player_token") ||
        (() => {
          const id = crypto.randomUUID();
          localStorage.setItem("player_token", id);
          return id;
        })();
      const maxPlayers = 5; // Hardcoded to 5 as requested
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
          expansions: expansions,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || `Create room failed: ${res.status}`);
      }

      const createdRoom = await res.json();
      alert(`สร้างห้อง "${createdRoom.room_name}" สำเร็จ!`);

      window.location.href = `/room/${createdRoom.room_id}`;
    } catch (e) {
      alert(e || "สร้างห้องไม่สำเร็จ");
      console.error(e);
    } finally {
      setIsCreateModalOpen(false);
    }
  };

  const handleBack = () => {
    window.location.href = "/";
  };

  return (
    <div className="h-screen flex flex-col gap-3 px-8 py-5 max-w-387.5 w-full mx-auto overflow-hidden text-white relative">
      <AnimatedBackground />
      {/* Background Decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <span
          className="absolute top-10 left-10 text-6xl opacity-10 animate-float"
          style={{ animationDelay: "0s" }}
        >
          🐱
        </span>
        <span
          className="absolute top-20 right-20 text-5xl opacity-10 animate-float"
          style={{ animationDelay: "1s" }}
        >
          🐈
        </span>
        <span
          className="absolute bottom-20 left-20 text-7xl opacity-10 animate-float"
          style={{ animationDelay: "2s" }}
        >
          😸
        </span>
        <span
          className="absolute bottom-10 right-10 text-6xl opacity-10 animate-float"
          style={{ animationDelay: "1.5s" }}
        >
          😺
        </span>
        <span
          className="absolute top-1/2 left-1/4 text-4xl opacity-10 animate-float"
          style={{ animationDelay: "0.5s" }}
        >
          💣
        </span>
        <span
          className="absolute top-1/3 right-1/3 text-4xl opacity-10 animate-float"
          style={{ animationDelay: "2.5s" }}
        >
          💥
        </span>
      </div>

      {/* ═══ HEADER ═══ */}
      <div className="relative flex items-center justify-center min-h-27.5 px-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(255,215,0,0.2)] z-10 shrink-0">
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent animate-shine pointer-events-none" />
        <span className="absolute top-3 left-5 text-4xl animate-float">🐱</span>
        <span
          className="absolute top-3 right-5 text-4xl animate-float"
          style={{ animationDelay: "1s" }}
        >
          🐱
        </span>
        <h1 className="relative z-10 text-5xl text-neon-yellow font-bungee animate-pulse-custom tracking-wider drop-shadow-[6px_6px_15px_rgba(255,102,0,0.8)]">
          <span className="inline-block animate-float mx-2">🎮</span>
          EXPLODING KITTENS LOBBY
          <span className="inline-block animate-float mx-2">🎮</span>
        </h1>
      </div>

      {/* ═══ LOBBY FRAME ═══ */}
      <div className="relative bg-white/5 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_0_40px_rgba(255,215,0,0.1)] z-10 flex-1 min-h-0 overflow-hidden">
        <div className="absolute inset-0 border-2 border-white/20 rounded-3xl pointer-events-none z-10" />
        <span className="absolute top-3 left-3 text-xl opacity-50 z-20">
          😼
        </span>
        <span className="absolute top-3 right-3 text-xl opacity-50 z-20">
          😼
        </span>
        <span className="absolute bottom-3 left-3 text-xl opacity-50 z-20">
          😼
        </span>
        <span className="absolute bottom-3 right-3 text-xl opacity-50 z-20">
          😼
        </span>

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
            <div className="text-center p-12 text-neon-yellow text-2xl font-bold">
              😿 ไม่พบห้องที่ค้นหา &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      </div>

      {/* ═══ CONTROLS ═══ */}
      <div className="relative flex gap-4 items-center px-8 py-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-10 shrink-0">
        <span className="absolute -top-3 left-1/4 text-2xl animate-float">
          💣
        </span>
        <span
          className="absolute -top-3 right-1/4 text-2xl animate-float"
          style={{ animationDelay: "1s" }}
        >
          💣
        </span>

        <button
          onClick={handleBack}
          className="bg-linear-to-br from-neon-yellow via-[#FFB700] to-[#FF9900] border-4 border-black rounded-2xl px-12 min-h-13.75 text-xl font-bold text-black font-bungee whitespace-nowrap shadow-[0_6px_12px_rgba(0,0,0,0.4)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(255,170,0,0.6)] hover:border-neon-orange relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="relative z-10">◄ BACK</span>
        </button>

        <div className="flex-1 flex items-center bg-white border-4 border-black rounded-[30px] px-5 min-h-13.75 shadow-[0_6px_12px_rgba(0,0,0,0.4),inset_0_2px_8px_rgba(0,0,0,0.1)]">
          <span className="text-2xl mr-3">🔍</span>
          <input
            type="text"
            className="flex-1 border-none text-xl outline-none italic font-bungee bg-transparent placeholder:text-gray-400 text-black"
            placeholder="SEARCH"
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
          className="bg-linear-to-br from-neon-yellow via-[#FFB700] to-[#FF9900] border-4 border-black rounded-2xl px-12 min-h-13.75 text-xl font-bold text-black font-bungee whitespace-nowrap shadow-[0_6px_12px_rgba(0,0,0,0.4)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(255,170,0,0.6)] hover:border-neon-orange relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="relative z-10">CREATE</span>
        </button>

        <button className="bg-linear-to-br from-neon-yellow via-[#FFB700] to-[#FF9900] border-4 border-black rounded-full w-17 h-17 flex items-center justify-center text-2xl font-bold text-black font-bungee shrink-0 shadow-[0_6px_12px_rgba(0,0,0,0.4)] transition-all hover:rotate-360 hover:scale-110 duration-500 cursor-pointer">
          ?
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
