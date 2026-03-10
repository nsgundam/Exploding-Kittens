import { Server, Socket } from "socket.io";
import { roomService } from "../services/room.service";
import { gameService } from "../services/game.service";

const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

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
        // Assume roomService.startGame updates the room status to PLAYING
        const updatedRoom = await roomService.startGame(roomId, playerToken);

        io.to(roomId).emit("roomUpdated", updatedRoom);
        io.to(roomId).emit("gameStarted", updatedRoom);
      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Failed to start game");
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