"use client";

import { useRoomSocket, Player } from "@/hooks/useRoomSocket";
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
          {roomData.players.map((player: Player) => (
            <li key={player.player_id}>
              {player.display_name} (ที่นั่ง: {player.seat_number || "กำลังเลือก"})
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex gap-2">
        {Array.from({ length: roomData.max_players }, (_, i) => i + 1).map((seat) => {
          const isOccupied = roomData.players.some((p: Player) => p.seat_number === seat && p.role === "PLAYER");
          return (
            <button 
              key={seat}
              onClick={() => selectSeat(seat)}
              className={`${isOccupied ? "bg-red-500" : "bg-orange-500"} p-2 rounded`}
            >
              ที่นั่ง {seat} {isOccupied ? "(ไม่ว่าง)" : ""}
            </button>
          )
        })}
      </div>

      <div className="mt-5">
         <button onClick={() => selectSeat(-1)} className="bg-gray-500 p-2 rounded">
            ลุกจากที่นั่ง
         </button>
      </div>
    </div>
  );
}