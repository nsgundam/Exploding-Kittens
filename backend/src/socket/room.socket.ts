import { Server, Socket } from "socket.io";
import { roomService } from "../services/room.service";
import { gameService } from "../services/game.service";
import { prisma } from "../config/prisma";

const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

// ── Helper: สร้าง roomWithMeta พร้อม deck_count, hand_count, current_turn ──
async function buildRoomWithMeta(roomId: string) {
  const updatedRoom = await roomService.getRoomById(roomId);
  const session = await prisma.gameSession.findFirst({
    where: { room_id: roomId, status: "IN_PROGRESS" },
    orderBy: { start_time: "desc" },
    include: { hands: true },
  });
  const deckState = session
    ? await prisma.deckState.findUnique({ where: { session_id: session.session_id } })
    : null;

  return {
    ...updatedRoom,
    current_turn_player_id: session?.current_turn_player_id ?? null,
    deck_count: deckState?.cards_remaining ?? null,
    players: updatedRoom.players.map((p: any) => {
      const hand = session?.hands.find((h: any) => h.player_id === p.player_id);
      return { ...p, hand_count: hand?.card_count ?? 0 };
    }),
  };
}

export const registerRoomSocket = (io: Server) => {

  io.on("connection", (socket: Socket) => {
    console.log("Connected:", socket.id);

    // Join Room
    socket.on("joinRoom", async ({ roomId, playerToken, displayName }) => {
      try {
        await roomService.joinRoom(roomId, playerToken, displayName);
        socket.data.playerToken = playerToken;
        socket.data.roomId = roomId;
        socket.join(roomId);

        if (disconnectTimeouts.has(playerToken)) {
          clearTimeout(disconnectTimeouts.get(playerToken)!);
          disconnectTimeouts.delete(playerToken);
        }

        const roomWithMeta = await buildRoomWithMeta(roomId);
        io.to(roomId).emit("roomUpdated", roomWithMeta);
      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Join failed");
      }
    });

    // Select Seat
    socket.on("selectSeat", async ({ roomId, playerToken, seatNumber }) => {
      try {
        await roomService.selectSeat(roomId, playerToken, seatNumber);
        const roomWithMeta = await buildRoomWithMeta(roomId);
        io.to(roomId).emit("roomUpdated", roomWithMeta);
      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Seat selection failed");
      }
    });

    // Unseat
    socket.on("unseatPlayer", async ({ roomId, playerToken }) => {
      try {
        await roomService.unseatPlayer(roomId, playerToken);
        const roomWithMeta = await buildRoomWithMeta(roomId);
        io.to(roomId).emit("roomUpdated", roomWithMeta);
      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Unseat failed");
      }
    });

    // Start Game
    socket.on("startGame", async ({ roomId, playerToken }) => {
      try {
        const { room, session, cardHands } = await roomService.startGame(roomId, playerToken);

        // ดึง deck_count จาก DeckState
        const deckStateAfterStart = await prisma.deckState.findUnique({
          where: { session_id: session.session_id },
        });

        const roomWithHandCount = {
          ...room,
          current_turn_player_id: session.current_turn_player_id,
          deck_count: deckStateAfterStart?.cards_remaining ?? 0,
          players: room.players.map((p: any) => {
            const hand = cardHands?.find((h: any) => h.player_id === p.player_id);
            return { ...p, hand_count: hand?.card_count ?? 0 };
          }),
        };

        io.to(roomId).emit("roomUpdated", roomWithHandCount);
        io.to(roomId).emit("gameStarted", {
          room: roomWithHandCount,
          session_id: session.session_id,
          first_turn_player_id: session.current_turn_player_id,
          cardHands,
        });
      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Failed to start game");
      }
    });

    // Play Card
    socket.on("playCard", async ({ roomId, playerToken, cardCode, targetPlayerToken }) => {
      try {
        const result = await gameService.playCard(roomId, playerToken, cardCode, targetPlayerToken);

        // ดึง session + hands หลังเล่นไพ่
        const session = await prisma.gameSession.findFirst({
          where: { room_id: roomId, status: "IN_PROGRESS" },
          orderBy: { start_time: "desc" },
          include: { hands: true },
        });

        const player = await prisma.player.findFirst({
          where: { room_id: roomId, player_token: playerToken },
        });
        const myHand = session?.hands.find((h: any) => h.player_id === player?.player_id);

        const deckStateAfterPlay = session
          ? await prisma.deckState.findUnique({ where: { session_id: session.session_id } })
          : null;

        // broadcast การ์ดที่เล่นพร้อม hand ที่อัปเดต
        io.to(roomId).emit("cardPlayed", {
          ...result,
          cardCode,
          playedByPlayerId: player?.player_id,
          playedByDisplayName: player?.display_name,
          hand: myHand ? { cards: myHand.cards, card_count: myHand.card_count } : null,
        });

        // roomUpdated พร้อม deck_count และ hand_count
        const roomMeta = await buildRoomWithMeta(roomId);
        io.to(roomId).emit("roomUpdated", roomMeta);

      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Failed to play card");
      }
    });

    // Draw Card
    socket.on("drawCard", async ({ roomId, playerToken }) => {
      try {
        const result = await gameService.drawCard(roomId, playerToken);

        // ดึง session + hands หลังจั่วแล้ว
        const session = await prisma.gameSession.findFirst({
          where: { room_id: roomId, status: "IN_PROGRESS" },
          orderBy: { start_time: "desc" },
          include: { hands: true },
        });

        // หา hand ของผู้เล่นที่เพิ่งจั่ว
        const player = await prisma.player.findFirst({
          where: { room_id: roomId, player_token: playerToken },
        });
        const myHand = session?.hands.find((h: any) => h.player_id === player?.player_id);

        // ส่ง cardDrawn พร้อม hand ของผู้เล่นที่จั่ว
        io.to(roomId).emit("cardDrawn", {
          ...result,
          hand: myHand ? { cards: myHand.cards, card_count: myHand.card_count } : null,
          drawnByPlayerId: player?.player_id,
        });

        const updatedRoom = await buildRoomWithMeta(roomId);
        io.to(roomId).emit("roomUpdated", updatedRoom);
      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Failed to draw card");
      }
    });

    // Leave Room / Disconnect Logic
    socket.on("disconnect", async () => {
      console.log("Disconnected:", socket.id);
      try {
        const { roomId, playerToken } = socket.data;

        if (roomId && playerToken) {
          if (disconnectTimeouts.has(playerToken)) {
            clearTimeout(disconnectTimeouts.get(playerToken)!);
          }

          const timeoutId = setTimeout(async () => {
            try {
              const updatedRoom = await roomService.leaveRoom(roomId, playerToken);
              if (updatedRoom) {
                io.to(roomId).emit("roomUpdated", updatedRoom);
              } else {
                io.to(roomId).emit("roomDeleted");
              }
            } catch (err) {
              console.error("Leave room error during disconnect timeout:", err);
            } finally {
              disconnectTimeouts.delete(playerToken);
            }
          }, 60000);

          disconnectTimeouts.set(playerToken, timeoutId);
        }
      } catch (err) {
        console.error("Disconnect error:", err);
      }
    });

  });
};