"use client";

import { useRoomSocket } from "@/hooks/useRoomSocket";
import { useParams } from "next/navigation";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  const { roomData, isConnected, selectSeat } = useRoomSocket(roomId);

  if (!roomData) {
    return <div className="text-white">กำลังเชื่อมต่อห้อง {roomId}...</div>;
  }

  return (
    <div className="p-10 text-white">
      <h1>ห้อง: {roomData.room_name}</h1>
      <p>สถานะการเชื่อมต่อ: {isConnected ? "🟢 ออนไลน์" : "🔴 ขาดการเชื่อมต่อ"}</p>
      
      <div className="mt-5">
        <h2>ผู้เล่นในห้อง ({roomData.players.length}/{roomData.max_players})</h2>
        <ul>
          {roomData.players.map((player: any) => (
            <li key={player.player_id}>
              {player.display_name} (ที่นั่ง: {player.seat_number || "กำลังเลือก"})
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex gap-2">
        {[1, 2, 3, 4].map((seat) => (
          <button 
            key={seat}
            onClick={() => selectSeat(seat)}
            className="bg-orange-500 p-2 rounded"
          >
            นั่งที่ {seat}
          </button>
        ))}
      </div>
    </div>
  );
}