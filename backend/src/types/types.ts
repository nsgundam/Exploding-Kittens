// ============================================================
// Shared TypeScript Types — Exploding Kittens Backend
// ============================================================

import {
  Room,
  Player,
  DeckConfig,
  GameSession,
  DeckState,
  CardHand,
  GameLog,
  RoomStatus,
  PlayerRole,
  GameSessionStatus,
} from "@prisma/client";

// ── API Request Types ──────────────────────────────────────────

export interface CreateRoomInput {
  playerToken: string;
  roomName: string;
  hostName: string;
  maxPlayers: number;
  cardVersion: string;
  expansions: string[];
}

export interface UpdateDeckConfigInput {
  cardVersion: string;
  expansions: string[];
}

export interface PlayCardInput {
  cardCode: string;
  targetPlayerToken?: string;
}

// ── API Response Types ─────────────────────────────────────────

export interface RoomWithRelations extends Room {
  players: Player[];
  deck_config: DeckConfig | null;
  host_identity?: { display_name: string };
}

export interface ApiErrorResponse {
  message: string;
  statusCode?: number;
}

export interface CurrentRoomResponse {
  roomId: string;
}

// ── Game Service Return Types ──────────────────────────────────

export interface StartGameResult {
  room: RoomWithRelations;
  session: GameSession;
  deckState: DeckState | null;
  cardHands: CardHand[];
}

export interface DrawCardResult {
  success: boolean;
  action: string;
  drawnCard?: string;
  hasDefuse?: boolean;
  nextTurn?: TurnInfo;
  winner?: WinnerInfo;
}

export interface PlayCardResult {
  success: boolean;
  action: string;
  cardCode: string;
  playedBy: string;
  playedByDisplayName: string;
  target?: string | null;
  effect?: CardEffectResult;
  nextTurn?: TurnInfo;
}

export interface CardEffectResult {
  type: string;
  topCards?: string[]; // See the Future
  shuffled?: boolean; // Shuffle
  extraTurns?: number; // Attack
}

export interface TurnInfo {
  player_id: string;
  display_name: string;
  turn_number: number;
  pending_attacks?: number;
}

export interface WinnerInfo {
  player_id: string;
  display_name: string;
}

export interface TurnAdvancedResult {
  success: boolean;
  action: "TURN_ADVANCED";
  nextTurn: TurnInfo;
  drawnCard?: string;
  hand?: { cards: string[] };
  player_id?: string;
  drawnByDisplayName?: string;
  deck_count?: number;
  isAfkKick?: boolean;
  afkPlayerId?: string;
}

export interface GameOverResult {
  success: boolean;
  action: "GAME_OVER";
  winner: WinnerInfo;
  isAfkKick?: boolean;
  afkPlayerId?: string;
}

export interface ExplodingKittenDrawnResult {
  success: boolean;
  action: "DREW_EXPLODING_KITTEN";
  drawnCard: string;
  hasDefuse: boolean;
  deck_count?: number;
}

export type DefuseResult = TurnAdvancedResult | GameOverResult;

// ── Socket Event Payload Types ─────────────────────────────────

export interface JoinRoomPayload {
  roomId: string;
  playerToken: string;
  displayName: string;
}

export interface SelectSeatPayload {
  roomId: string;
  playerToken: string;
  seatNumber: number;
}

export interface UnseatPlayerPayload {
  roomId: string;
  playerToken: string;
}

export interface StartGamePayload {
  roomId: string;
  playerToken: string;
}

export interface DrawCardPayload {
  roomId: string;
  playerToken: string;
  isAutoDraw?: boolean;
}

export interface PlayCardPayload {
  roomId: string;
  playerToken: string;
  cardCode: string;
  targetPlayerToken?: string;
}

export interface DefuseCardPayload {
  roomId: string;
  playerToken: string;
}

export interface InsertEKPayload {
  roomId: string;
  playerToken: string;
  position: number;
}

export interface DefuseWaitResult {
  success: true;
  action: "WAITING_FOR_INSERT";
}

export interface EliminatePlayerPayload {
  roomId: string;
  playerToken: string;
}

export interface UpdateDeckConfigPayload {
  roomId: string;
  playerToken: string;
  cardVersion: string;
  expansions: string[];
}

// ── Socket Emit Types (Server → Client) ────────────────────────

export interface GameStartedEmit {
  room: RoomWithRelations;
  session_id: string;
  first_turn_player_id: string | null;
  cardHands: SanitizedCardHand[];
  deck_count?: number;
}

export interface SanitizedCardHand {
  hand_id: string;
  player_id: string;
  session_id: string;
  cards: string[] | []; // Empty for other players (anti-cheat)
  card_count: number;
  updated_at: Date;
}

// ── Utility Types ──────────────────────────────────────────────

export type RoomWithDeckConfig = Room & { deck_config: DeckConfig | null };

/** Player hands map: player_id → card codes */
export type PlayerHandsMap = Record<string, string[]>;

/// Player display names map: player_id → display name
export interface FavorPendingResult {
  success: true;
  action: "FAVOR_PENDING";
  requesterId: string;
  requesterDisplayName: string;
  targetId: string;
  targetDisplayName: string;
  targetCardCount: number;
}
// ── Favor Card Types ───────────────────────────────────────────
export interface FavorResponseResult extends TurnAdvancedResult {
  transferredCard: string;
  wasRandom: boolean;
}

export interface FavorCardPayload {
  roomId: string;
  playerToken: string;
  targetPlayerToken: string;
}

export interface FavorResponsePayload {
  roomId: string;
  targetPlayerToken: string;
  cardCode?: string; // undefined = timeout สุ่มให้
}
export interface NopePendingResult {
  success: true;
  action: "NOPE_PLAYED";
  nopeCount: number;
  isCancel: boolean;
  playedBy: string;
  playedByDisplayName: string;
}

// ── Cat Combo Types ────────────────────────────────────────────

/**
 * Payload ส่งมาจาก client เมื่อเล่น Cat Combo
 * comboCards  — array ของ card code ที่เล่น (2 หรือ 3 ใบ, ชนิดเดียวกันหรือมี FC)
 * targetPlayerToken — player_token ของเหยื่อ
 * demandedCard — (3-card combo เท่านั้น) card code ที่ต้องการขโมย
 */
export interface PlayComboPayload {
  roomId: string;
  playerToken: string;
  comboCards: string[];           // e.g. ["CAT_TACO","CAT_TACO"] or ["CAT_TACO","CAT_TACO","CAT_TACO"]
  targetPlayerToken: string;
  demandedCard?: string;          // 3-card only
}

/**
 * Result ของ combo สำเร็จ (advance turn แล้ว)
 * stolenCard  — การ์ดที่ได้รับจริง (undefined ถ้า 3-card demand โมฆะ)
 * wasVoid     — true ถ้า 3-card demand โมฆะ (target ไม่มีการ์ดนั้น)
 */
export interface ComboResult extends TurnAdvancedResult {
  comboType: "TWO_CARD" | "THREE_CARD";
  stolenCard?: string;
  wasVoid: boolean;
  robbedFromDisplayName: string;
  robbedFromPlayerId: string;
}