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

        const result = await gameService.playCard(
          roomId,
          playerToken,
          cardCode,
          targetPlayerToken,
        );

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

        // Defuse result is public (everyone knows EK was defused)
        io.to(roomId).emit("cardDefused", result);
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
