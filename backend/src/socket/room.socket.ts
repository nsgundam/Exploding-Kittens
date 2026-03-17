import { Server, Socket } from "socket.io";
import { roomService } from "../services/room.service";
import { gameService } from "../services/game.service";
import { prisma } from "../config/prisma";

const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

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

        const updatedRoom = await roomService.getRoomById(roomId);
        io.to(roomId).emit("roomUpdated", updatedRoom);
      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Join failed");
      }
    });

    // Select Seat
    socket.on("selectSeat", async ({ roomId, playerToken, seatNumber }) => {
      try {
        await roomService.selectSeat(roomId, playerToken, seatNumber);
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

        // แนบ hand_count เข้าแต่ละ player ตั้งแต่เริ่มเกม
        const roomWithHandCount = {
          ...room,
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
        io.to(roomId).emit("cardPlayed", result);
      } catch (err: any) {
        socket.emit("errorMessage", err.message || "Failed to play card");
      }
    });

    // Draw Card
    socket.on("drawCard", async ({ roomId, playerToken }) => {
      try {
        const result = await gameService.drawCard(roomId, playerToken);
        io.to(roomId).emit("cardDrawn", result);

        // ดึง session + hands มาแนบ hand_count ให้ทุก player
        const session = await prisma.gameSession.findFirst({
          where: { room_id: roomId, status: "IN_PROGRESS" },
          orderBy: { start_time: "desc" },
          include: { hands: true },
        });

        const updatedRoom = await roomService.getRoomById(roomId);

        const roomWithHandCount = {
          ...updatedRoom,
          players: updatedRoom.players.map((p: any) => {
            const hand = session?.hands.find((h: any) => h.player_id === p.player_id);
            return { ...p, hand_count: hand?.card_count ?? 0 };
          }),
        };

        io.to(roomId).emit("roomUpdated", roomWithHandCount);
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