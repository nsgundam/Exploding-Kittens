// ============================================================
// Room Socket Handler — Room-related events only
// ============================================================
// AI Rule 2.1: Socket Handlers MUST NOT contain business logic.
// They extract params and delegate to the Service layer.

import { Server, Socket } from "socket.io";
import { roomService } from "../services/room.service";
import {
  JoinRoomPayload,
  SelectSeatPayload,
  UnseatPlayerPayload,
  UpdateDeckConfigPayload,
} from "../types/types";
import { getErrorMessage } from "../utils/errors";
import { prisma } from "../config/prisma";

const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

export const registerRoomSocket = (io: Server): void => {
  io.on("connection", (socket: Socket) => {

    // ── Join Room ──────────────────────────────────────────────
    socket.on("joinRoom", async (payload: JoinRoomPayload) => {
      try {
        const { roomId, playerToken, displayName } = payload;

        await roomService.joinRoom(roomId, playerToken, displayName);

        socket.data.playerToken = playerToken;
        socket.data.roomId = roomId;
        socket.join(roomId);

        // Cancel pending disconnect timeout on reconnect (FR-09-3)
        if (disconnectTimeouts.has(playerToken)) {
          clearTimeout(disconnectTimeouts.get(playerToken)!);
          disconnectTimeouts.delete(playerToken);
        }

        const updatedRoom = await roomService.getRoomById(roomId);
        io.to(roomId).emit("roomUpdated", updatedRoom);

        if (updatedRoom?.status === "PLAYING") {
          const session = await prisma.gameSession.findFirst({
            where: { room_id: roomId, status: "IN_PROGRESS" }
          });
          if (session) {
            const cardHands = await prisma.cardHand.findMany({
              where: { session_id: session.session_id }
            });
            const deckState = await prisma.deckState.findUnique({
              where: { session_id: session.session_id }
            });
            const player = updatedRoom.players.find(p => p.player_token === playerToken);
            
            const sanitizedHands = cardHands.map((hand: any) => {
              if (player && hand.player_id === player.player_id) {
                return { ...hand, cards: (hand.cards ?? []) as string[] };
              }
              return { ...hand, cards: [] };
            });

            socket.emit("gameStarted", {
              room: updatedRoom,
              session_id: session.session_id,
              first_turn_player_id: session.current_turn_player_id,
              cardHands: sanitizedHands,
              deck_count: deckState?.cards_remaining,
            });
          }
        }
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    // ── Select Seat ────────────────────────────────────────────
    socket.on("selectSeat", async (payload: SelectSeatPayload) => {
      try {
        const { roomId, playerToken, seatNumber } = payload;

        await roomService.selectSeat(roomId, playerToken, seatNumber);

        const updatedRoom = await roomService.getRoomById(roomId);
        io.to(roomId).emit("roomUpdated", updatedRoom);
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    // ── Unseat Player ──────────────────────────────────────────
    socket.on("unseatPlayer", async (payload: UnseatPlayerPayload) => {
      try {
        const { roomId, playerToken } = payload;

        await roomService.unseatPlayer(roomId, playerToken);

        const updatedRoom = await roomService.getRoomById(roomId);
        io.to(roomId).emit("roomUpdated", updatedRoom);
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    // ── Update Deck Config (S2-04) ─────────────────────────────
    socket.on("updateDeckConfig", async (payload: UpdateDeckConfigPayload) => {
      try {
        const { roomId, playerToken, cardVersion, expansions } = payload;

        const updatedRoom = await roomService.updateDeckConfig(roomId, playerToken, {
          cardVersion,
          expansions,
        });

        // FR-03-5: broadcast config change to all players in room
        io.to(roomId).emit("deckConfigUpdated", updatedRoom);
        io.to(roomId).emit("roomUpdated", updatedRoom);
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    socket.on("leaveRoom", async (payload: { roomId: string; playerToken: string }) => {
      try {
        const { roomId, playerToken } = payload;

        io.to(roomId).emit("playerDisconnected", { playerToken });

        const { room: updatedRoom, gameOver } = await roomService.leaveRoom(roomId, playerToken);

        if (gameOver) {
          io.to(roomId).emit("playerEliminated", {
            action: "GAME_OVER",
            winner: gameOver.winner,
          });
        }

        if (updatedRoom) {
          io.to(roomId).emit("roomUpdated", updatedRoom);
        } else {
          io.to(roomId).emit("roomDeleted");
        }
        // Broadcast lobby update for real-time room list (S1-24)
        io.emit("roomListUpdated");
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    // ── Disconnect / Reconnect Logic ───────────────────────────
    // FR-09-1/2: Hold state for 60 seconds, allow reconnect
    socket.on("disconnect", async () => {
      try {
        const { roomId, playerToken } = socket.data as {
          roomId?: string;
          playerToken?: string;
        };

        if (roomId && playerToken) {
          // Clear any existing timeout to avoid race conditions
          if (disconnectTimeouts.has(playerToken)) {
            clearTimeout(disconnectTimeouts.get(playerToken)!);
          }

          // FR-09-5: Notify other players about disconnect
          io.to(roomId).emit("playerDisconnected", { playerToken });

          // FR-09-2: Delay removal by 60 seconds
          const timeoutId = setTimeout(async () => {
            try {
              const { room: updatedRoom, gameOver } = await roomService.leaveRoom(roomId, playerToken);

              if (gameOver) {
                io.to(roomId).emit("playerEliminated", {
                  action: "GAME_OVER",
                  winner: gameOver.winner,
                });
              }

              if (updatedRoom) {
                io.to(roomId).emit("roomUpdated", updatedRoom);
              } else {
                io.to(roomId).emit("roomDeleted");
              }
              // Broadcast lobby update for real-time room list (S1-24)
              io.emit("roomListUpdated");
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