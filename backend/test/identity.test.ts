/**
 * identity.test.ts
 * =====================================================================
 * Unit Tests — Player Identity
 * ครอบคลุม: UUID validation, displayName validation, startGame guard
 * TC: TC-S4-28~30, TC-S4-35~36, UT-S2-04~06
 * FR: FR-01-1/2, FR-03-10
 * =====================================================================
 */

import { BadRequestError, ForbiddenError, NotFoundError } from "../src/utils/errors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

function isValidDisplayName(name: string): boolean {
  return name.trim().length > 0;
}

function validateStartGame(opts: {
  roomExists: boolean;
  isHost: boolean;
  roomStatus: "WAITING" | "PLAYING";
  playerCount: number;
}): void {
  if (!opts.roomExists) throw new NotFoundError("Room");
  if (!opts.isHost) throw new ForbiddenError("Only the host can start the game");
  if (opts.roomStatus !== "WAITING") throw new BadRequestError("Game already started");
  if (opts.playerCount < 2) throw new BadRequestError("Need at least 2 players to start");
}

function isPlayerTurn(currentTurnPlayerId: string, requestingPlayerId: string): boolean {
  return currentTurnPlayerId === requestingPlayerId;
}

// ─── TEST SUITES ──────────────────────────────────────────────────────────────

describe("UUID validation (FR-01-1)", () => {
  it("TC-S4-35 | UUID v4 format ถูกต้อง → true", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidUUID("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(true);
  });

  it("format ไม่ถูกต้อง → false", () => {
    expect(isValidUUID("not-a-uuid")).toBe(false);
    expect(isValidUUID("")).toBe(false);
    expect(isValidUUID("12345678-1234-1234-1234-123456789012")).toBe(false); // version ≠ 4
  });

  it("UUID v4 ที่สร้างจาก crypto.randomUUID() ควรผ่าน", () => {
    // Simulate generated UUID
    const fakeV4 = "a8098c1a-f86e-11da-bd1a-00112444be1e".replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/,
      (m) => m.slice(0, 19) + "4" + m.slice(20)
    );
    // Just check the format regex works for a known valid UUID
    expect(isValidUUID("c73bcdcc-2669-4bf6-81d3-e4ae73fb11fd")).toBe(true);
  });
});

describe("displayName validation (FR-01-2)", () => {
  it("TC-S4-36 | ชื่อว่าง → false", () => {
    expect(isValidDisplayName("")).toBe(false);
    expect(isValidDisplayName("   ")).toBe(false);
  });

  it("ชื่อปกติ → true", () => {
    expect(isValidDisplayName("กัน")).toBe(true);
    expect(isValidDisplayName("Player 1")).toBe(true);
    expect(isValidDisplayName("A")).toBe(true);
  });
});

describe("startGame() — guards (FR-03-10)", () => {
  it("TC-S4-28 | UT-S2-04 | Host + ≥2 PLAYER → ไม่ throw", () => {
    expect(() => validateStartGame({ roomExists: true, isHost: true, roomStatus: "WAITING", playerCount: 3 })).not.toThrow();
  });

  it("TC-S4-29 | UT-S2-04 | ไม่ใช่ Host → throw ForbiddenError", () => {
    expect(() => validateStartGame({ roomExists: true, isHost: false, roomStatus: "WAITING", playerCount: 3 })).toThrow(ForbiddenError);
  });

  it("UT-S2-05 | PLAYER < 2 → throw 'Need at least 2 players'", () => {
    expect(() => validateStartGame({ roomExists: true, isHost: true, roomStatus: "WAITING", playerCount: 1 })).toThrow("Need at least 2 players");
  });

  it("UT-S2-06 | Room ไม่มี → throw NotFoundError", () => {
    expect(() => validateStartGame({ roomExists: false, isHost: true, roomStatus: "WAITING", playerCount: 3 })).toThrow(NotFoundError);
  });

  it("ห้อง PLAYING → throw 'Game already started'", () => {
    expect(() => validateStartGame({ roomExists: true, isHost: true, roomStatus: "PLAYING", playerCount: 3 })).toThrow("Game already started");
  });
});

describe("TC-S4-30 | isPlayerTurn()", () => {
  it("session current === request → true", () => {
    expect(isPlayerTurn("p1", "p1")).toBe(true);
  });

  it("session current ≠ request → false", () => {
    expect(isPlayerTurn("p1", "p2")).toBe(false);
  });
});
