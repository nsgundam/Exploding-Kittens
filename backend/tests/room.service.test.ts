import { roomService } from "../src/services/room.service";
import { BadRequestError, NotFoundError, ForbiddenError } from "../src/utils/errors";
import { RoomStatus, PlayerRole } from "@prisma/client";

// ── Mock prisma ────────────────────────────────────────────────
jest.mock("../src/config/prisma", () => ({
  prisma: {
    room: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    player: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    playerIdentity: {
      upsert: jest.fn(),
    },
    deckConfig: {
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const { prisma } = require("../src/config/prisma");

// ── Helpers ────────────────────────────────────────────────────

/** สร้าง mock room ที่ใช้ซ้ำได้ */
function mockRoom(overrides = {}) {
  return {
    room_id: "ROOM01",
    room_name: "Test Room",
    status: RoomStatus.WAITING,
    host_token: "host-token",
    max_players: 4,
    last_winner_token: null,
    ...overrides,
  };
}

/** สร้าง mock player */
function mockPlayer(overrides = {}) {
  return {
    player_id: "p1",
    player_token: "host-token",
    display_name: "Alice",
    room_id: "ROOM01",
    seat_number: 1,
    role: PlayerRole.PLAYER,
    is_alive: true,
    afk_count: 0,
    joined_at: new Date(),
    ...overrides,
  };
}

// ── generateRoomCode (tested indirectly via createRoom) ────────

describe("roomService.createRoom()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("[UT-01] Happy: สร้าง room code เป็น 6 หลักตัวเลขเท่านั้น", async () => {
    // ให้ transaction เรียก callback แล้ว return ผล
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(null); // code ไม่ซ้ำ
    prisma.playerIdentity.upsert.mockResolvedValue({});
    prisma.room.create.mockResolvedValue(mockRoom());
    prisma.deckConfig.create.mockResolvedValue({});
    prisma.player.create.mockResolvedValue(mockPlayer());
    prisma.room.findUnique
      .mockResolvedValueOnce(null) // unique check
      .mockResolvedValueOnce({
        ...mockRoom(),
        host_identity: { display_name: "Alice" },
        players: [mockPlayer()],
        deck_config: { card_version: "classic", expansions: [] },
      });

    const result = await roomService.createRoom({
      playerToken: "host-token",
      roomName: "Test Room",
      hostName: "Alice",
      maxPlayers: 4,
      cardVersion: "classic",
      expansions: [],
    });

    expect(result?.room_id).toMatch(/^[0-9]{6}$/);
  });
});

// ── joinRoom ───────────────────────────────────────────────────

describe("roomService.joinRoom()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("[UT-03] Negative: displayName ว่าง → throw BadRequestError 'Display name is required'", async () => {
    await expect(
      roomService.joinRoom("ROOM01", "tok-1", "")
    ).rejects.toThrow(BadRequestError);

    await expect(
      roomService.joinRoom("ROOM01", "tok-1", "")
    ).rejects.toThrow("Display name is required");
  });

  it("[UT-03] Negative: displayName เป็น whitespace → throw BadRequestError", async () => {
    await expect(
      roomService.joinRoom("ROOM01", "tok-1", "   ")
    ).rejects.toThrow(BadRequestError);
  });

  it("[UT-04] Negative: roomId ไม่มีในระบบ → throw NotFoundError 'Room not found'", async () => {
    prisma.room.findUnique.mockResolvedValue(null);

    await expect(
      roomService.joinRoom("INVALID", "tok-1", "Alice")
    ).rejects.toThrow(NotFoundError);

    await expect(
      roomService.joinRoom("INVALID", "tok-1", "Alice")
    ).rejects.toThrow("Room not found");
  });

  it("[UT-05] Happy: เข้าห้องซ้ำ (token + roomId เดิม) → return existing player ไม่ duplicate", async () => {
    const existingPlayer = mockPlayer({ player_token: "tok-1" });

    prisma.room.findUnique.mockResolvedValue(mockRoom());
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.playerIdentity.upsert.mockResolvedValue({});
    prisma.player.findUnique.mockResolvedValue(existingPlayer);

    const result = await roomService.joinRoom("ROOM01", "tok-1", "Alice");

    expect(result).toEqual(existingPlayer);
    expect(prisma.player.create).not.toHaveBeenCalled();
  });

  it("[UT-05] Happy: เข้าห้องใหม่ → สร้าง player ใหม่ด้วย role SPECTATOR", async () => {
    const newPlayer = mockPlayer({ role: PlayerRole.SPECTATOR, seat_number: null });

    prisma.room.findUnique.mockResolvedValue(mockRoom());
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.playerIdentity.upsert.mockResolvedValue({});
    prisma.player.findUnique.mockResolvedValue(null); // ไม่เคยเข้าห้องนี้มาก่อน
    prisma.player.create.mockResolvedValue(newPlayer);

    const result = await roomService.joinRoom("ROOM01", "tok-new", "Bob");

    expect(prisma.player.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: PlayerRole.SPECTATOR }),
      })
    );
    expect(result.role).toBe(PlayerRole.SPECTATOR);
  });
});

