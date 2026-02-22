import { PrismaClient, RoomStatus, PlayerRole } from "@prisma/client";

const prisma = new PrismaClient();

export const roomService = {

  async createRoom(roomName: string, hostSessionId: string, maxPlayers: number) {

    if (!roomName || roomName.trim().length === 0) {
      throw new Error("Room name is required");
    }

    if (maxPlayers < 2) {
      throw new Error("Room must allow at least 2 players");
    }

    return await prisma.room.create({
      data: {
        room_name: roomName.trim(),
        host_session_id: hostSessionId,
        max_players: maxPlayers,
        status: RoomStatus.WAITING
      }
    });
  },

  async getAllRooms() {
    return await prisma.room.findMany({
      include: {
        players: true
      }
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
      where: {
        session_id_room_id: {
          session_id: sessionId,
          room_id: roomId
        }
      }
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

      return updatedPlayer;
    });
  },

  async leaveRoom(roomId: string, sessionId: string) {

    return await prisma.$transaction(async (tx) => {

      const player = await tx.player.findUnique({
        where: {
          session_id_room_id: {
            session_id: sessionId,
            room_id: roomId
          }
        }
      });

      if (!player) return;

      await tx.player.delete({
        where: {
          session_id_room_id: {
            session_id: sessionId,
            room_id: roomId
          }
        }
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
}}