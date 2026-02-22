// server service for room management
// business logic
// คำนวณกติกาเกม
// ตรวจเงื่อนไข
// เรียก prisma
// service ไม่ควรรู้ว่า HTTP คืออะไร
// มันควรเป็น pure logic
// ตัวอย่างแนวคิด:
// createRoom(name)
// ควร:ตรวจว่า name ว่างไหม
// สร้าง room
// return room
// มันไม่ควรมี res.status
// เพราะ service ไม่ควรผูกกับ Express
import { PrismaClient, RoomStatus, PlayerRole } from "@prisma/client";

const prisma = new PrismaClient();

export const roomService = {

  async createRoom(roomName: string, hostSessionId: string, maxPlayers: number) {
    return await prisma.room.create({
      data: {
        room_name: roomName,
        host_session_id: hostSessionId,
        max_players: maxPlayers,
        current_players: 0,
        status: RoomStatus.WAITING
      }
    });
  },

  async getRoomById(roomId: string) {
    return await prisma.room.findUnique({
      where: { room_id: roomId },
      include: {
        players: true
      }
    });
  },

  async joinRoomAsSpectator(roomId: string, sessionId: string, displayName: string) {
    return await prisma.player.create({
      data: {
        session_id: sessionId,
        display_name: displayName,
        room_id: roomId,
        role: PlayerRole.SPECTATOR
      }
    });
  },

  async selectSeat(roomId: string, sessionId: string, seatNumber: number) {

    // 1. เช็คว่าที่นั่งว่างไหม
    const existingSeat = await prisma.player.findFirst({
      where: {
        room_id: roomId,
        seat_number: seatNumber,
        role: PlayerRole.PLAYER
      }
    });

    if (existingSeat) {
      throw new Error("Seat already taken");
    }

    // 2. อัปเดต role + seat
    const updatedPlayer = await prisma.player.update({
      where: {
        session_id_room_id: {
          session_id: sessionId,
          room_id: roomId
        }
      },
      data: {
        seat_number: seatNumber,
        role: PlayerRole.PLAYER
      }
    });

    // 3. อัปเดต current_players
    await prisma.room.update({
      where: { room_id: roomId },
      data: {
        current_players: {
          increment: 1
        }
      }
    });

    return updatedPlayer;
  },

  async leaveRoom(roomId: string, sessionId: string) {

    const player = await prisma.player.findUnique({
      where: {
        session_id_room_id: {
          session_id: sessionId,
          room_id: roomId
        }
      }
    });

    if (!player) return;

    if (player.role === PlayerRole.PLAYER) {
      await prisma.room.update({
        where: { room_id: roomId },
        data: {
          current_players: {
            decrement: 1
          }
        }
      });
    }

    await prisma.player.delete({
      where: {
        session_id_room_id: {
          session_id: sessionId,
          room_id: roomId
        }
      }
    });
  },

  async startGame(roomId: string) {

    const room = await prisma.room.findUnique({
      where: { room_id: roomId }
    });

    if (!room) throw new Error("Room not found");

    if (room.current_players < 2) {
      throw new Error("Not enough players");
    }

    return await prisma.room.update({
      where: { room_id: roomId },
      data: {
        status: RoomStatus.PLAYING
      }
    });
  }

};
