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
  PlayComboPayload,
} from "../types/types";
import { getErrorMessage } from "../utils/errors";

/**
 * Sanitize card hands for anti-cheat (NFR-03, AI Rule 2.3).
 * Each player only sees their own cards; others see empty array + card_count.
 */
function sanitizeCardHands(
  cardHands: CardHand[],
  viewerPlayerId: string | undefined
): SanitizedCardHand[] {
  return cardHands.map((hand) => {
    if (viewerPlayerId && hand.player_id === viewerPlayerId) {
      return {
        ...hand,
        cards: (hand.cards ?? []) as string[],
      };
    }
    return {
      ...hand,
      cards: [],
    };
  });
}

export const registerGameSocket = (io: Server): void => {
  io.on("connection", (socket: Socket) => {

    // ── Start Game (S2-10) ─────────────────────────────────────
    socket.on("startGame", async (payload: StartGamePayload) => {
      try {
        const { roomId, playerToken } = payload;

        const { room, session, cardHands, deckState } = await gameService.startGame(
          roomId,
          playerToken
        );

        io.to(roomId).emit("roomUpdated", room);

        const sockets = await io.in(roomId).fetchSockets();
        for (const s of sockets) {
          const sToken = s.data.playerToken as string | undefined;
          const player = room.players.find((p) => p.player_token === sToken);
          const sanitizedHands = sanitizeCardHands(cardHands, player?.player_id);
          s.emit("gameStarted", {
            room,
            session_id: session.session_id,
            first_turn_player_id: session.current_turn_player_id,
            cardHands: sanitizedHands,
            deck_count: deckState?.cards_remaining,
          });
        }

        io.emit("roomListUpdated");
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    const handleBroadcastPlayedCard = async (roomId: string, payloadPlayerToken: string, result: any) => {
      if (result.effect?.type === "SEE_THE_FUTURE") {
        const sockets = await io.in(roomId).fetchSockets();
        const s = sockets.find(so => so.data.playerToken === payloadPlayerToken);
        if (s) s.emit("cardPlayed", result);
        io.to(roomId).except(s?.id || "").emit("cardPlayed", { ...result, effect: { type: "SEE_THE_FUTURE" } });

      } else if (result.effect?.type === "FAVOR") {
        const effect = result.effect as {
          type: string;
          targetPlayerId: string;
          targetDisplayName: string;
          availableCards: string[];
        };

        io.to(roomId).emit("cardPlayed", {
          ...result,
          effect: {
            type: "FAVOR",
            targetPlayerId: effect.targetPlayerId,
            targetDisplayName: effect.targetDisplayName,
          },
        });

        const sockets = await io.in(roomId).fetchSockets();
        const targetPlayerToken = result.target;
        const targetPlayer = await gameService.getPlayerByToken(roomId, targetPlayerToken!);

        const favorPayload = {
          requesterPlayerId: result.playedBy,
          requesterName: result.playedByDisplayName,
          availableCards: effect.availableCards,
        };

        let sent = false;
        for (const s of sockets) {
          const sToken = s.data.playerToken as string | undefined;
          if (
            (sToken && targetPlayer && sToken === targetPlayer.player_token) ||
            (s.data.playerId && s.data.playerId === effect.targetPlayerId)
          ) {
            s.emit("favorRequested", favorPayload);
            sent = true;
          }
        }

        if (!sent) {
          io.to(roomId).emit("favorRequestedBroadcast", {
            ...favorPayload,
            targetPlayerId: effect.targetPlayerId,
          });
        }
      } else {
        io.to(roomId).emit("cardPlayed", result);
      }
    };

    const handleBroadcastComboPlayed = async (roomId: string, socketIdOrNull: string | null, payloadPlayerToken: string, targetPlayerToken: string, result: any) => {
      const publicResult = {
        ...result,
        stolenCard: undefined,
        thiefHand: undefined,
        targetHand: undefined,
        robbedFromToken: undefined,
      };

      const sockets = await io.in(roomId).fetchSockets();
      const thiefSocket = sockets.find(s => s.data.playerToken === payloadPlayerToken);
      if (thiefSocket) {
        thiefSocket.emit("comboPlayed", { ...result, targetHand: undefined, robbedFromToken: undefined });
      }

      const targetPlayer = await gameService.getPlayerByToken(roomId, targetPlayerToken);
      for (const s of sockets) {
        const sToken = s.data.playerToken as string | undefined;
        if (sToken && targetPlayer && sToken === targetPlayer.player_token) {
          s.emit("comboPlayed", {
            ...publicResult,
            targetHand: result.targetHand,
          });
        }
      }

      const excludedIds = [];
      if (thiefSocket) excludedIds.push(thiefSocket.id);
      const ttSocket = sockets.find(s => s.data.playerToken === targetPlayerToken);
      if (ttSocket) excludedIds.push(ttSocket.id);

      io.to(roomId).except(excludedIds).emit("comboPlayed", publicResult);
    };

    const scheduleResolvePendingAction = (roomId: string, payloadPlayerToken: string, targetPlayerToken: string | undefined) => {
      setTimeout(async () => {
        try {
          const res = await gameService.resolvePendingAction(roomId);
          if (res.success) {
            if (res.action === "ACTION_CANCELLED") {
              io.to(roomId).emit("actionCancelled", res);
            } else if (res.action === "CARD_PLAYED") {
              await handleBroadcastPlayedCard(roomId, res.playedByToken || payloadPlayerToken, res);
            } else if (res.action === "COMBO_PLAYED") {
              await handleBroadcastComboPlayed(roomId, null, res.playedByToken || payloadPlayerToken, res.robbedFromToken || targetPlayerToken!, res);
            } else if (res.action === "TURN_ADVANCED") {
              // DB card resolved and drew a normal card → broadcast like a draw
              io.to(roomId).emit("cardDrawn", res);
            } else if (res.action === "DREW_EXPLODING_KITTEN") {
              // DB card drew EK or IK → same flow as normal draw EK
              io.to(roomId).emit("cardDrawn", res);
            } else if (res.action === "GAME_OVER") {
              // DB card drew EK/IK and caused elimination → game over
              io.to(roomId).emit("playerEliminated", res);
              const updatedRoom = await roomService.getRoomById(roomId);
              io.to(roomId).emit("roomUpdated", updatedRoom);
              io.emit("roomListUpdated");
            }
          }
        } catch (err) {
          console.error("Resolve error:", err);
          io.to(roomId).emit("errorMessage", getErrorMessage(err));
        }
      }, 3000); // 3 seconds Nope window
    };


    // ── Play Card (S2-18) ──────────────────────────────────────
    socket.on("playCard", async (payload: PlayCardPayload) => {
      try {
        const { roomId, playerToken, cardCode, targetPlayerToken } = payload;
        const result = await gameService.playCard(roomId, playerToken, cardCode, targetPlayerToken);

        if (result.action === "ACTION_PENDING") {
          io.to(roomId).emit("actionPending", result);
          scheduleResolvePendingAction(roomId, playerToken, targetPlayerToken);
        } else {
          await handleBroadcastPlayedCard(roomId, playerToken, result);
        }
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    // ── Play Combo (Cat Combo 2-card / 3-card) ─────────────────
    socket.on("playCombo", async (payload: PlayComboPayload) => {
      try {
        const { roomId, playerToken, comboCards, targetPlayerToken, demandedCard } = payload;
        const result = await gameService.comboCard(roomId, playerToken, comboCards, targetPlayerToken, demandedCard);

        if (result.action === "ACTION_PENDING") {
          io.to(roomId).emit("actionPending", result);
          scheduleResolvePendingAction(roomId, playerToken, targetPlayerToken);
        } else {
          await handleBroadcastComboPlayed(roomId, socket.id, playerToken, targetPlayerToken, result);
        }
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    // ── Play Nope (Nope Window) ────────────────────────────────
    socket.on("playNope", async (payload: { roomId: string; playerToken: string }) => {
      try {
        const { roomId, playerToken } = payload;
        const result = await gameService.playNope(roomId, playerToken);
        
        io.to(roomId).emit("nopePlayed", result);
        scheduleResolvePendingAction(roomId, playerToken, undefined);
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    // ── Draw Card (S2-20) ──────────────────────────────────────
    socket.on("drawCard", async (payload: DrawCardPayload) => {
      try {
        const { roomId, playerToken, isAutoDraw } = payload;

        const result = await gameService.drawCard(roomId, playerToken, isAutoDraw ?? false);

        // AFK kick — emit playerEliminated instead of cardDrawn
        if ((result as any).isAfkKick) {
          io.to(roomId).emit("playerEliminated", result);
          if (result.action === "GAME_OVER") {
            const updatedRoom = await roomService.getRoomById(roomId);
            io.to(roomId).emit("roomUpdated", updatedRoom);
            io.emit("roomListUpdated");
          }
        } else if (result.action === "DREW_EXPLODING_KITTEN") {
          io.to(roomId).emit("cardDrawn", result);
        } else if (result.action === "TURN_ADVANCED") {
          // Normal draw
          socket.emit("cardDrawn", result);
          socket.to(roomId).emit("cardDrawn", { ...result, drawnCard: undefined });
        } else {
          io.to(roomId).emit("cardDrawn", result);
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

        if (result.action === "GAME_OVER") {
          const updatedRoom = await roomService.getRoomById(roomId);
          io.to(roomId).emit("roomUpdated", updatedRoom);
          io.emit("roomListUpdated");
        }
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    // ── Insert EK ──────────────────────────────────────────────
    socket.on("insertEK", async (payload: { roomId: string; playerToken: string; position: number }) => {
      try {
        const { roomId, playerToken, position } = payload;
        const result = await gameService.insertEK(roomId, playerToken, position);
        io.to(roomId).emit("ekInserted", result);
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    // ── Favor Pick Card ────────────────────────────────────────
    socket.on("favorPickCard", async (payload: {
      roomId: string;
      playerToken: string;
      cardCode: string;
      requesterPlayerId: string;
    }) => {
      try {
        const { roomId, playerToken, cardCode } = payload;
        const result = await gameService.favorResponse(roomId, playerToken, cardCode);
        io.to(roomId).emit("favorCompleted", {
          ...result,
          cardCode,
          requesterPlayerId: payload.requesterPlayerId,
        });
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });
  });
};