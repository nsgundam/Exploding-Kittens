import { RoomStatus, PlayerRole, GameSessionStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { CreateRoomInput } from "../types/Rooms";

//generateRoomCode//
function generateRoomCode(length = 6): string {
  const chars = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
//// for starting game, we want to shuffle the player order, so we can use this helper function
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];

  }
  return a;
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

  async getAllRooms(status?: RoomStatus) {
    return await prisma.room.findMany({
      where: status ? { status } : undefined,
      include: { players: true }
    });
  },

  async getCurrentRoom(playerToken: string) {
    if (!playerToken) return null;

    const player = await prisma.player.findFirst({
      where: { player_token: playerToken },
      select: { room_id: true }
    });

    return player ? { roomId: player.room_id } : null;
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

  //   async startGame(roomId: string, playerToken: string) {
  //     return await prisma.$transaction(async (tx) => {
  //       const room = await tx.room.findUnique({
  //         where: { room_id: roomId }
  //       });

  //       if (!room) throw new Error("Room not found");
  //       if (room.host_token !== playerToken) throw new Error("Only the host can start the game");
  //       if (room.status !== RoomStatus.WAITING) throw new Error("Game already started");

  //       const playerCount = await tx.player.count({
  //         where: { room_id: roomId, role: PlayerRole.PLAYER }
  //       });

  //       if (playerCount < 2) throw new Error("Not enough players");

  //       return await tx.room.update({
  //         where: { room_id: roomId },
  //         data: { status: RoomStatus.PLAYING }
  //       });
  //     });
  //   }
  // };
  //  Start Game
  async startGame(roomId: string, playerToken: string) {
    return await prisma.$transaction(async (tx) => {

      // ── 1. ตรวจสอบห้องและสิทธิ์ host
      const room = await tx.room.findUnique({
        where: { room_id: roomId },
        include: { deck_config: true },
      });

      if (!room) throw new Error("Room not found");
      if (room.host_token !== playerToken) throw new Error("Only the host can start the game");
      if (room.status !== RoomStatus.WAITING) throw new Error("Game already started");

      // ── 2. ดึง players ที่นั่ง เรียงตาม seat_number (เพื่อกำหนด turn order) 
      const players = await tx.player.findMany({
        where: { room_id: roomId, role: PlayerRole.PLAYER },
        orderBy: { seat_number: "asc" },
      });

      if (players.length < 2) throw new Error("Need at least 2 players to start");

      // ── 3. ดึงไพ่ทั้งหมดจาก CardMaster ตาม DeckConfig expansion ───
      const expansions: string[] = Array.isArray(room.deck_config?.expansions)
        ? (room.deck_config!.expansions as string[])
        : [];

      const cardMasters = await tx.cardMaster.findMany({
        where: {
          OR: [
            { expansion_pack: null },
            ...(expansions.length > 0 ? [{ expansion_pack: { in: expansions } }] : []),
          ],
        },
      });

      // ── 4. แยก EK และ DF ออกจาก deck หลัก 
      //    กฎการแจกไพ่ Exploding Kittens:
      //    - DF: แจกให้ทุกคนคนละ 1 ใบก่อน
      //    - ไพ่ทั่วไป: แจกคนละ 4 ใบ
      //    - EK: ใส่กลับ deck = จำนวนผู้เล่น - 1 หลังแจกเสร็จ
      const CARDS_PER_HAND = 4;

      let baseDeck: string[] = [];

      for (const card of cardMasters) {
        if (card.card_code === "EK") continue; // จัดการ EK ทีหลัง
        if (card.card_code === "DF") continue; // DF แจกตรงๆ ไม่ใส่ใน deck
        for (let i = 0; i < card.quantity_in_deck; i++) {
          baseDeck.push(card.card_code);
        }
      }

      baseDeck = shuffleArray(baseDeck);

      // ── 5. แจกไพ่ให้แต่ละผู้เล่น: DF 1 ใบ + ไพ่ทั่วไป 4 ใบ
      const hands: Record<string, string[]> = {};
      for (const p of players) {
        hands[p.player_id] = ["DF"]; // แจก Defuse ก่อนเลย
        for (let i = 0; i < CARDS_PER_HAND; i++) {
          const card = baseDeck.pop();
          if (!card) throw new Error("Not enough cards in deck to deal");
          hands[p.player_id]!.push(card);
        }
      }

      // ── 6. ใส่ EK กลับ deck (จำนวน = players - 1) แล้วสับใหม่ 
      const ekCount = players.length - 1;
      for (let i = 0; i < ekCount; i++) {
        baseDeck.push("EK");
      }
      baseDeck = shuffleArray(baseDeck);

      // ── 7. สร้าง GameSession กำหนดผู้เล่นคนแรกที่ได้ตาแรก (ตามลำดับที่นั่ง)
      const firstPlayer = players[0];

      if (!firstPlayer) throw new Error("No players available to start game");

      const gameSession = await tx.gameSession.create({
        data: {
          room_id: roomId,
          status: GameSessionStatus.IN_PROGRESS,
          current_turn_player_id: firstPlayer.player_id,
          turn_number: 1,
          start_time: new Date(),

        },
      });
      console.log("✅ GameSession created:", gameSession.session_id);

      // ── 8. สร้าง DeckState เริ่มต้นสำหรับ Session นี้
      await tx.deckState.create({
        data: {
          session_id: gameSession.session_id,
          deck_order: baseDeck,         // array ของ card_code เรียงจากล่าง→บน
          discard_pile: [],
          cards_remaining: baseDeck.length,
        },
      });
      console.log("✅ DeckState created");

      // ── 9. สร้าง CardHand ให้ทุกผู้เล่น   
      await tx.cardHand.createMany({
        data: players.map((p) => ({
          player_id: p.player_id,
          session_id: gameSession.session_id,
          cards: hands[p.player_id] ?? [],   // ✅ แก้ตรงนี้
          card_count: (hands[p.player_id] ?? []).length,
        })),
      });
      console.log("✅ CardHand created");

      // ── 10. สร้าง GameLog: GAME_STARTED 
      const hostPlayer = players.find((p) => p.player_token === playerToken) ?? players[0];

      if (!hostPlayer) throw new Error("Host player not found");

      await tx.gameLog.create({
        data: {
          session_id: gameSession.session_id,
          player_id: hostPlayer.player_id,
          player_display_name: hostPlayer.display_name,
          action_type: "GAME_STARTED",
          action_details: {
            player_count: players.length,
            turn_order: players.map((p) => ({
              player_id: p.player_id,
              display_name: p.display_name,
              seat_number: p.seat_number,
            })),
            first_turn_player_id: firstPlayer.player_id,
            first_turn_display_name: firstPlayer.display_name,
            cards_in_deck: baseDeck.length,
            ek_count: ekCount,
          },
          turn_number: 1,
        },
      });
      console.log("✅ GameLog created");

      // ── 11. อัปเดต Room status → PLAYING 
      const updatedRoom = await tx.room.update({
        where: { room_id: roomId },
        data: { status: RoomStatus.PLAYING },
        include: { players: true, deck_config: true },
      });
      console.log("✅ Room updated to PLAYING");
      
      // ── 12. ดึง DeckState และ CardHand มาแนบ response
      const deckState = await tx.deckState.findUnique({
        where: { session_id: gameSession.session_id },
      });

      const cardHands = await tx.cardHand.findMany({
        where: { session_id: gameSession.session_id },
      });

      return { room: updatedRoom, session: gameSession, deckState, cardHands };
    });
  },
};