// ── selectSeat ─────────────────────────────────────────────────

describe("roomService.selectSeat()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("[UT-06] Negative: seatNumber < 1 → throw BadRequestError 'Invalid seat number'", async () => {
    await expect(
      roomService.selectSeat("ROOM01", "tok-1", 0)
    ).rejects.toThrow(BadRequestError);

    await expect(
      roomService.selectSeat("ROOM01", "tok-1", 0)
    ).rejects.toThrow("Invalid seat number");
  });

  it("[UT-06] Negative: seatNumber เป็นลบ → throw BadRequestError", async () => {
    await expect(
      roomService.selectSeat("ROOM01", "tok-1", -5)
    ).rejects.toThrow(BadRequestError);
  });

  it("[UT-07] Negative: ที่นั่งมีคนอื่นอยู่แล้ว → throw BadRequestError 'Seat already taken'", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(mockRoom());
    // ที่นั่ง 2 ถูกครอบครองโดย player อื่น
    prisma.player.findFirst.mockResolvedValue(
      mockPlayer({ player_id: "p-other", player_token: "tok-other", seat_number: 2 })
    );

    await expect(
      roomService.selectSeat("ROOM01", "tok-1", 2)
    ).rejects.toThrow(BadRequestError);

    await expect(
      roomService.selectSeat("ROOM01", "tok-1", 2)
    ).rejects.toThrow("Seat already taken");
  });

  it("[UT-08] Negative: ห้องเต็มแล้ว → throw BadRequestError 'Room is full'", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(mockRoom({ max_players: 2 }));
    prisma.player.findFirst.mockResolvedValue(null); // ที่นั่งว่าง
    prisma.player.count.mockResolvedValue(2); // แต่ห้องเต็มแล้ว (2/2)

    await expect(
      roomService.selectSeat("ROOM01", "tok-1", 3)
    ).rejects.toThrow(BadRequestError);

    await expect(
      roomService.selectSeat("ROOM01", "tok-1", 3)
    ).rejects.toThrow("Room is full");
  });

  it("[UT-07] Happy: เลือกที่นั่งที่ตัวเองนั่งอยู่แล้ว → return existing player ไม่ error", async () => {
    const samePlayer = mockPlayer({ player_token: "tok-1", seat_number: 1 });

    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(mockRoom());
    prisma.player.findFirst.mockResolvedValue(samePlayer); // ที่นั่ง 1 = คนเดิม

    const result = await roomService.selectSeat("ROOM01", "tok-1", 1);

    expect(result).toEqual(samePlayer);
    expect(prisma.player.update).not.toHaveBeenCalled();
  });

  it("[UT-06/08] Happy: เลือกที่นั่งได้สำเร็จ → update role เป็น PLAYER", async () => {
    const updatedPlayer = mockPlayer({ role: PlayerRole.PLAYER, seat_number: 2 });

    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(mockRoom());
    prisma.player.findFirst.mockResolvedValue(null); // ที่นั่งว่าง
    prisma.player.count.mockResolvedValue(0); // ยังไม่มี player
    prisma.player.update.mockResolvedValue(updatedPlayer);

    const result = await roomService.selectSeat("ROOM01", "tok-1", 2);

    expect(result.role).toBe(PlayerRole.PLAYER);
    expect(result.seat_number).toBe(2);
  });
});

