import { PrismaClient } from "@prisma/client";
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
  console.log("Seeding database...");

  // 1️⃣ Create Room
  const room = await prisma.room.create({
    data: {
      room_name: "Test Room",
      host_session_id: "host-session-1",
      status: "waiting",
      max_players: 4,
      current_players: 2,
    },
  });

  // 2️⃣ Create Players
  const player1 = await prisma.player.create({
    data: {
      session_id: "host-session-1",
      display_name: "Host",
      profile_picture: null,
      room_id: room.room_id,
      seat_number: 1,
      role: "host",
    },
  });

  const player2 = await prisma.player.create({
    data: {
      session_id: "player-session-2",
      display_name: "Guest",
      profile_picture: null,
      room_id: room.room_id,
      seat_number: 2,
      role: "player",
    },
  });

  // 3️⃣ Create Game Session
  const gameSession = await prisma.gameSession.create({
    data: {
      room_id: room.room_id,
      current_turn_session_id: player1.session_id,
      turn_number: 1,
      status: "active",
    },
  });

  // 4️⃣ Deck Config
  await prisma.deckConfig.create({
    data: {
      room_id: room.room_id,
      card_version: "base",
      expansions: { imploding: false },
    },
  });

  // 5️⃣ Deck State
  await prisma.deckState.create({
    data: {
      session_id: gameSession.session_id,
      deck_order: ["attack", "skip", "shuffle"],
      discard_pile: [],
      cards_remaining: 3,
    },
  });

  // 6️⃣ Card Hands
  await prisma.cardHand.create({
    data: {
      player_id: player1.player_id,
      session_id: gameSession.session_id,
      cards: ["attack", "defuse"],
      card_count: 2,
    },
  });

  await prisma.cardHand.create({
    data: {
      player_id: player2.player_id,
      session_id: gameSession.session_id,
      cards: ["skip"],
      card_count: 1,
    },
  });

  // 7️⃣ Game Log
  await prisma.gameLog.create({
    data: {
      session_id: gameSession.session_id,
      player_session_id: player1.session_id,
      player_display_name: "Host",
      action_type: "START_GAME",
      action_details: { message: "Game started" },
      turn_number: 1,
    },
  });

  // 8️⃣ Card Master (reference table)
  await prisma.cardMaster.createMany({
    data: [
      {
        card_code: "ATTACK",
        name: "Attack",
        type: "action",
        category: "offensive",
        description: "Force next player to take two turns",
        effect_details: { extraTurns: 2 },
        image_url: "attack.png",
        thumbnail_url: "attack_thumb.png",
        quantity_in_deck: 4,
        is_playable: true,
        is_stackable: true,
        expansion_pack: null,
        display_order: 1,
      },
      {
        card_code: "SKIP",
        name: "Skip",
        type: "action",
        category: "defensive",
        description: "End your turn without drawing",
        effect_details: {},
        image_url: "skip.png",
        thumbnail_url: "skip_thumb.png",
        quantity_in_deck: 4,
        is_playable: true,
        is_stackable: true,
        expansion_pack: null,
        display_order: 2,
      },
    ],
  });

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
