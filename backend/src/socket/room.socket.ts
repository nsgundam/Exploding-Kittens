import { Server, Socket } from "socket.io";
import { roomService } from "../services/room.service";

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