// ── unseatPlayer ───────────────────────────────────────────────

describe("roomService.unseatPlayer()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("Happy: ลุกจากที่นั่ง → update role เป็น SPECTATOR, seat_number = null", async () => {
    const spectatorPlayer = mockPlayer({ role: PlayerRole.SPECTATOR, seat_number: null });

    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(mockRoom());
    prisma.player.update.mockResolvedValue(spectatorPlayer);

    const result = await roomService.unseatPlayer("ROOM01", "tok-1");

    expect(prisma.player.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          seat_number: null,
          role: PlayerRole.SPECTATOR,
        }),
      })
    );
    expect(result.role).toBe(PlayerRole.SPECTATOR);
    expect(result.seat_number).toBeNull();
  });

  it("Negative: ห้องไม่อยู่ใน WAITING → throw BadRequestError 'Game already started'", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(mockRoom({ status: RoomStatus.PLAYING }));

    await expect(
      roomService.unseatPlayer("ROOM01", "tok-1")
    ).rejects.toThrow(BadRequestError);

    await expect(
      roomService.unseatPlayer("ROOM01", "tok-1")
    ).rejects.toThrow("Game already started");
  });

  it("Negative: room ไม่มีในระบบ → throw NotFoundError", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.room.findUnique.mockResolvedValue(null);

    await expect(
      roomService.unseatPlayer("INVALID", "tok-1")
    ).rejects.toThrow(NotFoundError);
  });
});

// ── leaveRoom ──────────────────────────────────────────────────

describe("roomService.leaveRoom()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("Happy: player ออกจากห้อง → ลบ player record", async () => {
    const player = mockPlayer();
    const remainingRoom = { ...mockRoom(), players: [], deck_config: {} };

    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.player.findUnique.mockResolvedValue(player);
    prisma.player.delete.mockResolvedValue(player);
    prisma.player.findMany.mockResolvedValue([]); // ไม่มีคนเหลือ
    prisma.room.delete.mockResolvedValue(mockRoom());

    const result = await roomService.leaveRoom("ROOM01", "host-token");

    expect(prisma.player.delete).toHaveBeenCalled();
    expect(result).toBeNull(); // ห้องถูกลบ
  });

  it("Happy: host ออก → ย้าย host ให้ player คนถัดไป (FR-03-11)", async () => {
    const hostPlayer = mockPlayer({ player_token: "host-token" });
    const nextPlayer = mockPlayer({ player_id: "p2", player_token: "tok-2", seat_number: 2 });
    const updatedRoom = { ...mockRoom({ host_token: "tok-2" }), players: [nextPlayer], deck_config: {} };

    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.player.findUnique.mockResolvedValue(hostPlayer);
    prisma.player.delete.mockResolvedValue(hostPlayer);
    prisma.player.findMany.mockResolvedValue([nextPlayer]); // เหลือ 1 คน
    prisma.room.findUnique.mockResolvedValue(mockRoom({ host_token: "host-token" }));
    prisma.room.update.mockResolvedValue(updatedRoom);
    prisma.room.findUnique.mockResolvedValueOnce(mockRoom()).mockResolvedValueOnce(updatedRoom);

    const result = await roomService.leaveRoom("ROOM01", "host-token");

    expect(prisma.room.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ host_token: "tok-2" }),
      })
    );
  });

  it("Happy: player ไม่มีในห้อง → return null ไม่ throw", async () => {
    prisma.$transaction.mockImplementation(async (cb: Function) => cb(prisma));
    prisma.player.findUnique.mockResolvedValue(null);

    const result = await roomService.leaveRoom("ROOM01", "ghost-token");

    expect(result).toBeNull();
    expect(prisma.player.delete).not.toHaveBeenCalled();
  });
});

