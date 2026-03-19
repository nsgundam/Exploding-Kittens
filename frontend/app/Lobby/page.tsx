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
    addon: Array.isArray(r.deck_config?.expansions) &&
      (r.deck_config.expansions as string[]).some((e: string) => e.includes("imploding")),
    players: playerCount,
    maxPlayers: r.max_players,
    status: r.status === "PLAYING" ? "playing" : "waiting",
  };
};

type FilterTab = "All" | "Original" | "Good";

export default function LobbyPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [selectedRoom, setSelectedRoom] = useState<LobbyRoom | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/rooms`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Fetch rooms failed: ${res.status}`);
        const data: ApiRoom[] = await res.json();
        setRooms(data.map(mapApiRoomToUi));
      } catch (err) {
        console.error(err);
      }
    };
    fetchRooms();
    const timer = setInterval(fetchRooms, 3000);
    return () => clearInterval(timer);
  }, []);

  const filteredRooms = rooms.filter((room) => {
    const matchTab =
      activeTab === "All" ||
      (activeTab === "Original" && room.cardVersion === "Original") ||
      (activeTab === "Good" && room.cardVersion === "Good vs. Evil");
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || room.name.toLowerCase().includes(q) || room.id.includes(q) ||
      `${room.id}.${room.name}`.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

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
          headers: { "Content-Type": "application/json", "x-player-token": playerToken },
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
        headers: { "Content-Type": "application/json", "x-player-token": playerToken },
        body: JSON.stringify({
          roomName: name,
          hostName,
          maxPlayers,
          cardVersion,
          expansions: expansions.includes("imploding") ? ["imploding_kittens"] : [],
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

  const tabs: { label: string; value: FilterTab }[] = [
    { label: "All", value: "All" },
    { label: "Original", value: "Original" },
    { label: "Good", value: "Good" },
  ];

  return (
    <div className="h-screen flex flex-col gap-3 px-8 py-5 max-w-8xl w-full mx-auto overflow-hidden text-white relative">
      <AnimatedBackground />

      {/* ═══ HEADER ═══ */}
      <div
        className="shrink-0 relative flex items-center justify-center z-10"
        style={{
          backgroundImage: "url('/images/lobby_header.png')",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          height: "90px",
          borderRadius: "16px",
          boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
        }}
      >
        <h1
          className="text-3xl md:text-4xl font-black tracking-widest text-white uppercase drop-shadow-lg"
          style={{
            fontFamily: "'Bungee', cursive",
            textShadow: "0 2px 12px rgba(0,0,0,0.55)",
          }}
        >
          EXPLODING KITTENS LOBBY
        </h1>
      </div>

      {/* ═══ CREAM OUTER FRAME — wraps tabs + room list ═══ */}
      <div
        className="relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden"
        style={{
          border: "2px solid #c8a876",
          borderRadius: "24px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        }}
      >
        {/* ── TABS section — สี #FFFAF0 ── */}
        <div
          className="shrink-0 flex px-5 pt-4 pb-3"
          style={{
            background: "#FAF2DF",
            borderRadius: "22px 22px 0 0",
          }}
        >
          <div
            className="flex"
            style={{
              background: "#e8d5b0",
              border: "2px solid #c8a876",
              borderRadius: "12px",
              padding: "3px",
              gap: "2px",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className="px-6 py-1.5 font-bold text-sm transition-all duration-200 font-bungee"
                style={{
                  background: activeTab === tab.value
                    ? "linear-gradient(135deg, #f5c842, #e8a020)"
                    : "transparent",
                  color: activeTab === tab.value ? "#3d1a00" : "#7a5030",
                  border: "none",
                  borderRadius: "9px",
                  boxShadow: activeTab === tab.value
                    ? "0 2px 6px rgba(0,0,0,0.15)"
                    : "none",
                  fontWeight: activeTab === tab.value ? "900" : "600",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {/* ── ROOM LIST section — สี #FFF8DC ── */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 min-h-0"
          style={{
            background: "#F2D8BA",
            borderRadius: "0 0 22px 22px",
          }}
        >
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              id={room.id}
              name={room.name}
              deck={room.cardVersion === "Good vs. Evil" ? 2 : 1}
              addon={room.addon}
              players={room.players}
              maxPlayers={room.maxPlayers}
              status={room.status}
              cardVersion={room.cardVersion}
              onClick={() => handleRoomClick(room)}
            />
          ))}
          {filteredRooms.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="text-6xl mb-4">😿</div>
              <div className="text-xl font-black text-white/60 font-bungee">
                {searchQuery
                  ? `ไม่พบห้อง "${searchQuery}"`
                  : activeTab !== "All"
                    ? `ไม่มีห้อง ${activeTab} ในขณะนี้`
                    : "ยังไม่มีห้อง ลองสร้างเลย!"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ CONTROLS ═══ */}
<div className="relative flex gap-4 items-center px-8 py-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-10 shrink-0 flex-wrap md:flex-nowrap" style={{ background: "#BE491F", border: "2px solid #8b2d0e" }}>        <button
          onClick={() => router.push("/")}
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
            >✕</span>
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