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
}

export interface GameOverResult {
  success: boolean;
  action: "GAME_OVER";
  winner: WinnerInfo;
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
