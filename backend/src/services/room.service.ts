import { RoomStatus, PlayerRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { CreateRoomInput } from "../types/Rooms";

function generateRoomCode(length = 6): string {
  const chars = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const roomService = {

  async createRoom(payload: CreateRoomInput) {
    const { playerToken, roomName, hostName, maxPlayers, cardVersion, expansions } = payload;

    // Generate room code with DB loop check to avoid collision
    let newRoomCode = '';
    let isUnique = false;

    while (!isUnique) {
      newRoomCode = generateRoomCode();
      const existingRoom = await prisma.room.findUnique({
        where: { room_id: newRoomCode }
      });
      if (!existingRoom) {
        isUnique = true;
      }
    }

    return await prisma.$transaction(async (tx) => {
      await tx.playerIdentity.upsert({
        where: { token: playerToken },
        update: { display_name: hostName, last_seen: new Date() },
        create: { token: playerToken, display_name: hostName }
      });

      const room = await tx.room.create({
        data: {
          room_id: newRoomCode,
          room_name: roomName,
          max_players: maxPlayers,
          status: RoomStatus.WAITING,
          host_token: playerToken
        }
      });

      await tx.deckConfig.create({
        data: {
          room_id: room.room_id,
          card_version: cardVersion,
          expansions: expansions
        }
      });

      await tx.player.create({
        data: {
          player_token: playerToken,
          display_name: hostName,
          room_id: room.room_id,
          seat_number: 1,
          role: PlayerRole.PLAYER
        }
      });

      return await tx.room.findUnique({
        where: { room_id: room.room_id },
        include: {
          host_identity: { select: { display_name: true } },
          players: true,
          deck_config: true
        }
      });
    });
  },

  async getAllRooms() {
    return await prisma.room.findMany({
      include: { players: true }
    });
  },

  async getRoomById(roomId: string) {
    const room = await prisma.room.findUnique({
      where: { room_id: roomId },
      include: { players: true, deck_config: true }
    });
    if (!room) throw new Error("Room not found");
    return room;
  },

  async joinRoom(roomId: string, playerToken: string, displayName: string) {
    if (!displayName || displayName.trim().length === 0) {
      throw new Error("Display name is required");
    }

    const room = await prisma.room.findUnique({
      where: { room_id: roomId }
    });
    if (!room) throw new Error("Room not found");

    return await prisma.$transaction(async (tx) => {
      await tx.playerIdentity.upsert({
        where: { token: playerToken },
        update: { display_name: displayName.trim(), last_seen: new Date() },
        create: { token: playerToken, display_name: displayName.trim() }
      });

      const existing = await tx.player.findUnique({
        where: {
          player_token_room_id: {
            player_token: playerToken,
            room_id: roomId
          }
        }
      });

      if (existing) return existing;

      return await tx.player.create({
        data: {
          player_token: playerToken,
          display_name: displayName.trim(),
          room_id: roomId,
          role: PlayerRole.SPECTATOR
        }
      });
    });
  },

  async selectSeat(roomId: string, playerToken: string, seatNumber: number) {
    if (seatNumber < 1) {
      throw new Error("Invalid seat number");
    }

    return await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { room_id: roomId }
      });

      if (!room) throw new Error("Room not found");
      if (room.status !== RoomStatus.WAITING) throw new Error("Game already started");

      const existingSeat = await tx.player.findFirst({
        where: { room_id: roomId, seat_number: seatNumber, role: PlayerRole.PLAYER }
      });

      if (existingSeat) {
        if (existingSeat.player_token === playerToken) {
          return existingSeat; // Already sitting here
        }
        throw new Error("Seat already taken");
      }

      // If the player is changing seats, we don't count them as a new player
      const currentPlayerCount = await tx.player.count({
        where: { room_id: roomId, role: PlayerRole.PLAYER, player_token: { not: playerToken } }
      });

      if (currentPlayerCount >= room.max_players) throw new Error("Room is full");

      return await tx.player.update({
        where: {
          player_token_room_id: {
            player_token: playerToken,
            room_id: roomId
          }
        },
        data: {
          seat_number: seatNumber,
          role: PlayerRole.PLAYER
        }
      });
    });
  },

  async unseatPlayer(roomId: string, playerToken: string) {
    return await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { room_id: roomId }
      });

      if (!room) throw new Error("Room not found");
      if (room.status !== RoomStatus.WAITING) throw new Error("Game already started");

      return await tx.player.update({
        where: {
          player_token_room_id: {
            player_token: playerToken,
            room_id: roomId
          }
        },
        data: {
          seat_number: null,
          role: PlayerRole.SPECTATOR
        }
      });
    });
  },

  async leaveRoom(roomId: string, playerToken: string) {
    return await prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: {
          player_token_room_id: {
            player_token: playerToken,
            room_id: roomId
          }
        }
      });

      if (!player) return null;

      await tx.player.delete({
        where: {
          player_token_room_id: {
            player_token: playerToken,
            room_id: roomId
          }
        }
      });

      const remainingPlayers = await tx.player.findMany({
        where: { room_id: roomId },
        orderBy: { joined_at: 'asc' }
      });

      if (remainingPlayers.length === 0) {
        await tx.room.delete({
          where: { room_id: roomId }
        });
        return null;
      }

      const room = await tx.room.findUnique({
        where: { room_id: roomId }
      });

      if (room && room.host_token === playerToken) {
        // Prefer promoting a seated player to host
        const candidateHost = remainingPlayers.find(p => p.role === PlayerRole.PLAYER) || remainingPlayers[0];
        if (candidateHost) {
          await tx.room.update({
            where: { room_id: roomId },
            data: { host_token: candidateHost.player_token }
          });
        }
      }

      return await tx.room.findUnique({
        where: { room_id: roomId },
        include: { players: true }
      });
    });
  },

  async startGame(roomId: string, playerToken: string) {
    return await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { room_id: roomId }
      });

      if (!room) throw new Error("Room not found");
      if (room.host_token !== playerToken) throw new Error("Only the host can start the game");
      if (room.status !== RoomStatus.WAITING) throw new Error("Game already started");

      const playerCount = await tx.player.count({
        where: { room_id: roomId, role: PlayerRole.PLAYER }
      });

      if (playerCount < 2) throw new Error("Not enough players");

      return await tx.room.update({
        where: { room_id: roomId },
        data: { status: RoomStatus.PLAYING }
      });
    });
  }
};