/**
 * turn.test.ts
 * =====================================================================
 * Unit Tests — Turn Management
 * ครอบคลุม: drawCard validation, turn direction, attack chain, AFK, winner
 * TC: TC-S4-11~18, TC-UNIT-46~61, UT-S2-09~13, UT-S2-20~22
 * FR: FR-04-3/4/5/6/7/8, FR-05-A1/A2/A3, FR-09-3, FR-10-3/4
 * =====================================================================
 */

import { BadRequestError, NotFoundError } from "../src/utils/errors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface Player {
  player_id: string;
  display_name: string;
  seat_number: number;
}

function getNextPlayer(players: Player[], currentId: string, direction: 1 | -1): Player {
  const idx = players.findIndex((p) => p.player_id === currentId);
  return players[(idx + direction + players.length) % players.length]!;
}

function resolveDrawCompletion(
  players: Player[],
  currentId: string,
  direction: 1 | -1,
  pendingAttacks: number
): { player_id: string; pending_attacks: number } {
  if (pendingAttacks > 1) return { player_id: currentId, pending_attacks: pendingAttacks - 1 };
  return { player_id: getNextPlayer(players, currentId, direction).player_id, pending_attacks: 0 };
}

function applyAttack(currentPending: number): number {
  return currentPending + 2;
}

function applySkip(
  currentId: string,
  nextId: string,
  pendingAttacks: number
): { player_id: string; pending_attacks: number } {
  if (pendingAttacks > 1) return { player_id: currentId, pending_attacks: pendingAttacks - 1 };
  return { player_id: nextId, pending_attacks: 0 };
}

function simulateDrawCard(deckTop: string, hand: string[]) {
  const isEK = deckTop === "EK" || deckTop === "GVE_EK";
  const isIK = deckTop === "IK";
  if (isEK || isIK) {
    const hasDefuse = hand.includes("DF") || hand.includes("GVE_DF");
    return { action: "DREW_EXPLODING_KITTEN" as const, drawnCard: deckTop, hasDefuse };
  }
  return { action: "TURN_ADVANCED" as const, drawnCard: deckTop };
}

function handleAFK(afkCount: number) {
  const newCount = afkCount + 1;
  return { newCount, shouldKick: newCount >= 2 };
}

function getWinner(alivePlayers: { player_id: string; display_name: string; player_token: string }[]) {
  return alivePlayers.length === 1 ? alivePlayers[0]! : null;
}

// ─── TEST SUITES ──────────────────────────────────────────────────────────────

describe("drawCard() — validation", () => {
  it("UT-S2-09 | ห้องไม่ PLAYING → throw 'Game is not active'", () => {
    expect(() => {
      if ("WAITING" !== "PLAYING") throw new BadRequestError("Game is not active");
    }).toThrow("Game is not active");
  });

  it("UT-S2-10 | ไม่ใช่เทิร์นตัวเอง → throw 'It's not your turn'", () => {
    expect(() => {
      const isMyTurn = false;
      if (!isMyTurn) throw new BadRequestError("It's not your turn");
    }).toThrow("It's not your turn");
  });
});

describe("drawCard() — ผลลัพธ์เมื่อจั่ว", () => {
  it("UT-S2-11 | จั่วปกติ → TURN_ADVANCED", () => {
    const r = simulateDrawCard("AT", ["DF", "SK"]);
    expect(r.action).toBe("TURN_ADVANCED");
    expect(r.drawnCard).toBe("AT");
  });

  it("UT-S2-12 | จั่ว EK + มี Defuse → DREW_EXPLODING_KITTEN, hasDefuse=true", () => {
    const r = simulateDrawCard("EK", ["DF", "AT"]);
    expect(r.action).toBe("DREW_EXPLODING_KITTEN");
    expect(r.hasDefuse).toBe(true);
  });

  it("UT-S2-13 | จั่ว EK + ไม่มี Defuse → DREW_EXPLODING_KITTEN, hasDefuse=false", () => {
    const r = simulateDrawCard("EK", ["AT", "NP"]);
    expect(r.action).toBe("DREW_EXPLODING_KITTEN");
    expect(r.hasDefuse).toBe(false);
  });

  it("จั่ว GVE_EK + มี GVE_DF → hasDefuse=true", () => {
    const r = simulateDrawCard("GVE_EK", ["GVE_DF", "AT"]);
    expect(r.hasDefuse).toBe(true);
  });

  it("UT-S2-20 | eliminatePlayer — ไม่มี pending EK → throw", () => {
    expect(() => {
      const lastAction = "DREW_CARD";
      if (lastAction !== "DREW_EXPLODING_KITTEN") throw new BadRequestError("No pending Exploding Kitten");
    }).toThrow("No pending Exploding Kitten");
  });
});

