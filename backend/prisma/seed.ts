import { PrismaClient, PlayerRole, RoomStatus, GameSessionStatus } from '@prisma/client'
import { PrismaPg } from "@prisma/adapter-pg";
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
  // CARD MASTER — ข้อมูลการ์ดทั้งหมดในเกม
  // ============================================================

  await prisma.cardMaster.deleteMany()

  const cards = await prisma.cardMaster.createMany({
    data: [
      // Classic Version
      {
        card_code: 'EK',
        name: 'Exploding Kitten',
        type: 'bomb',
        category: 'core',
        description: 'ถ้าจั่วใบนี้และไม่มี Defuse คุณแพ้เกม',
        effect_details: { action: 'eliminate_player' },
        image_url: '/cards/exploding-kitten.png',
        thumbnail_url: '/cards/thumb/exploding-kitten.png',
        quantity_in_deck: 4,
        is_playable: false,
        is_stackable: false,
        expansion_pack: null,
        display_order: 1,
      },
      {
        card_code: 'DF',
        name: 'Defuse',
        type: 'defuse',
        category: 'core',
        description: 'ใช้เพื่อหยุดการระเบิด และใส่ Exploding Kitten กลับในสำรับ',
        effect_details: { action: 'defuse_bomb', insert_back: true },
        image_url: '/cards/defuse.png',
        thumbnail_url: '/cards/thumb/defuse.png',
        quantity_in_deck: 6,
        is_playable: true,
        is_stackable: false,
        expansion_pack: null,
        display_order: 2,
      },
      {
        card_code: 'AT',
        name: 'Attack',
        type: 'action',
        category: 'core',
        description: 'จบเทิร์นโดยไม่จั่วไพ่ ผู้เล่นถัดไปเล่น 2 เทิร์น',
        effect_details: { action: 'attack', extra_turns: 2 },
        image_url: '/cards/attack.png',
        thumbnail_url: '/cards/thumb/attack.png',
        quantity_in_deck: 4,
        is_playable: true,
        is_stackable: true,
        expansion_pack: null,
        display_order: 3,
      },
      {
        card_code: 'SK',
        name: 'Skip',
        type: 'action',
        category: 'core',
        description: 'จบเทิร์นโดยไม่จั่วไพ่',
        effect_details: { action: 'skip_turn' },
        image_url: '/cards/skip.png',
        thumbnail_url: '/cards/thumb/skip.png',
        quantity_in_deck: 4,
        is_playable: true,
        is_stackable: false,
        expansion_pack: null,
        display_order: 4,
      },
      {
        card_code: 'SF',
        name: 'See The Future',
        type: 'action',
        category: 'core',
        description: 'ดูไพ่ 3 ใบบนสุดของสำรับ',
        effect_details: { action: 'see_future', cards_to_see: 3 },
        image_url: '/cards/see-the-future.png',
        thumbnail_url: '/cards/thumb/see-the-future.png',
        quantity_in_deck: 5,
        is_playable: true,
        is_stackable: false,
        expansion_pack: null,
        display_order: 5,
      },
      {
        card_code: 'SH',
        name: 'Shuffle',
        type: 'action',
        category: 'core',
        description: 'สับสำรับใหม่แบบสุ่ม',
        effect_details: { action: 'shuffle_deck' },
        image_url: '/cards/shuffle.png',
        thumbnail_url: '/cards/thumb/shuffle.png',
        quantity_in_deck: 4,
        is_playable: true,
        is_stackable: false,
        expansion_pack: null,
        display_order: 6,
      },
      {
        card_code: 'NP',
        name: 'Nope',
        type: 'reaction',
        category: 'core',
        description: 'หยุด action ของผู้เล่นคนอื่น สามารถเล่นได้ทุกเวลา',
        effect_details: { action: 'nope', can_nope_nope: true },
        image_url: '/cards/nope.png',
        thumbnail_url: '/cards/thumb/nope.png',
        quantity_in_deck: 5,
        is_playable: true,
        is_stackable: false,
        expansion_pack: null,
        display_order: 7,
      },
      {
        card_code: 'FV',
        name: 'Favor',
        type: 'action',
        category: 'core',
        description: 'บังคับผู้เล่นคนอื่นให้ส่งไพ่ 1 ใบให้คุณ',
        effect_details: { action: 'steal_card', target: 'chosen_player' },
        image_url: '/cards/favor.png',
        thumbnail_url: '/cards/thumb/favor.png',
        quantity_in_deck: 4,
        is_playable: true,
        is_stackable: false,
        expansion_pack: null,
        display_order: 8,
      },
      // Combo Cards (Classic)
      {
        card_code: 'CAT_TACO',
        name: 'Taco Cat',
        type: 'combo',
        category: 'cat',
        description: 'ไพ่แมว ใช้คู่ 2 ใบเพื่อขโมยไพ่สุ่มจากผู้เล่นคนอื่น',
        effect_details: { action: 'combo_steal', combo_size: 2 },
        image_url: '/cards/taco-cat.png',
        thumbnail_url: '/cards/thumb/taco-cat.png',
        quantity_in_deck: 4,
        is_playable: true,
        is_stackable: false,
        expansion_pack: null,
        display_order: 9,
      },
      {
        card_code: 'CAT_MELON',
        name: 'Melon Cat',
        type: 'combo',
        category: 'cat',
        description: 'ไพ่แมว ใช้คู่ 2 ใบเพื่อขโมยไพ่สุ่มจากผู้เล่นคนอื่น',
        effect_details: { action: 'combo_steal', combo_size: 2 },
        image_url: '/cards/melon-cat.png',
        thumbnail_url: '/cards/thumb/melon-cat.png',
        quantity_in_deck: 4,
        is_playable: true,
        is_stackable: false,
        expansion_pack: null,
        display_order: 10,
      },
      {
        card_code: 'CAT_BEARD',
        name: 'Beard Cat',
        type: 'combo',
        category: 'cat',
        description: 'ไพ่แมว ใช้คู่ 2 ใบเพื่อขโมยไพ่สุ่มจากผู้เล่นคนอื่น',
        effect_details: { action: 'combo_steal', combo_size: 2 },
        image_url: '/cards/beard-cat.png',
        thumbnail_url: '/cards/thumb/beard-cat.png',
        quantity_in_deck: 4,
        is_playable: true,
        is_stackable: false,
        expansion_pack: null,
        display_order: 11,
      },
      {
        card_code: 'CAT_RAINBOW',
        name: 'Rainbow-Ralphing Cat',
        type: 'combo',
        category: 'cat',
        description: 'ไพ่แมว ใช้คู่ 2 ใบเพื่อขโมยไพ่สุ่มจากผู้เล่นคนอื่น',
        effect_details: { action: 'combo_steal', combo_size: 2 },
        image_url: '/cards/rainbow-cat.png',
        thumbnail_url: '/cards/thumb/rainbow-cat.png',
        quantity_in_deck: 4,
        is_playable: true,
        is_stackable: false,
        expansion_pack: null,
        display_order: 12,
      },
      {
        card_code: 'CAT_POTATO',
        name: 'Potato Cat',
        type: 'combo',
        category: 'cat',
        description: 'ไพ่แมว ใช้คู่ 2 ใบเพื่อขโมยไพ่สุ่มจากผู้เล่นคนอื่น',
        effect_details: { action: 'combo_steal', combo_size: 2 },
        image_url: '/cards/potato-cat.png',
        thumbnail_url: '/cards/thumb/potato-cat.png',
        quantity_in_deck: 4,
        is_playable: true,
        is_stackable: false,
        expansion_pack: null,
        display_order: 13,
      },

      // Good and Evil Version
      {
        card_code: 'EKG',
        name: 'Exploding Kitten (Good)',
        type: 'bomb',
        category: 'core',
        description: 'เวอร์ชั่น Good — ระเบิดสีทอง ถ้าจั่วใบนี้โดยไม่มี Defuse คุณแพ้เกม',
        effect_details: { action: 'eliminate_player', variant: 'good' },
        image_url: '/cards/exploding-kitten-good.png',
        thumbnail_url: '/cards/thumb/exploding-kitten-good.png',
        quantity_in_deck: 2,
        is_playable: false,
        is_stackable: false,
        expansion_pack: 'good_and_evil',
        display_order: 14,
      },
      {
        card_code: 'EKE',
        name: 'Exploding Kitten (Evil)',
        type: 'bomb',
        category: 'core',
        description: 'เวอร์ชั่น Evil — ระเบิดสีแดง มีผลพิเศษเพิ่มเติม',
        effect_details: { action: 'eliminate_player', variant: 'evil', extra_effect: 'discard_hand' },
        image_url: '/cards/exploding-kitten-evil.png',
        thumbnail_url: '/cards/thumb/exploding-kitten-evil.png',
        quantity_in_deck: 2,
        is_playable: false,
        is_stackable: false,
        expansion_pack: 'good_and_evil',
        display_order: 15,
      },
    ],
  })

  console.log(`✅ CardMaster: created ${cards.count} cards`)

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