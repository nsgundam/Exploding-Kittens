import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  console.log("Resetting data...");

  // 1️⃣ Clear existing data (child -> parent)
  await prisma.$transaction([
    prisma.gameLog.deleteMany(),
    prisma.cardHand.deleteMany(),
    prisma.deckState.deleteMany(),
    prisma.deckConfig.deleteMany(),
    prisma.gameSession.deleteMany(),
    prisma.player.deleteMany(),
    prisma.room.deleteMany(),
    prisma.cardMaster.deleteMany(),
  ]);

  console.log("Seeding database...");

  // 2️⃣ Create fresh world inside transaction
  await prisma.$transaction(async (tx) => {
    const room = await tx.room.create({
      data: {
        room_name: "Test Room",
        host_session_id: "host-session-1",
        status: "waiting",
        max_players: 4,
        current_players: 2,
      },
    });

    const player1 = await tx.player.create({
      data: {
        session_id: "host-session-1",
        display_name: "Host",
        profile_picture: null,
        room_id: room.room_id,
        seat_number: 1,
        role: "host",
      },
    });

    const player2 = await tx.player.create({
      data: {
        session_id: "player-session-2",
        display_name: "Guest",
        profile_picture: null,
        room_id: room.room_id,
        seat_number: 2,
        role: "player",
      },
    });

    const gameSession = await tx.gameSession.create({
      data: {
        room_id: room.room_id,
        current_turn_session_id: player1.session_id,
        turn_number: 1,
        status: "active",
      },
    });

    await tx.deckConfig.create({
      data: {
        room_id: room.room_id,
        card_version: "base",
        expansions: { imploding: false },
      },
    });

    await tx.deckState.create({
      data: {
        session_id: gameSession.session_id,
        deck_order: ["attack", "skip", "shuffle"],
        discard_pile: [],
        cards_remaining: 3,
      },
    });

    await tx.cardHand.create({
      data: {
        player_id: player1.player_id,
        session_id: gameSession.session_id,
        cards: ["attack", "defuse"],
        card_count: 2,
      },
    });

    await tx.cardHand.create({
      data: {
        player_id: player2.player_id,
        session_id: gameSession.session_id,
        cards: ["skip"],
        card_count: 1,
      },
    });

    await tx.gameLog.create({
      data: {
        session_id: gameSession.session_id,
        player_session_id: player1.session_id,
        player_display_name: "Host",
        action_type: "START_GAME",
        action_details: { message: "Game started" },
        turn_number: gameSession.turn_number,
      },
    });

    await tx.cardMaster.createMany({
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
  });
const rooms = await prisma.room.findMany({
  include: {
    players: true,
    game_sessions : {
      include: {
        deck_state: true,
        hands: true,
        logs: true,
      },
    },
    deck_config: true,
  },
});

  console.log(JSON.stringify(rooms, null, 2));
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