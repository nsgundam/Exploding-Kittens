// ============================================================
// Shared TypeScript Types — Source of Truth for Frontend
// Matches Prisma schema + Socket.io event payloads
// ============================================================

// ── Player ──────────────────────────────────────────────────
export interface Player {
  player_id: string;
  player_token: string;
  display_name: string;
  seat_number: number | null;
  role: PlayerRole;
  profile_picture?: string | null;
  avatar_url?: string | null;
  hand_count?: number;
  session_id?: string;
  is_alive?: boolean;
  is_active?: boolean;
  afk_count?: number;
}

export type PlayerRole = "SPECTATOR" | "PLAYER" | "ME";

// ── Room ────────────────────────────────────────────────────
export interface RoomData {
  room_id: string;
  room_name: string;
  status: RoomStatus;
  max_players: number;
  host_token: string;
  players: Player[];
  deck_name?: string;
  deck_config?: DeckConfig;
  time_left?: number;
  deck_count?: number;
  current_turn_seat?: number | null;
  current_turn_player_id?: string | null;
}

export type RoomStatus = "WAITING" | "PLAYING";

// ── Deck Config ─────────────────────────────────────────────
export interface DeckConfig {
  config_id?: string;
  room_id?: string;
  card_version: CardVersion;
  expansions: DeckExpansions;
}

export type CardVersion = "classic" | "good_and_evil";

export interface DeckExpansions {
  addons?: string[];
  imploding?: boolean;
}

// ── Card Hand ───────────────────────────────────────────────
export interface CardHand {
  hand_id: string;
  player_id: string;
  session_id: string;
  cards: string[];
  card_count: number;
}

// ── Game Session ────────────────────────────────────────────
export interface GameSession {
  session_id: string;
  room_id: string;
  current_turn_player_id: string | null;
  turn_number: number;
  direction: number;
  pending_attacks: number;
  status: GameSessionStatus;
  winner_player_id: string | null;
}

export type GameSessionStatus = "WAITING" | "IN_PROGRESS" | "FINISHED";

// ── Socket Event Payloads ───────────────────────────────────

export interface GameStartedPayload {
  room: RoomData;
  session_id: string;
  first_turn_player_id: string;
  cardHands: CardHand[];
}

export interface CardDrawnPayload {
  success?: boolean;
  action?: string;
  drawnCard?: string;
  hasDefuse?: boolean;
  hand?: { cards: string[] };
  drawnByDisplayName?: string;
  isExplodingKitten?: boolean;
  eliminated?: boolean;
  player_id?: string;
  nextTurn?: {
    player_id: string;
    display_name: string;
    turn_number: number;
  };
}

export interface CardPlayedPayload {
  success: boolean;
  action: string;
  playedBy: string;
  playedByDisplayName: string;
  cardCode: string;
  target?: string | null;
  message?: string;
  timestamp?: string;
}

export interface DeckConfigChangedPayload {
  room_id: string;
  card_version: CardVersion;
  expansions: DeckExpansions;
}

// ── Lobby API Types ─────────────────────────────────────────
export interface ApiRoom {
  room_id: string;
  room_name: string;
  status: RoomStatus;
  max_players: number;
  players?: Array<{ role: PlayerRole }>;
  deck_config?: DeckConfig;
}

export interface LobbyRoom {
  id: string;
  name: string;
  cardVersion: string;
  addon: boolean;
  players: number;
  maxPlayers: number;
  status: "waiting" | "playing";
}

// ── Room Create Payload ─────────────────────────────────────
export interface RoomCreatePayload {
  name: string;
  cardVersion: string;
  expansions: string[];
}
