import { prisma } from "../config/prisma";
import { roomService } from "./room.service";
import { RoomStatus } from "@prisma/client";

export const gameService = {

  // S2-06 Stub: Play Card
  async playCard(roomId: string, playerToken: string, cardCode: string, targetPlayerToken?: string) {
    const room = await roomService.getRoomById(roomId);
    if (!room) throw new Error("Room not found");
    if (room.status !== RoomStatus.PLAYING) throw new Error("Game is not active");

    return {
      success: true,
      message: `Card ${cardCode} played`,
      playedBy: playerToken,
      target: targetPlayerToken || null,
      timestamp: new Date()
    };
  },

  // S2-07: Draw Card — full implementation
  async drawCard(roomId: string, playerToken: string) {
    return await prisma.$transaction(async (tx) => {

      // ── 1. หา room และ player ──
      const room = await tx.room.findUnique({ where: { room_id: roomId } });
      if (!room) throw new Error("Room not found");
      if (room.status !== RoomStatus.PLAYING) throw new Error("Game is not active");

      const player = await tx.player.findFirst({
        where: { room_id: roomId, player_token: playerToken }
      });
      if (!player) throw new Error("Player not found in room");

      // ── 2. หา GameSession ที่กำลัง active ──
      const session = await tx.gameSession.findFirst({
        where: { room_id: roomId, status: "IN_PROGRESS" },
        orderBy: { start_time: "desc" }
      });
      if (!session) throw new Error("No active game session");

      // ── 3. หา DeckState ──
      const deckState = await tx.deckState.findUnique({
        where: { session_id: session.session_id }
      });
      if (!deckState) throw new Error("Deck state not found");

      const deck = deckState.deck_order as string[];
      if (deck.length === 0) throw new Error("Deck is empty");

      // ── 4. Pop ไพ่จาก top of deck (index สุดท้าย) ──
      const drawnCard = deck[deck.length - 1]!;
      const newDeck = deck.slice(0, deck.length - 1);

      // ── 5. หา CardHand ของผู้เล่น ──
      const cardHand = await tx.cardHand.findFirst({
        where: { session_id: session.session_id, player_id: player.player_id }
      });
      if (!cardHand) throw new Error("Player hand not found");

      const currentCards = cardHand.cards as string[];

      // ── 6. เช็คว่าเป็น Exploding Kitten ไหม ──
      const isEK = drawnCard === "EK" || drawnCard === "GVE_EK";

      let newCards = currentCards;
      let eliminated = false;

      if (isEK) {
        // เช็คว่ามี Defuse ไหม
        const dfCode = drawnCard === "GVE_EK" ? "GVE_DF" : "DF";
        const dfIndex = currentCards.indexOf(dfCode);

        if (dfIndex !== -1) {
          // มี Defuse — ใช้ Defuse และใส่ EK กลับ deck (ตำแหน่งล่างสุด)
          newCards = currentCards.filter((_, idx) => idx !== dfIndex);
          newDeck.unshift(drawnCard); // ใส่ EK กลับล่างสุดของ deck
        } else {
          // ไม่มี Defuse — ตายแล้ว
          eliminated = true;
          newCards = []; // เคลียร์ไพ่
        }
      } else {
        // ไพ่ปกติ — เพิ่มเข้ามือ
        newCards = [...currentCards, drawnCard];
      }

      // ── 7. อัปเดต DeckState ──
      await tx.deckState.update({
        where: { session_id: session.session_id },
        data: {
          deck_order: newDeck,
          cards_remaining: newDeck.length,
        }
      });

      // ── 8. อัปเดต CardHand ──
      await tx.cardHand.update({
        where: { hand_id: cardHand.hand_id },
        data: {
          cards: newCards,
          card_count: newCards.length,
        }
      });

      // ── 9. หาผู้เล่นคนถัดไป ──
      const allPlayers = await tx.player.findMany({
        where: { room_id: roomId, role: "PLAYER" },
        orderBy: { seat_number: "asc" }
      });

      const currentIndex = allPlayers.findIndex(p => p.player_id === player.player_id);
      const nextPlayer = allPlayers[(currentIndex + 1) % allPlayers.length];

      // ── 10. อัปเดต turn ──
      if (nextPlayer) {
        await tx.gameSession.update({
          where: { session_id: session.session_id },
          data: {
            current_turn_player_id: nextPlayer.player_id,
            turn_number: { increment: 1 }
          }
        });
      }

      // ── 11. สร้าง GameLog ──
      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: player.player_id,
          player_display_name: player.display_name,
          action_type: isEK ? (eliminated ? "EXPLODED" : "DEFUSED") : "DRAW_CARD",
          action_details: {
            card_drawn: drawnCard,
            is_exploding_kitten: isEK,
            eliminated,
            cards_remaining_in_deck: newDeck.length,
          },
          turn_number: session.turn_number,
        }
      });

      // ── 12. Return ──
      return {
        success: true,
        message: isEK
          ? (eliminated ? "💥 You exploded!" : "🛡️ Defused!")
          : "Card drawn",
        drawnBy: playerToken,
        drawnByDisplayName: player.display_name,
        drawnCard,
        isExplodingKitten: isEK,
        eliminated,
        hand: {
          cards: newCards,
          card_count: newCards.length,
        },
        deckRemaining: newDeck.length,
        nextTurnPlayerId: nextPlayer?.player_id ?? null,
        timestamp: new Date()
      };
    });
  }
};