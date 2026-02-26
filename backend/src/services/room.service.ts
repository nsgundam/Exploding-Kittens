import { RoomStatus, PlayerRole } from "@prisma/client";
import { prisma } from "../config/prisma";
export const roomService = {

  // ✅ แทนที่ createRoom เดิมด้วยอันนี้
  async createRoom(room_name: string, displayName: string, maxPlayers: number) {
    return await prisma.$transaction(async (tx) => {
      const sessionId = uuidv4();

      const room = await tx.room.create({
        data: {
          room_name,
          max_players: maxPlayers,
          status: RoomStatus.WAITING
        }
      });

      await tx.player.create({
        data: {
          session_id: sessionId,
          display_name: displayName,
          room_id: room.room_id,
          seat_number: 1,
          role: PlayerRole.PLAYER
        }
      });

      const updatedRoom = await tx.room.update({
        where: { room_id: room.room_id },
        data: { host_session_id: sessionId }
      });

      return updatedRoom;
    });
  },

  // ...ฟังก์ชันอื่นๆ ที่เหลือเหมือนเดิม

  async getAllRooms() {
    return await prisma.room.findMany({
      include: { players: true }
    });
  },

  async getRoomById(roomId: string) {

    const room = await prisma.room.findUnique({
      where: { room_id: roomId },
      include: { players: true }
    });

    if (!room) throw new Error("Room not found");

    return room;
  },

  async joinRoomAsSpectator(roomId: string, sessionId: string, displayName: string) {

    if (!displayName || displayName.trim().length === 0) {
      throw new Error("Display name is required");
    }

    const room = await prisma.room.findUnique({
      where: { room_id: roomId }
    });

    if (!room) throw new Error("Room not found");

    const existing = await prisma.player.findUnique({
      where: { session_id: sessionId }
    });

    if (existing) return existing;

    return await prisma.player.create({
      data: {
        session_id: sessionId,
        display_name: displayName.trim(),
        room_id: roomId,
        role: PlayerRole.SPECTATOR
      }
    });
  },

  async selectSeat(roomId: string, sessionId: string, seatNumber: number) {

    if (seatNumber < 1) {
      throw new Error("Invalid seat number");
    }

    return await prisma.$transaction(async (tx) => {

      const room = await tx.room.findUnique({
        where: { room_id: roomId }
      });

      if (!room) throw new Error("Room not found");

      if (room.status !== RoomStatus.WAITING) {
        throw new Error("Game already started");
      }

      const currentPlayerCount = await tx.player.count({
        where: {
          room_id: roomId,
          role: PlayerRole.PLAYER
        }
      });

      if (currentPlayerCount >= room.max_players) {
        throw new Error("Room is full");
      }

      // ไม่จำเป็นต้องเช็ค seat ซ้ำก็ได้ เพราะ DB มี @@unique
      // แต่เก็บไว้เพื่อ UX ที่ดี
      const existingSeat = await tx.player.findFirst({
        where: {
          room_id: roomId,
          seat_number: seatNumber,
          role: PlayerRole.PLAYER
        }
      });

      if (existingSeat) {
        throw new Error("Seat already taken");
      }

      const updatedPlayer = await tx.player.update({
        where: {
          session_id: sessionId
        },
        data: {
          seat_number: seatNumber,
          role: PlayerRole.PLAYER
        }
      });

      return updatedPlayer;
    });
  },

  async leaveRoom(roomId: string, sessionId: string) {
    return await prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { session_id: sessionId }
      });

      if (!player) return null;

      await tx.player.delete({
        where: { session_id: sessionId }
      });

      return await tx.room.findUnique({
        where: { room_id: roomId },
        include: { players: true }
      });
    });
  },

  async startGame(roomId: string) {

    return await prisma.$transaction(async (tx) => {

      const room = await tx.room.findUnique({
        where: { room_id: roomId }
      });

      if (!room) throw new Error("Room not found");

      if (room.status !== RoomStatus.WAITING) {
        throw new Error("Game already started");
      }

      const playerCount = await tx.player.count({
        where: {
          room_id: roomId,
          role: PlayerRole.PLAYER
        }
      });

      if (playerCount < 2) {
        throw new Error("Not enough players");
      }

      return await tx.room.update({
        where: { room_id: roomId },
        data: { status: RoomStatus.PLAYING }
      });

    });
  }
};