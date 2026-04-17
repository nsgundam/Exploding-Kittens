import { RoomStatus, PlayerRole, GameSessionStatus } from "@prisma/client";
import { gameService } from "./game.service";
import { getWinnerIfAny, processGameOver } from "./game.turn";
import { prisma } from "../config/prisma";
import { CreateRoomInput, UpdateDeckConfigInput, RoomWithRelations, CurrentRoomResponse } from "../types/types";
import { NotFoundError, BadRequestError, ForbiddenError } from "../utils/errors";
import type { Player, Room } from "@prisma/client";
import { GAME_CONFIG, EliminationReason } from "../constants/game";

// ── Helpers ────────────────────────────────────────────────────

function generateRoomCode(length = GAME_CONFIG.ROOM_CODE_LENGTH): string {
  const chars = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ── Room Service ───────────────────────────────────────────────

export const roomService = {

  /**
   * Create a new room with deck config and host player.
   * FR-02-3, FR-03-1/2, S1-10
   */
  async createRoom(payload: CreateRoomInput): Promise<RoomWithRelations | null> {
    const { playerToken, roomName, hostName, profilePicture, maxPlayers, cardVersion, expansions } = payload;
    const profilePictureData =
      profilePicture === undefined ? {} : { profile_picture: profilePicture };

    // Generate unique room code
    let newRoomCode = "";
    let isUnique = false;
    let retries = 0;

    while (!isUnique && retries < GAME_CONFIG.MAX_ROOM_CODE_RETRIES) {
      newRoomCode = generateRoomCode();
      const existingRoom = await prisma.room.findUnique({
        where: { room_id: newRoomCode },
      });
      if (!existingRoom) {
        isUnique = true;
      }
      retries++;
    }

    if (!isUnique) {
      throw new Error("Failed to generate unique room code. Please try again.");
    }

    return await prisma.$transaction(async (tx) => {
      await tx.playerIdentity.upsert({
        where: { token: playerToken },
        update: {
          display_name: hostName,
          ...profilePictureData,
          last_seen: new Date(),
        },
        create: {
          token: playerToken,
          display_name: hostName,
          ...profilePictureData,
        },
      });

      const room = await tx.room.create({
        data: {
          room_id: newRoomCode,
          room_name: roomName,
          max_players: maxPlayers,
          status: RoomStatus.WAITING,
          host_token: playerToken,
        },
      });

      await tx.deckConfig.create({
        data: {
          room_id: room.room_id,
          card_version: cardVersion,
          expansions: expansions,
        },
      });

      await tx.player.create({
        data: {
          player_token: playerToken,
          display_name: hostName,
          ...profilePictureData,
          room_id: room.room_id,
          seat_number: 1,
          role: PlayerRole.PLAYER,
        },
      });

      return await tx.room.findUnique({
        where: { room_id: room.room_id },
        include: {
          host_identity: { select: { display_name: true } },
          players: true,
          deck_config: true,
        },
      });
    });
  },

  /**
   * Get all rooms, optionally filtered by status.
   * FR-02-1, S1-09
   */
  async getAllRooms(status?: RoomStatus, card_version?: string): Promise<RoomWithRelations[]> {
    return await prisma.room.findMany({
      where: {
        status: status,
        deck_config: card_version ? { card_version } : undefined,
      },
      include: { players: true, deck_config: true },
    }) as RoomWithRelations[];
  },

  /**
   * Check if a player token is currently in a room.
   * FR-01-5, S1-08
   */
  async getCurrentRoom(playerToken: string): Promise<CurrentRoomResponse | null> {
    if (!playerToken) return null;

    const player = await prisma.player.findFirst({
      where: { player_token: playerToken },
      select: { room_id: true },
    });

    return player ? { roomId: player.room_id } : null;
  },

  /**
   * Get a room by ID with players and deck config.
   * FR-02-2, S1-11
   */
  async getRoomById(roomId: string): Promise<RoomWithRelations> {
    const room = await prisma.room.findUnique({
      where: { room_id: roomId },
      include: { players: true, deck_config: true },
    });
    if (!room) throw new NotFoundError("Room");
    return room as RoomWithRelations;
  },

  /**
   * Join a room as SPECTATOR.
   * FR-03-6, S1-15
   */
  async joinRoom(
    roomId: string,
    playerToken: string,
    displayName: string,
    profilePicture?: string | null,
  ): Promise<Player> {
    if (!displayName || displayName.trim().length === 0) {
      throw new BadRequestError("Display name is required");
    }
    const normalizedDisplayName = displayName.trim();
    const profilePictureData =
      profilePicture === undefined ? {} : { profile_picture: profilePicture };

    const room = await prisma.room.findUnique({
      where: { room_id: roomId },
    });
    if (!room) throw new NotFoundError("Room");

    return await prisma.$transaction(async (tx) => {
      await tx.playerIdentity.upsert({
        where: { token: playerToken },
        update: {
          display_name: normalizedDisplayName,
          ...profilePictureData,
          last_seen: new Date(),
        },
        create: {
          token: playerToken,
          display_name: normalizedDisplayName,
          ...profilePictureData,
        },
      });

      const existing = await tx.player.findUnique({
        where: {
          player_token_room_id: {
            player_token: playerToken,
            room_id: roomId,
          },
        },
      });

      if (existing) {
        return await tx.player.update({
          where: { player_id: existing.player_id },
          data: {
            display_name: normalizedDisplayName,
            ...profilePictureData,
            is_active: true,
          },
        });
      }

      return await tx.player.create({
        data: {
          player_token: playerToken,
          display_name: normalizedDisplayName,
          ...profilePictureData,
          room_id: roomId,
          role: PlayerRole.SPECTATOR,
          is_active: true,
        },
      });
    });
  },

  /**
   * Update player connectivity status.
   */
  async setPlayerActive(roomId: string, playerToken: string, isActive: boolean): Promise<Player | null> {
    try {
      return await prisma.player.update({
        where: {
          player_token_room_id: {
            player_token: playerToken,
            room_id: roomId,
          },
        },
        data: { is_active: isActive },
      });
    } catch (e) {
      return null;
    }
  },

  /**
   * Select a seat to become a PLAYER.
   * FR-03-7, S1-18/19
   */
  async selectSeat(roomId: string, playerToken: string, seatNumber: number): Promise<Player> {
    if (seatNumber < 1) {
      throw new BadRequestError("Invalid seat number");
    }

    return await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { room_id: roomId },
      });

      if (!room) throw new NotFoundError("Room");
      if (room.status !== RoomStatus.WAITING) throw new BadRequestError("Game already started");

      const existingSeat = await tx.player.findFirst({
        where: { room_id: roomId, seat_number: seatNumber, role: PlayerRole.PLAYER },
      });

      if (existingSeat) {
        if (existingSeat.player_token === playerToken) {
          return existingSeat; // Already sitting here
        }
        throw new BadRequestError("Seat already taken");
      }

      // Don't count this player when checking capacity
      const currentPlayerCount = await tx.player.count({
        where: { room_id: roomId, role: PlayerRole.PLAYER, player_token: { not: playerToken } },
      });

      if (currentPlayerCount >= room.max_players) throw new BadRequestError("Room is full");

      return await tx.player.update({
        where: {
          player_token_room_id: {
            player_token: playerToken,
            room_id: roomId,
          },
        },
        data: {
          seat_number: seatNumber,
          role: PlayerRole.PLAYER,
        },
      });
    });
  },

  /**
   * Unseat a player back to SPECTATOR.
   * FR-03-8, S1-18/S1-20
   */
  async unseatPlayer(roomId: string, playerToken: string): Promise<Player> {
    return await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { room_id: roomId },
      });

      if (!room) throw new NotFoundError("Room");
      if (room.status !== RoomStatus.WAITING) throw new BadRequestError("Game already started");

      return await tx.player.update({
        where: {
          player_token_room_id: {
            player_token: playerToken,
            room_id: roomId,
          },
        },
        data: {
          seat_number: null,
          role: PlayerRole.SPECTATOR,
        },
      });
    });
  },

  /**
   * Leave a room. If empty, delete the room. If host leaves, migrate host.
   * FR-03-11, S1-22/23
   */
  async leaveRoom(
    roomId: string,
    playerToken: string,
  ): Promise<{ room: RoomWithRelations | null; gameEvents?: { eventName: string; payload: any }[] }> {
    return await prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { player_token_room_id: { player_token: playerToken, room_id: roomId } },
      });

      if (!player) return { room: null };

      const room = await tx.room.findUnique({ where: { room_id: roomId } });

      let gameEvents: { eventName: string; payload: any }[] = [];

      // ── เช็คว่าห้องกำลัง PLAYING และผู้เล่นที่ออกยังมีชีวิตและเป็นผู้เล่น ──
      if (room?.status === RoomStatus.PLAYING && player.is_alive && player.role === PlayerRole.PLAYER) {
        const session = await tx.gameSession.findFirst({
          where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS },
        });

        if (session) {
          // mark ตายก่อน เพื่อให้ checkWinner นับถูก
          await tx.player.update({
            where: { player_id: player.player_id },
            data: { is_alive: false },
          });

          await tx.gameLog.create({
            data: {
              session_id: session.session_id,
              player_id: player.player_id,
              player_display_name: player.display_name,
              action_type: "PLAYER_ELIMINATED",
              action_details: { reason: "left_room" },
              turn_number: session.turn_number,
            },
          });

          const isCurrentTurnPlayer = session.current_turn_player_id === player.player_id;

          const winner = await getWinnerIfAny(tx, roomId);

          if (winner) {
            const overRes = await processGameOver(tx, session, roomId, winner, player.player_id, "left_room");

            // ลบผู้เล่นออกหลัง game over
            await tx.player.delete({
              where: { player_token_room_id: { player_token: playerToken, room_id: roomId } },
            });

            const updatedRoom = await tx.room.findUnique({
              where: { room_id: roomId },
              include: { players: true, deck_config: true },
            });

            gameEvents.push({
              eventName: "playerEliminated",
              payload: {
                action: "GAME_OVER",
                winner: overRes.winner,
              },
            });

            return {
              room: updatedRoom as RoomWithRelations,
              gameEvents,
            };
          } else if (isCurrentTurnPlayer) {
            const advRes = await gameService.advanceTurn(tx, session, roomId, player.player_id);
            gameEvents.push({
              eventName: "playerEliminated",
              payload: {
                action: "PLAYER_ELIMINATED",
                isLeftRoom: true,
                eliminatedPlayer: {
                  player_id: player.player_id,
                  display_name: player.display_name,
                },
                nextTurn: advRes.nextTurn,
              },
            });
          } else {
            gameEvents.push({
              eventName: "playerEliminated",
              payload: {
                action: "PLAYER_ELIMINATED",
                isLeftRoom: true,
                eliminatedPlayer: {
                  player_id: player.player_id,
                  display_name: player.display_name,
                },
              },
            });
          }
          // ไม่ game over — ไหลต่อลบผู้เล่นปกติ
        }
      }

      // ── ลบผู้เล่นออกจากห้องปกติ ──
      await tx.player.delete({
        where: { player_token_room_id: { player_token: playerToken, room_id: roomId } },
      });

      const remainingPlayers = await tx.player.findMany({
        where: { room_id: roomId },
        orderBy: { joined_at: "asc" },
      });

      if (remainingPlayers.length === 0) {
        await tx.room.delete({ where: { room_id: roomId } });
        return { room: null };
      }

      // Migrate host ถ้าคนที่ออกเป็น host (FR-03-11)
      // รันก่อน findUnique เพื่อให้ updatedRoom มี host_token ใหม่เลย
      let newHostToken: string | null = null;
      if (room && room.host_token === playerToken) {
        const candidateHost =
          remainingPlayers.find((p) => p.role === PlayerRole.PLAYER && p.is_alive) ||
          remainingPlayers.find((p) => p.role === PlayerRole.PLAYER) ||
          remainingPlayers[0];
        if (candidateHost) {
          newHostToken = candidateHost.player_token;
          await tx.room.update({
            where: { room_id: roomId },
            data: { host_token: newHostToken },
          });
          // แจ้ง Frontend ว่า Host เปลี่ยนแล้ว
          gameEvents.push({
            eventName: "hostMigrated",
            payload: {
              newHostToken,
              newHostDisplayName: candidateHost.display_name,
            },
          });
        }
      }

      const updatedRoom = await tx.room.findUnique({
        where: { room_id: roomId },
        include: { players: true, deck_config: true },
      });

      return { room: updatedRoom as RoomWithRelations, gameEvents };
    });
  },

  /**
   * Update deck configuration (card version + expansions).
   * Only the host can change config while room is WAITING.
   * FR-03-4, S2-03
   */
  async updateDeckConfig(
    roomId: string,
    playerToken: string,
    config: UpdateDeckConfigInput
  ): Promise<RoomWithRelations> {
    const room = await prisma.room.findUnique({
      where: { room_id: roomId },
      include: { deck_config: true },
    });

    if (!room) throw new NotFoundError("Room");
    if (room.host_token !== playerToken) throw new ForbiddenError("Only the host can change deck config");
    if (room.status !== RoomStatus.WAITING) throw new BadRequestError("Cannot change config during a game");

    await prisma.deckConfig.update({
      where: { room_id: roomId },
      data: {
        card_version: config.cardVersion,
        expansions: config.expansions,
        last_modified: new Date(),
      },
    });

    return await this.getRoomById(roomId);
  },

  /**
   * On disconnect: immediately migrate host if the disconnecting player is the host.
   * Does NOT eliminate the player — just reassigns host role.
   */
  async migrateHostOnDisconnect(
    roomId: string,
    playerToken: string,
  ): Promise<{ newHostToken: string; newHostDisplayName: string } | null> {
    const room = await prisma.room.findUnique({ where: { room_id: roomId } });
    if (!room || room.host_token !== playerToken) return null;

    const candidates = await prisma.player.findMany({
      where: {
        room_id: roomId,
        player_token: { not: playerToken },
        role: PlayerRole.PLAYER,
        is_alive: true,
      },
      orderBy: { joined_at: "asc" },
    });

    const candidate = candidates[0] ?? await prisma.player.findFirst({
      where: { room_id: roomId, player_token: { not: playerToken } },
      orderBy: { joined_at: "asc" },
    });

    if (!candidate) return null;

    await prisma.room.update({
      where: { room_id: roomId },
      data: { host_token: candidate.player_token },
    });

    return { newHostToken: candidate.player_token, newHostDisplayName: candidate.display_name };
  },
};

