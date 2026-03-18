import { Server, Socket } from "socket.io";
import { roomService } from "../services/room.service";
import { gameService } from "../services/game.service";

import { CardHand } from "@prisma/client";

const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

const sanitizeCardHands = (cardHands: CardHand[], playerId: string | undefined) => {
  return cardHands.map(hand => {
    if (playerId && hand.player_id === playerId) {
      return hand; // Can see own cards
    }
    return { ...hand, cards: [] }; // Hide cards of others, keep card_count
  });
};

export const registerRoomSocket = (io: Server) => {

  io.on("connection", (socket: Socket) => {
    console.log("Connected:", socket.id);

    // Join Room
    socket.on("joinRoom", async ({ roomId, playerToken, displayName }) => {
      try {
        await roomService.joinRoom(
          roomId,
          playerToken,
          displayName
        );

        socket.data.playerToken = playerToken;
        socket.data.roomId = roomId;

        socket.join(roomId);

        // Cancel pending disconnect removal if the user reconnected
        if (disconnectTimeouts.has(playerToken)) {
          clearTimeout(disconnectTimeouts.get(playerToken)!);
          disconnectTimeouts.delete(playerToken);
        }

        const updatedRoom = await roomService.getRoomById(roomId);
        io.to(roomId).emit("roomUpdated", updatedRoom);

      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Join failed");
      }
    });

    // Select Seat
    socket.on("selectSeat", async ({ roomId, playerToken, seatNumber }) => {
      try {
        await roomService.selectSeat(
          roomId,
          playerToken,
          seatNumber
        );

        const updatedRoom = await roomService.getRoomById(roomId);
        io.to(roomId).emit("roomUpdated", updatedRoom);

      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Seat selection failed");
      }
    });

    // Unseat
    socket.on("unseatPlayer", async ({ roomId, playerToken }) => {
      try {
        await roomService.unseatPlayer(roomId, playerToken);
        const updatedRoom = await roomService.getRoomById(roomId);
        io.to(roomId).emit("roomUpdated", updatedRoom);
      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Unseat failed");
      }
    });

    // Start Game
    socket.on("startGame", async ({ roomId, playerToken }) => {
      try {
        const { room, session, cardHands } = await roomService.startGame(roomId, playerToken);

        // broadcast ห้องที่อัปเดตแล้วให้ทุกคนในห้อง
        io.to(roomId).emit("roomUpdated", room);

        // Fetch all connected sockets in the room
        const sockets = await io.in(roomId).fetchSockets();

        for (const s of sockets) {
          const sToken = s.data.playerToken;
          const player = room.players.find(p => p.player_token === sToken);

          // Sanitize card hands for Anti-Cheat
          const sanitizedHands = sanitizeCardHands(cardHands, player?.player_id);

          // Send individualized payload
          s.emit("gameStarted", {
            room,
            session_id: session.session_id,
            first_turn_player_id: session.current_turn_player_id,
            cardHands: sanitizedHands
          });
        }
      } catch (err: unknown) {
        socket.emit("errorMessage", err instanceof Error ? err.message : "Failed to start game");
      }
    });

    // Play Card
    socket.on("playCard", async ({ roomId, playerToken, cardCode, targetPlayerToken }) => {
      try {
        const result = await gameService.playCard(roomId, playerToken, cardCode, targetPlayerToken);
        io.to(roomId).emit("cardPlayed", result);
        // Note: Real implementation will likely broadcast full room state
        // via roomUpdated depending on the card effect.
      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Failed to play card");
      }
    });

    // Draw Card
    socket.on("drawCard", async ({ roomId, playerToken }) => {
      try {
        const result = await gameService.drawCard(roomId, playerToken);
        io.to(roomId).emit("cardDrawn", result);
        // Note: Real implementation will likely broadcast full room state
        // via roomUpdated after turn changes.
      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Failed to draw card");
      }
    });

    // Leave Room / Disconnect Logic
    // Allow a 30-second grace period for reconnections
    socket.on("disconnect", async () => {
      console.log("Disconnected:", socket.id);
      try {
        const { roomId, playerToken } = socket.data;

        if (roomId && playerToken) {
          // Clear any existing timeout for this player to avoid race conditions
          if (disconnectTimeouts.has(playerToken)) {
            clearTimeout(disconnectTimeouts.get(playerToken)!);
          }

          // Delay the leave mapping for 30 seconds
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