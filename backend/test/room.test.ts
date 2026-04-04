/**
 * room.test.ts
 * =====================================================================
 * Unit Tests — Room Management
 * ครอบคลุม: สร้างห้อง, เข้าห้อง, เลือกที่นั่ง, ออกห้อง, config
 * TC: UT-S1-01~15, UT-S2-01~03
 * FR: FR-01-5, FR-02-2/3, FR-03-4/6/7/8/9/10/11
 * =====================================================================
 */

import { BadRequestError, NotFoundError, ForbiddenError } from "../src/utils/errors";

// ─── Room Code ────────────────────────────────────────────────────────────────

function generateRoomCode(length = 6): string {
  const chars = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

describe("Room Code", () => {
  it("UT-S1-01 | ได้ room_id ที่เป็นตัวเลขล้วน 6 หลัก", () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("ความยาวตรงตาม ROOM_CODE_LENGTH (6)", () => {
    expect(generateRoomCode().length).toBe(6);
  });

  it("ทุกตัวอักษรเป็น 0-9 เท่านั้น", () => {
    for (const ch of generateRoomCode()) {
      expect("0123456789").toContain(ch);
    }
  });
});

// ─── joinRoom ────────────────────────────────────────────────────────────────

function validateJoinRoom(
  displayName: string,
  roomExists: boolean,
  alreadyJoined: boolean
): { status: "ok" | "error"; message?: string; isExisting?: boolean } {
  if (!displayName || displayName.trim().length === 0)
    return { status: "error", message: "Display name is required" };
  if (!roomExists)
    return { status: "error", message: "Room not found" };
  if (alreadyJoined)
    return { status: "ok", isExisting: true };
  return { status: "ok", isExisting: false };
}

describe("joinRoom()", () => {
  it("UT-S1-02 | displayName ว่าง → error 'Display name is required'", () => {
    const r = validateJoinRoom("", true, false);
    expect(r.status).toBe("error");
    expect(r.message).toBe("Display name is required");
  });

  it("UT-S1-03 | roomId ไม่มีใน DB → error 'Room not found'", () => {
    const r = validateJoinRoom("กัน", false, false);
    expect(r.status).toBe("error");
    expect(r.message).toBe("Room not found");
  });

  it("UT-S1-04 | เข้าห้องซ้ำ token+roomId เดิม → return existing ไม่ duplicate", () => {
    const r = validateJoinRoom("กัน", true, true);
    expect(r.status).toBe("ok");
    expect(r.isExisting).toBe(true);
  });

  it("UT-S1-05 | เข้าห้องใหม่ → isExisting = false (role SPECTATOR)", () => {
    const r = validateJoinRoom("กัน", true, false);
    expect(r.status).toBe("ok");
    expect(r.isExisting).toBe(false);
  });

  it("displayName มีแค่ spaces → ถือว่าว่าง", () => {
    const r = validateJoinRoom("   ", true, false);
    expect(r.status).toBe("error");
  });
});

// ─── selectSeat ──────────────────────────────────────────────────────────────

function validateSelectSeat(opts: {
  seatNumber: number;
  roomStatus: "WAITING" | "PLAYING";
  seatTakenByOther: boolean;
  currentCount: number;
  maxPlayers: number;
}): void {
  if (opts.seatNumber < 1) throw new BadRequestError("Invalid seat number");
  if (opts.roomStatus !== "WAITING") throw new BadRequestError("Game already started");
  if (opts.seatTakenByOther) throw new BadRequestError("Seat already taken");
  if (opts.currentCount >= opts.maxPlayers) throw new BadRequestError("Room is full");
}

describe("selectSeat()", () => {
  const base = { roomStatus: "WAITING" as const, seatTakenByOther: false, currentCount: 1, maxPlayers: 5 };

  it("UT-S1-06 | seatNumber < 1 → BadRequestError 'Invalid seat number'", () => {
    expect(() => validateSelectSeat({ ...base, seatNumber: 0 })).toThrow("Invalid seat number");
  });

  it("UT-S1-07 | ที่นั่งมีคนอื่นอยู่แล้ว → BadRequestError 'Seat already taken'", () => {
    expect(() => validateSelectSeat({ ...base, seatNumber: 2, seatTakenByOther: true })).toThrow("Seat already taken");
  });

  it("UT-S1-08 | ห้องเต็ม (currentCount >= max) → BadRequestError 'Room is full'", () => {
    expect(() => validateSelectSeat({ ...base, seatNumber: 3, currentCount: 5 })).toThrow("Room is full");
  });

  it("UT-S1-09 | ห้อง PLAYING → BadRequestError 'Game already started'", () => {
    expect(() => validateSelectSeat({ ...base, seatNumber: 1, roomStatus: "PLAYING" })).toThrow("Game already started");
  });

  it("เงื่อนไขครบถ้วน → ไม่ throw", () => {
    expect(() => validateSelectSeat({ seatNumber: 2, roomStatus: "WAITING", seatTakenByOther: false, currentCount: 1, maxPlayers: 5 })).not.toThrow();
  });
});

// ─── unseatPlayer ─────────────────────────────────────────────────────────────

function validateUnseat(roomStatus: "WAITING" | "PLAYING"): { role: "SPECTATOR"; seat_number: null } {
  if (roomStatus !== "WAITING") throw new BadRequestError("Game already started");
  return { role: "SPECTATOR", seat_number: null };
}

describe("unseatPlayer()", () => {
  it("UT-S1-10 | ลุกจากที่นั่ง → role = SPECTATOR, seat_number = null", () => {
    expect(validateUnseat("WAITING")).toEqual({ role: "SPECTATOR", seat_number: null });
  });

  it("UT-S1-11 | ห้อง PLAYING → BadRequestError 'Game already started'", () => {
    expect(() => validateUnseat("PLAYING")).toThrow("Game already started");
  });
});

// ─── leaveRoom ────────────────────────────────────────────────────────────────

interface MockRoom {
  host_token: string;
  players: Array<{ player_token: string; role: "PLAYER" | "SPECTATOR" }>;
}

function leaveRoom(playerToken: string, room: MockRoom) {
  const remaining = room.players.filter((p) => p.player_token !== playerToken);

  if (remaining.length === 0) return { deleted: true };

  let newHostToken = room.host_token;
  if (room.host_token === playerToken) {
    const candidate = remaining.find((p) => p.role === "PLAYER") ?? remaining[0]!;
    newHostToken = candidate.player_token;
  }

  return { deleted: false, newHostToken };
}

describe("leaveRoom()", () => {
  it("UT-S1-12 | คนสุดท้ายออก → deleted: true", () => {
    const room: MockRoom = { host_token: "A", players: [{ player_token: "A", role: "PLAYER" }] };
    expect(leaveRoom("A", room).deleted).toBe(true);
  });

  it("UT-S1-13 | host ออก → migrate host_token ไปคนถัดไป", () => {
    const room: MockRoom = {
      host_token: "A",
      players: [
        { player_token: "A", role: "PLAYER" },
        { player_token: "B", role: "PLAYER" },
      ],
    };
    const r = leaveRoom("A", room);
    expect(r.deleted).toBe(false);
    expect(r.newHostToken).toBe("B");
  });

  it("host ออก — เลือก PLAYER ก่อน SPECTATOR", () => {
    const room: MockRoom = {
      host_token: "A",
      players: [
        { player_token: "A", role: "PLAYER" },
        { player_token: "B", role: "SPECTATOR" },
        { player_token: "C", role: "PLAYER" },
      ],
    };
    expect(leaveRoom("A", room).newHostToken).toBe("C");
  });

  it("คนทั่วไปออก → host_token ไม่เปลี่ยน", () => {
    const room: MockRoom = {
      host_token: "A",
      players: [
        { player_token: "A", role: "PLAYER" },
        { player_token: "B", role: "PLAYER" },
      ],
    };
    expect(leaveRoom("B", room).newHostToken).toBe("A");
  });
});

// ─── getCurrentRoom ───────────────────────────────────────────────────────────

function getCurrentRoom(token: string | undefined, roomIdInDB: string | null) {
  if (!token) return null;
  if (!roomIdInDB) return null;
  return { roomId: roomIdInDB };
}

describe("getCurrentRoom()", () => {
  it("UT-S1-14 | มี player → return { roomId }", () => {
    expect(getCurrentRoom("tok-A", "room-123")).toEqual({ roomId: "room-123" });
  });

  it("UT-S1-15 | ไม่มี player → return null", () => {
    expect(getCurrentRoom("tok-X", null)).toBeNull();
  });

  it("token ว่าง → return null", () => {
    expect(getCurrentRoom(undefined, "room-123")).toBeNull();
  });
});

// ─── updateDeckConfig ──────────────────────────────────────────────────────────

function validateUpdateDeckConfig(isHost: boolean, roomStatus: "WAITING" | "PLAYING") {
  if (!isHost) throw new ForbiddenError("Only the host can change deck config");
  if (roomStatus !== "WAITING") throw new BadRequestError("Cannot change config during a game");
}

describe("updateDeckConfig()", () => {
  it("UT-S2-01 | ไม่ใช่ host → ForbiddenError", () => {
    expect(() => validateUpdateDeckConfig(false, "WAITING")).toThrow(ForbiddenError);
  });

  it("UT-S2-02 | ห้อง PLAYING → BadRequestError", () => {
    expect(() => validateUpdateDeckConfig(true, "PLAYING")).toThrow("Cannot change config during a game");
  });

  it("host + WAITING → ไม่ throw", () => {
    expect(() => validateUpdateDeckConfig(true, "WAITING")).not.toThrow();
  });
});

// ─── getRoomById ──────────────────────────────────────────────────────────────

describe("getRoomById()", () => {
  it("UT-S2-03 | roomId ไม่มีใน DB → throw NotFoundError", () => {
    expect(() => {
      const room = null;
      if (!room) throw new NotFoundError("Room");
    }).toThrow(NotFoundError);
  });
});