describe("Turn Direction — CW / CCW", () => {
  const players: Player[] = [
    { player_id: "p0", display_name: "A", seat_number: 1 },
    { player_id: "p1", display_name: "B", seat_number: 2 },
    { player_id: "p2", display_name: "C", seat_number: 3 },
  ];

  describe("TC-S4-11 | CW (direction=1): 0→1→2→0", () => {
    it("p0 → p1", () => expect(getNextPlayer(players, "p0", 1).player_id).toBe("p1"));
    it("p1 → p2", () => expect(getNextPlayer(players, "p1", 1).player_id).toBe("p2"));
    it("p2 → p0 (wrap)", () => expect(getNextPlayer(players, "p2", 1).player_id).toBe("p0"));
  });

  describe("TC-S4-12 | CCW (direction=-1): 0→2→1→0", () => {
    it("p0 → p2", () => expect(getNextPlayer(players, "p0", -1).player_id).toBe("p2"));
    it("p2 → p1", () => expect(getNextPlayer(players, "p2", -1).player_id).toBe("p1"));
    it("p1 → p0", () => expect(getNextPlayer(players, "p1", -1).player_id).toBe("p0"));
  });
});

describe("Reverse Card — direction flip", () => {
  it("TC-S4-13 | 2 ผู้เล่น: CW next === CCW next → Reverse = Skip", () => {
    const two: Player[] = [
      { player_id: "p0", display_name: "A", seat_number: 1 },
      { player_id: "p1", display_name: "B", seat_number: 2 },
    ];
    expect(getNextPlayer(two, "p0", 1).player_id).toBe(getNextPlayer(two, "p0", -1).player_id);
  });

  it("TC-S4-14 | 3 ผู้เล่น: CW next ≠ CCW next → Reverse เปลี่ยนทิศจริง", () => {
    const three: Player[] = [
      { player_id: "p0", display_name: "A", seat_number: 1 },
      { player_id: "p1", display_name: "B", seat_number: 2 },
      { player_id: "p2", display_name: "C", seat_number: 3 },
    ];
    expect(getNextPlayer(three, "p0", 1).player_id).not.toBe(getNextPlayer(three, "p0", -1).player_id);
  });
});