// ── updateDeckConfig ───────────────────────────────────────────

describe("roomService.updateDeckConfig()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("Negative: ไม่ใช่ host → throw ForbiddenError 'Only the host can change deck config'", async () => {
    prisma.room.findUnique.mockResolvedValue(
      mockRoom({ deck_config: { card_version: "classic", expansions: [] } })
    );

    await expect(
      roomService.updateDeckConfig("ROOM01", "not-host-token", {
        cardVersion: "good_and_evil",
        expansions: [],
      })
    ).rejects.toThrow(ForbiddenError);

    await expect(
      roomService.updateDeckConfig("ROOM01", "not-host-token", {
        cardVersion: "good_and_evil",
        expansions: [],
      })
    ).rejects.toThrow("Only the host can change deck config");
  });

  it("Negative: game กำลังเล่นอยู่ → throw BadRequestError 'Cannot change config during a game'", async () => {
    prisma.room.findUnique.mockResolvedValue(
      mockRoom({ status: RoomStatus.PLAYING, deck_config: { card_version: "classic", expansions: [] } })
    );

    await expect(
      roomService.updateDeckConfig("ROOM01", "host-token", {
        cardVersion: "good_and_evil",
        expansions: [],
      })
    ).rejects.toThrow(BadRequestError);

    await expect(
      roomService.updateDeckConfig("ROOM01", "host-token", {
        cardVersion: "good_and_evil",
        expansions: [],
      })
    ).rejects.toThrow("Cannot change config during a game");
  });

  it("Negative: roomId ไม่มีในระบบ → throw NotFoundError", async () => {
    prisma.room.findUnique.mockResolvedValue(null);

    await expect(
      roomService.updateDeckConfig("INVALID", "host-token", {
        cardVersion: "classic",
        expansions: [],
      })
    ).rejects.toThrow(NotFoundError);
  });
});

// ── getRoomById ────────────────────────────────────────────────

describe("roomService.getRoomById()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("Happy: roomId ถูกต้อง → return room with players and deck_config", async () => {
    const room = {
      ...mockRoom(),
      players: [mockPlayer()],
      deck_config: { card_version: "classic", expansions: [] },
    };
    prisma.room.findUnique.mockResolvedValue(room);

    const result = await roomService.getRoomById("ROOM01");

    expect(result.room_id).toBe("ROOM01");
    expect(result.players).toHaveLength(1);
  });

  it("Negative: roomId ไม่มีในระบบ → throw NotFoundError 'Room not found'", async () => {
    prisma.room.findUnique.mockResolvedValue(null);

    await expect(roomService.getRoomById("INVALID")).rejects.toThrow(NotFoundError);
    await expect(roomService.getRoomById("INVALID")).rejects.toThrow("Room not found");
  });
});

// ── getCurrentRoom ─────────────────────────────────────────────

describe("roomService.getCurrentRoom()", () => {
  beforeEach(() => jest.clearAllMocks());

  it("Happy: มี player ในห้อง → return { roomId }", async () => {
    prisma.player.findFirst.mockResolvedValue({ room_id: "ROOM01" });

    const result = await roomService.getCurrentRoom("tok-1");

    expect(result).toEqual({ roomId: "ROOM01" });
  });

  it("Happy: ไม่มี player → return null", async () => {
    prisma.player.findFirst.mockResolvedValue(null);

    const result = await roomService.getCurrentRoom("tok-nobody");

    expect(result).toBeNull();
  });

  it("Edge: token ว่าง → return null ทันทีโดยไม่ query DB", async () => {
    const result = await roomService.getCurrentRoom("");

    expect(result).toBeNull();
    expect(prisma.player.findFirst).not.toHaveBeenCalled();
  });
});
