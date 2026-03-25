// sprint2.test.ts
// Unit Test Script — Exploding Kittens, Sprint 2
// ครอบคลุม: selectSeat, unseatPlayer, leaveRoom, startGame, playCard, drawCard
// วางไฟล์ที่: backend/src/test/sprint2.test.ts
// รัน: npx jest sprint2.test.ts --verbose

import { roomService } from '../src/services/room.service';
import { gameService } from '../src/services/game.service';
import { prisma } from '../src/config/prisma';
import { RoomStatus, PlayerRole } from '@prisma/client';

// ── Mock Prisma ────────────────────────────────────────────────────────────────
jest.mock('../src/config/prisma', () => ({
  prisma: {
    room: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
    player: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    playerIdentity: { upsert: jest.fn() },
    gameSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    deckState: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    cardHand: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    deckConfig: { create: jest.fn(), update: jest.fn() },
    cardMaster: { findMany: jest.fn() },
    gameLog: { create: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn((cb: any) => cb(prisma)),
  },
}));

// ── Mock Helpers ───────────────────────────────────────────────────────────────
const mockRoom = (overrides: any = {}) => ({
  room_id: 'ROOM01',
  room_name: 'Test Room',
  status: RoomStatus.WAITING,
  host_token: 'host-token',
  max_players: 4,
  deck_config: { card_version: 'classic', expansions: [] },
  players: [],
  ...overrides,
});

const mockPlayer = (overrides: any = {}) => ({
  player_id: 'player-1',
  player_token: 'token-1',
  display_name: 'Alice',
  room_id: 'ROOM01',
  seat_number: null,
  role: PlayerRole.SPECTATOR,
  is_alive: true,
  afk_count: 0,
  joined_at: new Date(),
  ...overrides,
});

const mockSession = (overrides: any = {}) => ({
  session_id: 'sess-1',
  room_id: 'ROOM01',
  status: 'IN_PROGRESS',
  current_turn_player_id: 'player-1',
  turn_number: 1,
  direction: 1,
  pending_attacks: 0,
  ...overrides,
});

const mockCards = [
  { card_code: 'AT', quantity_in_deck: 4, expansion_pack: null },
  { card_code: 'SK', quantity_in_deck: 4, expansion_pack: null },
  { card_code: 'SF', quantity_in_deck: 5, expansion_pack: null },
  { card_code: 'SH', quantity_in_deck: 4, expansion_pack: null },
  { card_code: 'NP', quantity_in_deck: 5, expansion_pack: null },
  { card_code: 'FV', quantity_in_deck: 4, expansion_pack: null },
  { card_code: 'CAT_TACO', quantity_in_deck: 4, expansion_pack: null },
  { card_code: 'CAT_MELON', quantity_in_deck: 4, expansion_pack: null },
  { card_code: 'EK', quantity_in_deck: 4, expansion_pack: null },
  { card_code: 'DF', quantity_in_deck: 6, expansion_pack: null },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 1. selectSeat — Player นั่ง/ลุกจากเก้าอี้
// ═══════════════════════════════════════════════════════════════════════════════
describe('selectSeat', () => {
  beforeEach(() => jest.clearAllMocks());

  test('[Happy] นั่งที่นั่งว่างได้ → role = PLAYER', async () => {
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(mockRoom());
    (prisma.player.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.player.count as jest.Mock).mockResolvedValue(0);
    (prisma.player.update as jest.Mock).mockResolvedValue(
      mockPlayer({ seat_number: 2, role: PlayerRole.PLAYER })
    );

    const result = await roomService.selectSeat('ROOM01', 'token-1', 2);
    expect(result.seat_number).toBe(2);
    expect(result.role).toBe(PlayerRole.PLAYER);
  });

  test('[Negative] seatNumber < 1 → throw Invalid seat number', async () => {
    await expect(roomService.selectSeat('ROOM01', 'token-1', 0))
      .rejects.toThrow('Invalid seat number');
  });

  test('[Negative] ที่นั่งมีคนอยู่แล้ว → throw Seat already taken', async () => {
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(mockRoom());
    (prisma.player.findFirst as jest.Mock).mockResolvedValue(
      mockPlayer({ player_token: 'other-token', seat_number: 2, role: PlayerRole.PLAYER })
    );

    await expect(roomService.selectSeat('ROOM01', 'token-1', 2))
      .rejects.toThrow('Seat already taken');
  });

  test('[Negative] ห้องเต็ม → throw Room is full', async () => {
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(mockRoom({ max_players: 2 }));
    (prisma.player.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.player.count as jest.Mock).mockResolvedValue(2);

    await expect(roomService.selectSeat('ROOM01', 'token-1', 3))
      .rejects.toThrow('Room is full');
  });

  test('[Negative] เกมเริ่มแล้ว → throw Game already started', async () => {
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(
      mockRoom({ status: RoomStatus.PLAYING })
    );

    await expect(roomService.selectSeat('ROOM01', 'token-1', 2))
      .rejects.toThrow('Game already started');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. unseatPlayer — ลุกจากที่นั่ง
// ═══════════════════════════════════════════════════════════════════════════════
describe('unseatPlayer', () => {
  beforeEach(() => jest.clearAllMocks());

  test('[Happy] ลุกจากที่นั่ง → role = SPECTATOR, seat = null', async () => {
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(mockRoom());
    (prisma.player.update as jest.Mock).mockResolvedValue(
      mockPlayer({ seat_number: null, role: PlayerRole.SPECTATOR })
    );

    const result = await roomService.unseatPlayer('ROOM01', 'token-1');
    expect(result.seat_number).toBeNull();
    expect(result.role).toBe(PlayerRole.SPECTATOR);
  });

  test('[Negative] เกมเริ่มแล้ว → throw Game already started', async () => {
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(
      mockRoom({ status: RoomStatus.PLAYING })
    );

    await expect(roomService.unseatPlayer('ROOM01', 'token-1'))
      .rejects.toThrow('Game already started');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. leaveRoom — Player ออกจากห้อง
// ═══════════════════════════════════════════════════════════════════════════════
describe('leaveRoom', () => {
  beforeEach(() => jest.clearAllMocks());

  test('[Happy] ออกจากห้อง → Player ถูกลบ ห้องยังอยู่', async () => {
    (prisma.player.findUnique as jest.Mock).mockResolvedValue(mockPlayer());
    (prisma.player.delete as jest.Mock).mockResolvedValue(mockPlayer());
    (prisma.player.findMany as jest.Mock).mockResolvedValue([
      mockPlayer({ player_token: 'token-2' }),
    ]);
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(mockRoom());
    (prisma.room.update as jest.Mock).mockResolvedValue(mockRoom());

    await roomService.leaveRoom('ROOM01', 'token-1');
    expect(prisma.player.delete).toHaveBeenCalled();
  });

  test('[Negative] คนสุดท้ายออก → ห้องถูกลบ return null', async () => {
    (prisma.player.findUnique as jest.Mock).mockResolvedValue(mockPlayer());
    (prisma.player.delete as jest.Mock).mockResolvedValue(mockPlayer());
    (prisma.player.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.room.delete as jest.Mock).mockResolvedValue(mockRoom());

    const result = await roomService.leaveRoom('ROOM01', 'token-1');
    expect(prisma.room.delete).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test('[Negative] Player ไม่ได้อยู่ในห้อง → return null', async () => {
    (prisma.player.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await roomService.leaveRoom('ROOM01', 'token-x');
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. startGame — Host กดเริ่มเกม
// ═══════════════════════════════════════════════════════════════════════════════
describe('startGame', () => {
  const mockPlayers = [
    mockPlayer({ player_id: 'p1', player_token: 'host-token', seat_number: 1, role: PlayerRole.PLAYER }),
    mockPlayer({ player_id: 'p2', player_token: 'token-2', seat_number: 2, role: PlayerRole.PLAYER }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(mockRoom({ host_token: 'host-token' }));
    (prisma.player.findMany as jest.Mock).mockResolvedValue(mockPlayers);
    (prisma.cardMaster.findMany as jest.Mock).mockResolvedValue(mockCards);
    (prisma.gameSession.create as jest.Mock).mockResolvedValue(mockSession());
    (prisma.deckState.create as jest.Mock).mockResolvedValue({});
    (prisma.deckState.findUnique as jest.Mock).mockResolvedValue({ deck_order: ['AT', 'SK'], cards_remaining: 2 });
    (prisma.cardHand.createMany as jest.Mock).mockResolvedValue({});
    (prisma.cardHand.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.gameLog.create as jest.Mock).mockResolvedValue({});
    (prisma.room.update as jest.Mock).mockResolvedValue(mockRoom({ status: RoomStatus.PLAYING }));
  });

  test('[Happy] host เริ่มเกมได้ → Room = PLAYING', async () => {
    const result = await gameService.startGame('ROOM01', 'host-token');
    expect(result.room.status).toBe(RoomStatus.PLAYING);
  });

  test('[Happy] แจกไพ่ → cardHand.createMany ถูกเรียก', async () => {
    await gameService.startGame('ROOM01', 'host-token');
    expect(prisma.cardHand.createMany).toHaveBeenCalled();
  });

  test('[Negative] ไม่ใช่ host → throw Only the host can start', async () => {
    await expect(gameService.startGame('ROOM01', 'not-host'))
      .rejects.toThrow('Only the host can start the game');
  });

  test('[Negative] ผู้เล่น < 2 → throw Need at least 2 players', async () => {
    (prisma.player.findMany as jest.Mock).mockResolvedValue([mockPlayers[0]]);
    await expect(gameService.startGame('ROOM01', 'host-token'))
      .rejects.toThrow('Need at least 2 players to start');
  });

  test('[Negative] เกมเริ่มแล้ว → throw Game already started', async () => {
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(
      mockRoom({ status: RoomStatus.PLAYING, host_token: 'host-token' })
    );
    await expect(gameService.startGame('ROOM01', 'host-token'))
      .rejects.toThrow('Game already started');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. playCard — ลงไพ่
// ═══════════════════════════════════════════════════════════════════════════════
describe('playCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(mockRoom({ status: RoomStatus.PLAYING }));
    (prisma.gameSession.findFirst as jest.Mock).mockResolvedValue(mockSession());
    (prisma.player.findFirst as jest.Mock).mockResolvedValue(mockPlayer({ player_id: 'player-1' }));
    (prisma.cardHand.findUnique as jest.Mock).mockResolvedValue({ cards: ['SK', 'AT', 'SF'] });
    (prisma.cardHand.update as jest.Mock).mockResolvedValue({});
    (prisma.deckState.findUnique as jest.Mock).mockResolvedValue({ deck_order: ['AT', 'SF'], discard_pile: [] });
    (prisma.deckState.update as jest.Mock).mockResolvedValue({});
    (prisma.gameLog.create as jest.Mock).mockResolvedValue({});
    (prisma.player.findMany as jest.Mock).mockResolvedValue([
      mockPlayer({ player_id: 'player-1', seat_number: 1, role: PlayerRole.PLAYER }),
      mockPlayer({ player_id: 'player-2', seat_number: 2, role: PlayerRole.PLAYER }),
    ]);
    (prisma.gameSession.update as jest.Mock).mockResolvedValue({});
  });

  test('[Happy] เล่น SK (Skip) → return success + CARD_PLAYED', async () => {
    const result = await gameService.playCard('ROOM01', 'token-1', 'SK');
    expect(result.success).toBe(true);
    expect(result.action).toBe('CARD_PLAYED');
    expect(result.cardCode).toBe('SK');
  });

  test('[Happy] เล่น AT (Attack) → effect.type = ATTACK', async () => {
    (prisma.cardHand.findUnique as jest.Mock).mockResolvedValue({ cards: ['AT', 'SF'] });
    const result = await gameService.playCard('ROOM01', 'token-1', 'AT');
    expect(result.effect?.type).toBe('ATTACK');
  });

  test('[Happy] เล่น SF (See The Future) → effect.type = SEE_THE_FUTURE', async () => {
    (prisma.cardHand.findUnique as jest.Mock).mockResolvedValue({ cards: ['SF', 'SK'] });
    const result = await gameService.playCard('ROOM01', 'token-1', 'SF');
    expect(result.effect?.type).toBe('SEE_THE_FUTURE');
  });

  test('[Happy] เล่น SH (Shuffle) → effect.type = SHUFFLE', async () => {
    (prisma.cardHand.findUnique as jest.Mock).mockResolvedValue({ cards: ['SH'] });
    const result = await gameService.playCard('ROOM01', 'token-1', 'SH');
    expect(result.effect?.type).toBe('SHUFFLE');
  });

  test('[Negative] room ไม่พบ → throw NotFoundError', async () => {
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(gameService.playCard('WRONG', 'token-1', 'SK'))
      .rejects.toThrow('Room');
  });

  test('[Negative] status ไม่ใช่ PLAYING → throw Game is not active', async () => {
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(mockRoom({ status: RoomStatus.WAITING }));
    await expect(gameService.playCard('ROOM01', 'token-1', 'SK'))
      .rejects.toThrow('Game is not active');
  });

  test('[Negative] ไม่ใช่เทิร์นตัวเอง → throw It\'s not your turn', async () => {
    (prisma.gameSession.findFirst as jest.Mock).mockResolvedValue(
      mockSession({ current_turn_player_id: 'other-player' })
    );
    await expect(gameService.playCard('ROOM01', 'token-1', 'SK'))
      .rejects.toThrow("It's not your turn");
  });

  test('[Negative] ไพ่ไม่อยู่ในมือ → throw Card not in hand', async () => {
    (prisma.cardHand.findUnique as jest.Mock).mockResolvedValue({ cards: ['AT'] });
    await expect(gameService.playCard('ROOM01', 'token-1', 'SK'))
      .rejects.toThrow('Card not in hand');
  });

  test('[Negative] เล่น FV (Sprint 3+) → throw not yet implemented', async () => {
    (prisma.cardHand.findUnique as jest.Mock).mockResolvedValue({ cards: ['FV'] });
    await expect(gameService.playCard('ROOM01', 'token-1', 'FV'))
      .rejects.toThrow('not yet implemented');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. drawCard — จั่วไพ่
// ═══════════════════════════════════════════════════════════════════════════════
describe('drawCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(mockRoom({ status: RoomStatus.PLAYING }));
    (prisma.gameSession.findFirst as jest.Mock).mockResolvedValue(mockSession());
    (prisma.player.findFirst as jest.Mock).mockResolvedValue(mockPlayer({ player_id: 'player-1' }));
    (prisma.deckState.findUnique as jest.Mock).mockResolvedValue({ deck_order: ['AT', 'SK', 'SF'], cards_remaining: 3 });
    (prisma.deckState.update as jest.Mock).mockResolvedValue({});
    (prisma.cardHand.findUnique as jest.Mock).mockResolvedValue({ cards: ['DF'] });
    (prisma.cardHand.update as jest.Mock).mockResolvedValue({});
    (prisma.gameLog.create as jest.Mock).mockResolvedValue({});
    (prisma.player.findMany as jest.Mock).mockResolvedValue([
      mockPlayer({ player_id: 'player-1', seat_number: 1, role: PlayerRole.PLAYER }),
      mockPlayer({ player_id: 'player-2', seat_number: 2, role: PlayerRole.PLAYER }),
    ]);
    (prisma.gameSession.update as jest.Mock).mockResolvedValue({});
  });

  test('[Happy] จั่วไพ่ปกติ → drawnCard ไม่ใช่ EK, turn เปลี่ยน', async () => {
    const result = await gameService.drawCard('ROOM01', 'token-1');
    expect(result.success).toBe(true);
    expect((result as any).drawnCard).toBe('SF'); // top of deck
    expect(result.action).toBe('TURN_ADVANCED');
  });

  test('[Happy] จั่ว EK + มี Defuse → action = DREW_EXPLODING_KITTEN, hasDefuse = true', async () => {
    (prisma.deckState.findUnique as jest.Mock).mockResolvedValue({ deck_order: ['AT', 'EK'], cards_remaining: 2 });
    (prisma.cardHand.findUnique as jest.Mock).mockResolvedValue({ cards: ['DF', 'SK'] });
    (prisma.gameLog.create as jest.Mock).mockResolvedValue({});

    const result = await gameService.drawCard('ROOM01', 'token-1');
    expect(result.action).toBe('DREW_EXPLODING_KITTEN');
    expect((result as any).hasDefuse).toBe(true);
  });

  test('[Happy] จั่ว EK + ไม่มี Defuse → hasDefuse = false', async () => {
    (prisma.deckState.findUnique as jest.Mock).mockResolvedValue({ deck_order: ['EK'], cards_remaining: 1 });
    (prisma.cardHand.findUnique as jest.Mock).mockResolvedValue({ cards: ['SK', 'AT'] }); // ไม่มี DF
    (prisma.gameLog.create as jest.Mock).mockResolvedValue({});

    const result = await gameService.drawCard('ROOM01', 'token-1');
    expect(result.action).toBe('DREW_EXPLODING_KITTEN');
    expect((result as any).hasDefuse).toBe(false);
  });

  test('[Negative] room ไม่พบ → throw NotFoundError', async () => {
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(gameService.drawCard('WRONG', 'token-1'))
      .rejects.toThrow('Room');
  });

  test('[Negative] status ไม่ใช่ PLAYING → throw Game is not active', async () => {
    (prisma.room.findUnique as jest.Mock).mockResolvedValue(mockRoom({ status: RoomStatus.WAITING }));
    await expect(gameService.drawCard('ROOM01', 'token-1'))
      .rejects.toThrow('Game is not active');
  });

  test('[Negative] ไม่ใช่เทิร์นตัวเอง → throw It\'s not your turn', async () => {
    (prisma.gameSession.findFirst as jest.Mock).mockResolvedValue(
      mockSession({ current_turn_player_id: 'other-player' })
    );
    await expect(gameService.drawCard('ROOM01', 'token-1'))
      .rejects.toThrow("It's not your turn");
  });

  test('[Negative] deck ว่าง → throw Deck is empty', async () => {
    (prisma.deckState.findUnique as jest.Mock).mockResolvedValue({ deck_order: [], cards_remaining: 0 });
    await expect(gameService.drawCard('ROOM01', 'token-1'))
      .rejects.toThrow('Deck is empty');
  });
});