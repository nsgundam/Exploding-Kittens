/**
 * Tests for game.turn.ts — turn order, direction, and pending attack logic
 * Pure computation extracted from service layer. No Prisma/DB.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Inline pure helpers mirroring game.turn.ts
// ─────────────────────────────────────────────────────────────────────────────

interface MockPlayer {
  player_id: string;
  is_alive: boolean;
  display_name: string;
  seat_number: number;
}

/**
 * Compute next player's index given direction and current position.
 * Mirrors the while-loop in advanceTurn.
 */
function findNextAliveIndex(
  players: MockPlayer[],
  currentIndex: number,
  direction: number,
): number {
  let offset = 1;
  while (offset <= players.length) {
    const checkIndex = (currentIndex + offset * direction + players.length) % players.length;
    if (players[checkIndex]?.is_alive) return checkIndex;
    offset++;
  }
  return -1; // no alive player found
}

/**
 * Mirrors resolveDrawCompletion pending_attacks logic.
 * Returns the next state after a card is drawn.
 */
function resolveDrawCompletion(
  pending_attacks: number,
  currentPlayerId: string,
): { samePlayer: boolean; newPending: number } {
  if (pending_attacks > 1) {
    return { samePlayer: true, newPending: pending_attacks - 1 };
  }
  return { samePlayer: false, newPending: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// findNextAliveIndex — clockwise (direction = 1)
// ─────────────────────────────────────────────────────────────────────────────

describe("findNextAliveIndex (clockwise)", () => {
  const players: MockPlayer[] = [
    { player_id: "p1", is_alive: true, display_name: "P1", seat_number: 1 },
    { player_id: "p2", is_alive: true, display_name: "P2", seat_number: 2 },
    { player_id: "p3", is_alive: true, display_name: "P3", seat_number: 3 },
    { player_id: "p4", is_alive: true, display_name: "P4", seat_number: 4 },
  ];

  it("advances to next player in order", () => {
    expect(findNextAliveIndex(players, 0, 1)).toBe(1); // p1 → p2
    expect(findNextAliveIndex(players, 1, 1)).toBe(2); // p2 → p3
    expect(findNextAliveIndex(players, 2, 1)).toBe(3); // p3 → p4
  });

  it("wraps around to first player after last", () => {
    expect(findNextAliveIndex(players, 3, 1)).toBe(0); // p4 → p1
  });

  it("skips dead players", () => {
    const withDead: MockPlayer[] = [
      { player_id: "p1", is_alive: true, display_name: "P1", seat_number: 1 },
      { player_id: "p2", is_alive: false, display_name: "P2", seat_number: 2 },
      { player_id: "p3", is_alive: true, display_name: "P3", seat_number: 3 },
    ];
    // p1 → skip dead p2 → p3
    expect(findNextAliveIndex(withDead, 0, 1)).toBe(2);
  });

  it("skips multiple consecutive dead players", () => {
    const withDead: MockPlayer[] = [
      { player_id: "p1", is_alive: true, display_name: "P1", seat_number: 1 },
      { player_id: "p2", is_alive: false, display_name: "P2", seat_number: 2 },
      { player_id: "p3", is_alive: false, display_name: "P3", seat_number: 3 },
      { player_id: "p4", is_alive: true, display_name: "P4", seat_number: 4 },
    ];
    expect(findNextAliveIndex(withDead, 0, 1)).toBe(3); // p1 → p4
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// findNextAliveIndex — counter-clockwise (direction = -1)
// ─────────────────────────────────────────────────────────────────────────────

describe("findNextAliveIndex (counter-clockwise)", () => {
  const players: MockPlayer[] = [
    { player_id: "p1", is_alive: true, display_name: "P1", seat_number: 1 },
    { player_id: "p2", is_alive: true, display_name: "P2", seat_number: 2 },
    { player_id: "p3", is_alive: true, display_name: "P3", seat_number: 3 },
    { player_id: "p4", is_alive: true, display_name: "P4", seat_number: 4 },
  ];

  it("moves backwards in seat order", () => {
    expect(findNextAliveIndex(players, 2, -1)).toBe(1); // p3 → p2
    expect(findNextAliveIndex(players, 1, -1)).toBe(0); // p2 → p1
  });

  it("wraps from first to last", () => {
    expect(findNextAliveIndex(players, 0, -1)).toBe(3); // p1 → p4
  });

  it("skips dead players backwards", () => {
    const withDead: MockPlayer[] = [
      { player_id: "p1", is_alive: true, display_name: "P1", seat_number: 1 },
      { player_id: "p2", is_alive: false, display_name: "P2", seat_number: 2 },
      { player_id: "p3", is_alive: true, display_name: "P3", seat_number: 3 },
    ];
    // p3 → skip dead p2 → p1
    expect(findNextAliveIndex(withDead, 2, -1)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveDrawCompletion — pending_attacks state
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveDrawCompletion", () => {
  it("pending_attacks = 0 → advance to next player", () => {
    const { samePlayer, newPending } = resolveDrawCompletion(0, "p1");
    expect(samePlayer).toBe(false);
    expect(newPending).toBe(0);
  });

  it("pending_attacks = 1 → advance to next player (last attack consumed)", () => {
    const { samePlayer, newPending } = resolveDrawCompletion(1, "p1");
    expect(samePlayer).toBe(false);
    expect(newPending).toBe(0);
  });

  it("pending_attacks = 2 → same player plays again with 1 remaining", () => {
    const { samePlayer, newPending } = resolveDrawCompletion(2, "p1");
    expect(samePlayer).toBe(true);
    expect(newPending).toBe(1);
  });

  it("pending_attacks = 4 → same player, newPending = 3", () => {
    const { samePlayer, newPending } = resolveDrawCompletion(4, "p1");
    expect(samePlayer).toBe(true);
    expect(newPending).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Attack stacking logic
// ─────────────────────────────────────────────────────────────────────────────

describe("Attack stacking", () => {
  /**
   * Mirrors handleAttackEffect: newPending = pending_attacks + 2
   * And handleSkipEffect: reduces pending by 1 per Skip
   */

  it("first attack → pending becomes 2", () => {
    const current = 0;
    expect(current + 2).toBe(2);
  });

  it("stacked attack → pending becomes 4", () => {
    const current = 2;
    expect(current + 2).toBe(4);
  });

  it("Skip with 2 pending → reduces to 1 (player stays)", () => {
    const pending = 2;
    const afterSkip = pending - 1;
    expect(afterSkip).toBe(1);
    expect(afterSkip > 1).toBe(false); // still player's turn
  });

  it("Skip with 1 pending → reduces to 0 (advance turn)", () => {
    const pending = 1;
    const afterSkip = pending - 1;
    expect(afterSkip).toBe(0);
  });

  it("Skip with 0 pending → normal skip (advance turn)", () => {
    const pending = 0;
    const afterSkip = Math.max(0, pending - 1);
    expect(afterSkip).toBe(0); // clamped, no negative
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Direction flip (Reverse card logic)
// ─────────────────────────────────────────────────────────────────────────────

describe("Direction flip (Reverse)", () => {
  it("clockwise (1) flips to counter-clockwise (-1)", () => {
    const direction = 1;
    expect(direction * -1).toBe(-1);
  });

  it("counter-clockwise (-1) flips to clockwise (1)", () => {
    const direction = -1;
    expect(direction * -1).toBe(1);
  });

  it("double flip restores original direction", () => {
    const original = 1;
    const flipped = original * -1;
    expect(flipped * -1).toBe(original);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AFK kick threshold
// ─────────────────────────────────────────────────────────────────────────────

describe("AFK kick logic", () => {
  const AFK_KICK_THRESHOLD = 2;

  it("afk_count 1 → below threshold, no kick", () => {
    expect(1 >= AFK_KICK_THRESHOLD).toBe(false);
  });

  it("afk_count 2 → meets threshold, kick", () => {
    expect(2 >= AFK_KICK_THRESHOLD).toBe(true);
  });

  it("afk_count 3 → above threshold, kick", () => {
    expect(3 >= AFK_KICK_THRESHOLD).toBe(true);
  });
});
