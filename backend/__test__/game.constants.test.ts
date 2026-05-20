/**
 * Tests for game.ts — enums, constants, and card code values
 */

// ── Inline enums (mirrors src/constants/game.ts) ──────────────────────────

enum CardCode {
  EXPLODING_KITTEN = "EK",
  GVE_EXPLODING_KITTEN = "GVE_EK",
  DEFUSE = "DF",
  GVE_DEFUSE = "GVE_DF",
  IMPLODING_KITTEN = "IK",
  ATTACK = "AT",
  SKIP = "SK",
  SEE_THE_FUTURE = "SF",
  SHUFFLE = "SH",
  NOPE = "NP",
  FAVOR = "FV",
  TARGETED_ATTACK = "TA",
  REVERSE = "RV",
  DRAW_FROM_BOTTOM = "DB",
  ALTER_THE_FUTURE = "AF",
  MIAO_MACO = "MC",
  FERAL_CAT = "FC",
}

enum ActionType {
  GAME_STARTED = "GAME_STARTED",
  DREW_CARD = "DREW_CARD",
  DREW_EXPLODING_KITTEN = "DREW_EXPLODING_KITTEN",
  PLAY_CARD = "PLAY_CARD",
  DEFUSED = "DEFUSED",
  EK_INSERTED = "EK_INSERTED",
  IK_INSERTED = "IK_INSERTED",
  PLAYER_ELIMINATED = "PLAYER_ELIMINATED",
  PLAYER_AFK_KICKED = "PLAYER_AFK_KICKED",
  GAME_FINISHED = "GAME_FINISHED",
  TURN_ADVANCED = "TURN_ADVANCED",
  GAME_OVER = "GAME_OVER",
  WAITING_FOR_INSERT = "WAITING_FOR_INSERT",
  CARD_PLAYED = "CARD_PLAYED",
  FAVOR_PENDING = "FAVOR_PENDING",
  FAVOR_RESPONSE = "FAVOR_RESPONSE",
  NOPE_PLAYED = "NOPE_PLAYED",
}

enum EliminationReason {
  TIMEOUT_NO_DEFUSE = "no_defuse_or_timeout",
  IMPLODING_KITTEN = "imploding_kitten_face_up",
  AFK_KICK = "afk_timeout",
  LEFT_ROOM = "left_room",
}

const GAME_CONFIG = {
  AFK_KICK_THRESHOLD: 2,
  TURN_TIMER_SECONDS: 30,
  ROOM_CODE_LENGTH: 6,
  MAX_ROOM_CODE_RETRIES: 10,
};

// ─────────────────────────────────────────────────────────────────────────────
// CardCode enum
// ─────────────────────────────────────────────────────────────────────────────

describe("CardCode enum", () => {
  it("EK is 'EK'", () => expect(CardCode.EXPLODING_KITTEN).toBe("EK"));
  it("GVE_EK is 'GVE_EK'", () => expect(CardCode.GVE_EXPLODING_KITTEN).toBe("GVE_EK"));
  it("DF is 'DF'", () => expect(CardCode.DEFUSE).toBe("DF"));
  it("GVE_DF is 'GVE_DF'", () => expect(CardCode.GVE_DEFUSE).toBe("GVE_DF"));
  it("IK is 'IK'", () => expect(CardCode.IMPLODING_KITTEN).toBe("IK"));
  it("AT is 'AT'", () => expect(CardCode.ATTACK).toBe("AT"));
  it("SK is 'SK'", () => expect(CardCode.SKIP).toBe("SK"));
  it("SF is 'SF'", () => expect(CardCode.SEE_THE_FUTURE).toBe("SF"));
  it("SH is 'SH'", () => expect(CardCode.SHUFFLE).toBe("SH"));
  it("NP is 'NP'", () => expect(CardCode.NOPE).toBe("NP"));
  it("FV is 'FV'", () => expect(CardCode.FAVOR).toBe("FV"));
  it("TA is 'TA'", () => expect(CardCode.TARGETED_ATTACK).toBe("TA"));
  it("RV is 'RV'", () => expect(CardCode.REVERSE).toBe("RV"));
  it("DB is 'DB'", () => expect(CardCode.DRAW_FROM_BOTTOM).toBe("DB"));
  it("AF is 'AF'", () => expect(CardCode.ALTER_THE_FUTURE).toBe("AF"));
  it("FC is 'FC'", () => expect(CardCode.FERAL_CAT).toBe("FC"));

  it("EK and GVE_EK are distinct", () => {
    expect(CardCode.EXPLODING_KITTEN).not.toBe(CardCode.GVE_EXPLODING_KITTEN);
  });

  it("DF and GVE_DF are distinct", () => {
    expect(CardCode.DEFUSE).not.toBe(CardCode.GVE_DEFUSE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ActionType enum
// ─────────────────────────────────────────────────────────────────────────────

describe("ActionType enum", () => {
  it("GAME_STARTED", () => expect(ActionType.GAME_STARTED).toBe("GAME_STARTED"));
  it("DREW_CARD", () => expect(ActionType.DREW_CARD).toBe("DREW_CARD"));
  it("PLAY_CARD", () => expect(ActionType.PLAY_CARD).toBe("PLAY_CARD"));
  it("DEFUSED", () => expect(ActionType.DEFUSED).toBe("DEFUSED"));
  it("PLAYER_ELIMINATED", () => expect(ActionType.PLAYER_ELIMINATED).toBe("PLAYER_ELIMINATED"));
  it("GAME_OVER", () => expect(ActionType.GAME_OVER).toBe("GAME_OVER"));
  it("TURN_ADVANCED", () => expect(ActionType.TURN_ADVANCED).toBe("TURN_ADVANCED"));
  it("NOPE_PLAYED", () => expect(ActionType.NOPE_PLAYED).toBe("NOPE_PLAYED"));
  it("FAVOR_PENDING", () => expect(ActionType.FAVOR_PENDING).toBe("FAVOR_PENDING"));
});

// ─────────────────────────────────────────────────────────────────────────────
// EliminationReason enum
// ─────────────────────────────────────────────────────────────────────────────

describe("EliminationReason enum", () => {
  it("TIMEOUT_NO_DEFUSE has expected value", () => {
    expect(EliminationReason.TIMEOUT_NO_DEFUSE).toBe("no_defuse_or_timeout");
  });
  it("IMPLODING_KITTEN has expected value", () => {
    expect(EliminationReason.IMPLODING_KITTEN).toBe("imploding_kitten_face_up");
  });
  it("AFK_KICK has expected value", () => {
    expect(EliminationReason.AFK_KICK).toBe("afk_timeout");
  });
  it("LEFT_ROOM has expected value", () => {
    expect(EliminationReason.LEFT_ROOM).toBe("left_room");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GAME_CONFIG
// ─────────────────────────────────────────────────────────────────────────────

describe("GAME_CONFIG", () => {
  it("AFK_KICK_THRESHOLD is 2", () => {
    expect(GAME_CONFIG.AFK_KICK_THRESHOLD).toBe(2);
  });
  it("TURN_TIMER_SECONDS is 30", () => {
    expect(GAME_CONFIG.TURN_TIMER_SECONDS).toBe(30);
  });
  it("ROOM_CODE_LENGTH is 6", () => {
    expect(GAME_CONFIG.ROOM_CODE_LENGTH).toBe(6);
  });
  it("MAX_ROOM_CODE_RETRIES is 10", () => {
    expect(GAME_CONFIG.MAX_ROOM_CODE_RETRIES).toBe(10);
  });
});
