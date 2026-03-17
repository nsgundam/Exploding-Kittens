import { PrismaClient, PlayerRole, RoomStatus, GameSessionStatus } from '@prisma/client'
import { PrismaPg } from "@prisma/adapter-pg";
import { classicCards, implodingKittensCards, goodAndEvilCards } from './cards'
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('🌱 Starting seed...')
  // ============================================================
  // CARD MASTER — ข้อมูลการ์ดทั้งหมดสำหรับเกม
  // ============================================================
  await prisma.cardMaster.deleteMany()

  const allCards = [
    ...classicCards(),        // 56 ใบ  (display_order 1–13)
    ...implodingKittensCards(), // 20 ใบ  (display_order 14–19)
    ...goodAndEvilCards(),    // 53 ใบ  (display_order 20–35)
  ]

  const cards = await prisma.cardMaster.createMany({ data: allCards })
  console.log(`✅ CardMaster: created ${cards.count} cards`)
  // expected output: ✅ CardMaster: created 129 cards

  // ============================================================
  // PLAYER IDENTITIES — ผู้เล่นสมมติ 6 คน
  // ============================================================

  await prisma.gameLog.deleteMany()
  await prisma.cardHand.deleteMany()
  await prisma.deckState.deleteMany()
  await prisma.gameSession.deleteMany()
  await prisma.deckConfig.deleteMany()
  await prisma.player.deleteMany()
  await prisma.room.deleteMany()
  await prisma.playerIdentity.deleteMany()

  const identities = await Promise.all([
    prisma.playerIdentity.create({
      data: {
        token: 'test-token-kan-001',
        display_name: 'กัน',
        profile_picture: '/avatars/avatar-1.png',
      },
    }),
    prisma.playerIdentity.create({
      data: {
        token: 'test-token-pat-002',
        display_name: 'พัต',
        profile_picture: '/avatars/avatar-2.png',
      },
    }),
    prisma.playerIdentity.create({
      data: {
        token: 'test-token-arm-003',
        display_name: 'อาร์ม',
        profile_picture: '/avatars/avatar-3.png',
      },
    }),
    prisma.playerIdentity.create({
      data: {
        token: 'test-token-bas-004',
        display_name: 'เบส',
        profile_picture: '/avatars/avatar-4.png',
      },
    }),
    prisma.playerIdentity.create({
      data: {
        token: 'test-token-ped-005',
        display_name: 'เพชร',
        profile_picture: '/avatars/avatar-5.png',
      },
    }),
    prisma.playerIdentity.create({
      data: {
        token: 'test-token-nan-006',
        display_name: 'นันย่า',
        profile_picture: '/avatars/avatar-6.png',
      },
    }),
  ])

  console.log(`✅ PlayerIdentity: created ${identities.length} identities`)

  const [kan, pat, arm, bas, ped, nan] = identities

  // ============================================================
  // ROOM 1 — ห้อง WAITING ทดสอบหน้า Lobby + Game Room
  // ============================================================

  const waitingRoom = await prisma.room.create({
    data: {
      room_name: 'ห้องทดสอบ Waiting',
      host_token: kan.token,
      status: RoomStatus.WAITING,
      max_players: 5,
      deck_config: {
        create: {
          card_version: 'classic',
          expansions: { addons: [] },
        },
      },
    },
  })

  // เพิ่มผู้เล่นในห้อง WAITING
  await prisma.player.createMany({
    data: [
      {
        player_token: kan.token,
        display_name: kan.display_name,
        profile_picture: kan.profile_picture,
        room_id: waitingRoom.room_id,
        seat_number: 1,
        role: PlayerRole.PLAYER,
      },
      {
        player_token: pat.token,
        display_name: pat.display_name,
        profile_picture: pat.profile_picture,
        room_id: waitingRoom.room_id,
        seat_number: 2,
        role: PlayerRole.PLAYER,
      },
      {
        player_token: arm.token,
        display_name: arm.display_name,
        profile_picture: arm.profile_picture,
        room_id: waitingRoom.room_id,
        seat_number: null,         // ยังไม่เลือกที่นั่ง → SPECTATOR
        role: PlayerRole.SPECTATOR,
      },
    ],
  })

  console.log(`✅ Room 1 (WAITING): "${waitingRoom.room_name}" — 3 players`)

  // ============================================================
  // ROOM 2 — ห้อง PLAYING ทดสอบหน้า Game Room ระหว่างเกม
  // ============================================================

  const playingRoom = await prisma.room.create({
    data: {
      room_name: 'ห้องทดสอบ Playing',
      host_token: bas.token,
      status: RoomStatus.PLAYING,
      max_players: 4,
      deck_config: {
        create: {
          card_version: 'good_and_evil',
          expansions: { addons: ['imploding_kittens'] },
        },
      },
    },
  })

  const playingPlayers = await Promise.all([
    prisma.player.create({
      data: {
        player_token: bas.token,
        display_name: bas.display_name,
        profile_picture: bas.profile_picture,
        room_id: playingRoom.room_id,
        seat_number: 1,
        role: PlayerRole.PLAYER,
        is_alive: true,
      },
    }),
    prisma.player.create({
      data: {
        player_token: ped.token,
        display_name: ped.display_name,
        profile_picture: ped.profile_picture,
        room_id: playingRoom.room_id,
        seat_number: 2,
        role: PlayerRole.PLAYER,
        is_alive: true,
      },
    }),
    prisma.player.create({
      data: {
        player_token: nan.token,
        display_name: nan.display_name,
        profile_picture: nan.profile_picture,
        room_id: playingRoom.room_id,
        seat_number: 3,
        role: PlayerRole.PLAYER,
        is_alive: false, // ตายไปแล้ว — ทดสอบ eliminated state
      },
    }),
  ])

  const [basPlayer, pedPlayer, nanPlayer] = playingPlayers

  // สร้าง GameSession
  const gameSession = await prisma.gameSession.create({
    data: {
      room_id: playingRoom.room_id,
      current_turn_player_id: basPlayer.player_id,
      turn_number: 5,
      start_time: new Date(Date.now() - 10 * 60 * 1000), // เริ่มเล่นมา 10 นาทีแล้ว
      status: GameSessionStatus.IN_PROGRESS,
    },
  })

  // สร้าง DeckState
  await prisma.deckState.create({
    data: {
      session_id: gameSession.session_id,
      deck_order: ['EK', 'DF', 'AT', 'SK', 'SF', 'SH', 'NP', 'FV', 'CAT_TACO'],
      discard_pile: ['SK', 'AT', 'NP'],
      cards_remaining: 9,
    },
  })

  // สร้าง CardHand ให้ผู้เล่นที่ยังอยู่
  await prisma.cardHand.createMany({
    data: [
      {
        player_id: basPlayer.player_id,
        session_id: gameSession.session_id,
        cards: ['DF', 'AT', 'NP', 'SF'],
        card_count: 4,
      },
      {
        player_id: pedPlayer.player_id,
        session_id: gameSession.session_id,
        cards: ['SK', 'CAT_TACO', 'CAT_MELON'],
        card_count: 3,
      },
    ],
  })

  // สร้าง GameLog ตัวอย่าง
  await prisma.gameLog.createMany({
    data: [
      {
        session_id: gameSession.session_id,
        player_id: basPlayer.player_id,
        player_display_name: bas.display_name,
        action_type: 'PLAY_CARD',
        action_details: { card: 'AT', target: null },
        is_noped: false,
        turn_number: 3,
      },
      {
        session_id: gameSession.session_id,
        player_id: pedPlayer.player_id,
        player_display_name: ped.display_name,
        action_type: 'PLAY_CARD',
        action_details: { card: 'NP', target: 'AT' },
        is_noped: false,
        turn_number: 3,
      },
      {
        session_id: gameSession.session_id,
        player_id: nanPlayer.player_id,
        player_display_name: nan.display_name,
        action_type: 'DRAW_CARD',
        action_details: { card: 'EK', result: 'eliminated' },
        is_noped: false,
        turn_number: 4,
      },
    ],
  })

  console.log(`✅ Room 2 (PLAYING): "${playingRoom.room_name}" — game in progress, turn 5`)

  // ============================================================
  // สรุป Tokens สำหรับใช้ทดสอบ
  // ============================================================

  console.log('\n📋 Test Tokens สำหรับใช้ใน LocalStorage:')
  console.log('─────────────────────────────────────────')
  identities.forEach(i => {
    console.log(`${i.display_name.padEnd(8)} → ${i.token}`)
  })
  console.log('─────────────────────────────────────────')
  console.log(`\n🏠 Room IDs:`)
  console.log(`WAITING room → ${waitingRoom.room_id}`)
  console.log(`PLAYING room → ${playingRoom.room_id}`)
  console.log('\n🌱 Seed completed successfully!')
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })