// ============================================================
// Game Socket Handler — Game-related events only
// ============================================================
// AI Rule 2.1: Socket Handlers MUST NOT contain business logic.
// AI Rule 2.3: NEVER broadcast full GameState. Sanitize before emit.

import { Server, Socket } from "socket.io";
import { gameService } from "../services/game.service";
import { roomService } from "../services/room.service";
import { CardHand } from "@prisma/client";
import {
  StartGamePayload,
  DrawCardPayload,
  PlayCardPayload,
  DefuseCardPayload,
  InsertEKPayload,
  EliminatePlayerPayload,
  SanitizedCardHand,
} from "../types/types";
import { getErrorMessage } from "../utils/errors";

/**
 * Sanitize card hands for anti-cheat (NFR-03, AI Rule 2.3).
 * Each player only sees their own cards; others see empty array + card_count.
 */
function sanitizeCardHands(
  cardHands: CardHand[],
  viewerPlayerId: string | undefined,
): SanitizedCardHand[] {
  return cardHands.map((hand) => {
    if (viewerPlayerId && hand.player_id === viewerPlayerId) {
      return {
        ...hand,
        cards: (hand.cards ?? []) as string[],
      }; // Owner sees their own cards
    }
    return {
      ...hand,
      cards: [], // Hide cards for anti-cheat
    };
  });
}

export const registerGameSocket = (io: Server): void => {
  io.on("connection", (socket: Socket) => {
    // ── Start Game (S2-10) ─────────────────────────────────────
    socket.on("startGame", async (payload: StartGamePayload) => {
      try {
        const { roomId, playerToken } = payload;

        const { room, session, cardHands, deckState } =
          await gameService.startGame(roomId, playerToken);

        // Broadcast room status change to everyone
        io.to(roomId).emit("roomUpdated", room);

        // Send individualized game data (anti-cheat: NFR-03)
        const sockets = await io.in(roomId).fetchSockets();

        for (const s of sockets) {
          const sToken = s.data.playerToken as string | undefined;
          const player = room.players.find((p) => p.player_token === sToken);

          const sanitizedHands = sanitizeCardHands(
            cardHands,
            player?.player_id,
          );

          s.emit("gameStarted", {
            room,
            session_id: session.session_id,
            first_turn_player_id: session.current_turn_player_id,
            cardHands: sanitizedHands,
            deck_count: deckState?.cards_remaining,
          });
        }

        // Notify lobby that room status changed
        io.emit("roomListUpdated");
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    // ── Play Card (S2-18) ──────────────────────────────────────
    socket.on("playCard", async (payload: PlayCardPayload) => {
      try {
        const { roomId, playerToken, cardCode, targetPlayerToken } = payload;

        // S3-03: Broadcast action pending for Nope window
        io.to(roomId).emit("actionPending", {
          message: `Waiting 3 seconds for Nope...`,
          cardCode
        });

        setTimeout(async () => {
          try {
            const result = await gameService.playCard(
              roomId,
              playerToken,
              cardCode,
              targetPlayerToken,
            );

            // Favor Event
            if (result.effect?.type === "FAVOR_PENDING") {
              const favorData = {
                requesterPlayerId: result.effect.requesterId as string,
                requesterName: result.effect.requesterDisplayName as string,
                targetPlayerId: result.effect.targetPlayerId as string,
              };
              
              socket.emit("cardPlayed", result);
              socket.to(roomId).emit("cardPlayed", result);
              io.to(roomId).emit("favorRequested", favorData);
              return;
            }

            // Broadcast card played event to room
            // Note: See The Future top cards are private (FR-05)
            if (result.effect?.type === "SEE_THE_FUTURE") {
              // Private: send top cards only to the playing player
              socket.emit("cardPlayed", result);

              // Public: broadcast without top cards
              const publicResult = {
                ...result,
                effect: { type: "SEE_THE_FUTURE" },
              };
              socket.to(roomId).emit("cardPlayed", publicResult);
            } else {
              // Public broadcast for AT, SK, SH
              io.to(roomId).emit("cardPlayed", result);
            }
          } catch (err: unknown) {
            socket.emit("errorMessage", getErrorMessage(err));
          }
        }, 3000);
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    // ── Favor Pick Card ────────────────────────────────────────
    socket.on("favorPickCard", async (payload: { roomId: string, playerToken: string, cardCode: string, requesterPlayerId: string }) => {
      try {
        const { roomId, playerToken, cardCode } = payload;

        const result = await gameService.favorResponse(
          roomId,
          playerToken,
          cardCode
        );

        io.to(roomId).emit("favorCompleted", {
          nextTurn: result.nextTurn,
          cardCode: result.transferredCard,
          requesterPlayerId: result.requesterPlayerId
        });
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    // ── Draw Card (S2-20) ──────────────────────────────────────
    socket.on("drawCard", async (payload: DrawCardPayload) => {
      try {
        const { roomId, playerToken, isAutoDraw } = payload;

        const result = await gameService.drawCard(
          roomId,
          playerToken,
          isAutoDraw ?? false,
        );

        // Anti-cheat: drawn card is private (NFR-03)
        if (result.action === "DREW_EXPLODING_KITTEN") {
          // EK drawn is public knowledge
          io.to(roomId).emit("cardDrawn", {
            ...result,
            isAutoDraw: isAutoDraw ?? false,
          });
        } else if (result.action === "TURN_ADVANCED") {
          // Normal draw: send drawn card privately, turn info publicly
          socket.emit("cardDrawn", {
            ...result,
            isAutoDraw: isAutoDraw ?? false,
          });
          socket.to(roomId).emit("cardDrawn", {
            ...result,
            drawnCard: undefined, // Hide from others
            isAutoDraw: isAutoDraw ?? false,
          });
        } else {
          io.to(roomId).emit("cardDrawn", {
            ...result,
            isAutoDraw: isAutoDraw ?? false,
          });
        }

        // After an auto-draw, broadcast the full room state so all clients
        // see the updated afk_count (and is_alive=false if the player was AFK-kicked).
        if (isAutoDraw) {
          const updatedRoom = await roomService.getRoomById(roomId);
          io.to(roomId).emit("roomUpdated", updatedRoom);
        }
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    // ── Defuse Card ────────────────────────────────────────────
    socket.on("defuseCard", async (payload: DefuseCardPayload) => {
      try {
        const { roomId, playerToken } = payload;
        const result = await gameService.defuseCard(roomId, playerToken);
        // Public: everyone knows the EK was defused; player still needs to choose insert position
        io.to(roomId).emit("cardDefused", result);
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    // ── Insert EK (Phase 2 of defuse) ──────────────────────────
    socket.on("insertEK", async (payload: InsertEKPayload) => {
      try {
        const { roomId, playerToken, position } = payload;
        const result = await gameService.insertEK(
          roomId,
          playerToken,
          position,
        );
        io.to(roomId).emit("ekInserted", result);
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    // ── Eliminate Player ───────────────────────────────────────
    socket.on("eliminatePlayer", async (payload: EliminatePlayerPayload) => {
      try {
        const { roomId, playerToken } = payload;

        const result = await gameService.eliminatePlayer(roomId, playerToken);

        io.to(roomId).emit("playerEliminated", result);

        // If game over, also notify about room reset
        if (result.action === "GAME_OVER") {
          const updatedRoom = await roomService.getRoomById(roomId);
          io.to(roomId).emit("roomUpdated", updatedRoom);
          io.emit("roomListUpdated");
        }
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });
  });
};