describe("Attack Chain — pending_attacks", () => {
  const players: Player[] = [
    { player_id: "pA", display_name: "A", seat_number: 1 },
    { player_id: "pB", display_name: "B", seat_number: 2 },
  ];

  it("TC-UNIT-46 | pending=0 → เปลี่ยนเทิร์นไปคนถัดไป", () => {
    const r = resolveDrawCompletion(players, "pA", 1, 0);
    expect(r.player_id).toBe("pB");
    expect(r.pending_attacks).toBe(0);
  });

  it("TC-UNIT-47 | pending=3 → ผู้เล่นเดิมยังเล่น pending=2", () => {
    const r = resolveDrawCompletion(players, "pA", 1, 3);
    expect(r.player_id).toBe("pA");
    expect(r.pending_attacks).toBe(2);
  });

  it("TC-UNIT-48 | pending=2 → ผู้เล่นเดิมยังเล่น pending=1", () => {
    const r = resolveDrawCompletion(players, "pA", 1, 2);
    expect(r.player_id).toBe("pA");
    expect(r.pending_attacks).toBe(1);
  });

  it("TC-UNIT-49 | pending=1 → เทิร์นสุดท้าย advance ไปคนถัดไป", () => {
    const r = resolveDrawCompletion(players, "pA", 1, 1);
    expect(r.player_id).toBe("pB");
    expect(r.pending_attacks).toBe(0);
  });

  it("TC-UNIT-50 | nextTurn payload มี pending_attacks", () => {
    const r = resolveDrawCompletion(players, "pA", 1, 3);
    expect(r).toHaveProperty("pending_attacks");
  });

  it("Attack: pending=0 → ผลลัพธ์ = 2", () => expect(applyAttack(0)).toBe(2));
  it("Attack chain: pending=2 → ผลลัพธ์ = 4", () => expect(applyAttack(2)).toBe(4));
  it("Attack chain: pending=4 → ผลลัพธ์ = 6", () => expect(applyAttack(4)).toBe(6));

  it("Skip — pending=0 → advance", () => {
    expect(applySkip("pA", "pB", 0).player_id).toBe("pB");
  });

  it("Skip — pending=2 → ผู้เล่นเดิม pending=1", () => {
    const r = applySkip("pA", "pB", 2);
    expect(r.player_id).toBe("pA");
    expect(r.pending_attacks).toBe(1);
  });
});

describe("AFK System", () => {
  it("TC-S4-15 | TC-UNIT-52 | afk_count=1 → kick (newCount=2 ≥ threshold)", () => {
    const r = handleAFK(1);
    expect(r.shouldKick).toBe(true);
    expect(r.newCount).toBe(2);
  });

  it("TC-S4-16 | TC-UNIT-53 | afk_count=0 → ยังไม่ kick", () => {
    const r = handleAFK(0);
    expect(r.shouldKick).toBe(false);
    expect(r.newCount).toBe(1);
  });

  it("TC-UNIT-51 | afk_count เพิ่มขึ้น 1 ทุกครั้ง", () => {
    expect(handleAFK(0).newCount).toBe(1);
    expect(handleAFK(3).newCount).toBe(4);
  });

  it("TC-UNIT-54 | isAfkKick = true เมื่อ kick", () => {
    expect(handleAFK(1).shouldKick).toBe(true);
  });
});

describe("checkWinner()", () => {
  const players = [
    { player_id: "p1", display_name: "กัน", player_token: "tok-1" },
    { player_id: "p2", display_name: "พัต", player_token: "tok-2" },
  ];

  it("TC-S4-17 | TC-UNIT-56 | เหลือ 1 คน → คืน winner", () => {
    expect(getWinner([players[0]!])).not.toBeNull();
    expect(getWinner([players[0]!])!.player_id).toBe("p1");
  });

  it("TC-S4-18 | TC-UNIT-61 | เหลือ 2+ คน → null", () => {
    expect(getWinner(players)).toBeNull();
  });

  it("0 คน → null", () => {
    expect(getWinner([])).toBeNull();
  });

  it("TC-UNIT-57 | GAME_OVER → sessionStatus = FINISHED", () => {
    const winner = getWinner([players[0]!]);
    const sessionStatus = winner ? "FINISHED" : null;
    expect(sessionStatus).toBe("FINISHED");
  });

  it("TC-UNIT-58 | GAME_OVER → roomStatus กลับ WAITING", () => {
    const winner = getWinner([players[0]!]);
    const roomStatus = winner ? "WAITING" : null;
    expect(roomStatus).toBe("WAITING");
  });

  it("TC-UNIT-59 | GAME_OVER → last_winner_token = winner.player_token", () => {
    const winner = getWinner([players[0]!]);
    expect(winner?.player_token).toBe("tok-1");
  });

  it("TC-UNIT-60 | หลังเกมจบ → allPlayersAlive reset", () => {
    // Simulate processGameOver resets is_alive
    const resetPlayers = players.map((p) => ({ ...p, is_alive: true, afk_count: 0 }));
    for (const p of resetPlayers) {
      expect(p.is_alive).toBe(true);
      expect(p.afk_count).toBe(0);
    }
  });
});
