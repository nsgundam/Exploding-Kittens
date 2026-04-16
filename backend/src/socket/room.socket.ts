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
import { gameService } from "../services/game.service";
import { sanitizeCardHands } from "../utils/sanitizers";

const disconnectTimeouts = new Map<string, NodeJS.Timeout>();
const hostMigrationTimeouts = new Map<string, NodeJS.Timeout>();

export const registerRoomSocket = (io: Server): void => {
  io.on("connection", (socket: Socket) => {

    // ── Join Room ──────────────────────────────────────────────
    socket.on("joinRoom", async (payload: JoinRoomPayload) => {
      try {
        const { roomId, playerToken, displayName, profilePicture } = payload;

        await roomService.joinRoom(roomId, playerToken, displayName, profilePicture);
        await roomService.setPlayerActive(roomId, playerToken, true);

        socket.data.playerToken = playerToken;
        socket.data.roomId = roomId;
        socket.join(roomId);

        const updatedRoom = await roomService.getRoomById(roomId);

        // Cancel pending disconnect timeout on reconnect (FR-09-3)
        if (disconnectTimeouts.has(playerToken)) {
          clearTimeout(disconnectTimeouts.get(playerToken)!);
          disconnectTimeouts.delete(playerToken);
          // Emit reconnect event only if the game is actively playing
          if (updatedRoom?.status === "PLAYING") {
            io.to(roomId).emit("playerReconnected", { playerToken, displayName });
          }
        }

        // Cancel pending host migration on reconnect — they stay as host
        if (hostMigrationTimeouts.has(playerToken)) {
          clearTimeout(hostMigrationTimeouts.get(playerToken)!);
          hostMigrationTimeouts.delete(playerToken);
        }

        io.to(roomId).emit("roomUpdated", updatedRoom);

        if (updatedRoom?.status === "PLAYING") {
          const state = await gameService.getReconnectionState(roomId, playerToken);
          if (state) {
            const player = updatedRoom.players.find((p: any) => p.player_token === playerToken);
            const sanitizedHands = sanitizeCardHands(state.cardHands, player?.player_id);

            const elapsed = state.session.turn_start_timestamp 
              ? Math.floor((Date.now() - state.session.turn_start_timestamp.getTime()) / 1000) 
              : 0;
            const remaining_time = Math.max(0, 30 - elapsed);

            socket.emit("gameStarted", {
              room: updatedRoom,
              session_id: state.session.session_id,
              first_turn_player_id: state.session.current_turn_player_id,
              cardHands: sanitizedHands,
              deck_count: state.deckState?.cards_remaining,
              remaining_time,
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

        const { room: updatedRoom, gameEvents } = await roomService.leaveRoom(roomId, playerToken);

        if (gameEvents && gameEvents.length > 0) {
          gameEvents.forEach((evt) => {
            io.to(roomId).emit(evt.eventName, evt.payload);
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

          // Notify other players about disconnect
          io.to(roomId).emit("playerDisconnected", { playerToken });
          
          // Mark as inactive in DB
          await roomService.setPlayerActive(roomId, playerToken, false);

          // ── โอน Host หลัง 30 วิ (= 1 Turn) ถ้าไม่กลับมา ──
          // ถ้ากลับมาทันก็ยกเลิก Timeout → ยังเป็น Host อยู่
          if (!hostMigrationTimeouts.has(playerToken)) {
            const hostTimeout = setTimeout(async () => {
              try {
                const migrated = await roomService.migrateHostOnDisconnect(roomId, playerToken);
                if (migrated) {
                  io.to(roomId).emit("hostMigrated", migrated);
                  const updatedRoom = await roomService.getRoomById(roomId);
                  if (updatedRoom) io.to(roomId).emit("roomUpdated", updatedRoom);
                }
              } catch (err) {
                console.error("Host migration error:", err);
              } finally {
                hostMigrationTimeouts.delete(playerToken);
              }
            }, 30000); // 30 วิ = 1 Turn
            hostMigrationTimeouts.set(playerToken, hostTimeout);
          }

          let isPlaying = false;
          try {
            const currentRoom = await roomService.getRoomById(roomId);
            isPlaying = currentRoom.status === "PLAYING";
          } catch (e) {
            // Room might be deleted or not found
          }

          if (!isPlaying) {
            // ── ถ้ายังไม่เริ่มเกม (ห้อง Waiting) ค่อย Eliminate ถ้าไม่กลับมา ──
            const timeoutId = setTimeout(async () => {
              try {
                const { room: updatedRoom, gameEvents } = await roomService.leaveRoom(roomId, playerToken);

                if (gameEvents && gameEvents.length > 0) {
                  gameEvents.forEach((evt) => {
                    io.to(roomId).emit(evt.eventName, evt.payload);
                  });
                }

                if (updatedRoom) {
                  io.to(roomId).emit("roomUpdated", updatedRoom);
                } else {
                  io.to(roomId).emit("roomDeleted");
                }
                io.emit("roomListUpdated");
              } catch (err) {
                console.error("Leave room error during disconnect timeout:", err);
              } finally {
                disconnectTimeouts.delete(playerToken);
              }
            }, 30000); // 30 วิ = รอให้จัดการในหน้าล็อบบี้

            disconnectTimeouts.set(playerToken, timeoutId);
          }
          // ถ้าเกมเริ่มแล้ว (PLAYING) จะไม่เตะออกทันที ปล่อยให้ระบบ AFK จัดการเองตาม Turn
        }
      } catch (err) {
        console.error("Disconnect error:", err);
      }
    });

  });
};
