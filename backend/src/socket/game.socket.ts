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

    // ── Play Card (S2-18) ──────────────────────────────────────
    socket.on("playCard", async (payload: PlayCardPayload) => {
      try {
        const { roomId, playerToken, cardCode, targetPlayerToken } = payload;

        const result = await gameService.playCard(
          roomId,
          playerToken,
          cardCode,
          targetPlayerToken
        );

        if (result.effect?.type === "SEE_THE_FUTURE") {
          socket.emit("cardPlayed", result);
          socket.to(roomId).emit("cardPlayed", { ...result, effect: { type: "SEE_THE_FUTURE" } });

        } else if (result.effect?.type === "FAVOR") {
          const effect = result.effect as {
            type: string;
            targetPlayerId: string;
            targetDisplayName: string;
            availableCards: string[];
          };

          // Broadcast cardPlayed ให้ทุกคนรู้ (ไม่แสดง availableCards)
          io.to(roomId).emit("cardPlayed", {
            ...result,
            effect: {
              type: "FAVOR",
              targetPlayerId: effect.targetPlayerId,
              targetDisplayName: effect.targetDisplayName,
            },
          });

          // ── ส่ง favorRequested ไปหา target ──
          // วิธี 1: หา socket ที่ match player_token
          const sockets = await io.in(roomId).fetchSockets();
          const targetPlayer = await gameService.getPlayerByToken(roomId, targetPlayerToken!);

          console.log("🤝 FAVOR — targetPlayerToken:", targetPlayerToken);
          console.log("🤝 FAVOR — targetPlayer found:", targetPlayer?.display_name);
          console.log("🤝 FAVOR — sockets:", sockets.map(s => ({ id: s.id, token: s.data.playerToken, roomId: s.data.roomId })));

          const favorPayload = {
            requesterPlayerId: result.playedBy,
            requesterName: result.playedByDisplayName,
            availableCards: effect.availableCards,
          };

          let sent = false;
          for (const s of sockets) {
            const sToken = s.data.playerToken as string | undefined;
            // Match ด้วย playerToken หรือ targetPlayerId ที่ set ไว้ใน socket.data
            if (
              (sToken && targetPlayer && sToken === targetPlayer.player_token) ||
              (s.data.playerId && s.data.playerId === effect.targetPlayerId)
            ) {
              console.log("🤝 FAVOR — sending favorRequested to:", s.id);
              s.emit("favorRequested", favorPayload);
              sent = true;
            }
          }

          // วิธี 2 fallback: ถ้าหา socket ไม่เจอ (token ไม่ match)
          // emit ผ่าน targetPlayerId room — frontend กรอง player_id เอง
          if (!sent) {
            console.warn("🤝 FAVOR — no matching socket found, broadcasting favorRequested to room");
            io.to(roomId).emit("favorRequestedBroadcast", {
              ...favorPayload,
              targetPlayerId: effect.targetPlayerId,
            });
          }

        } else {
          io.to(roomId).emit("cardPlayed", result);
        }
      } catch (err: unknown) {
        socket.emit("errorMessage", getErrorMessage(err));
      }
    });

    // ── Play Combo (Cat Combo 2-card / 3-card) ─────────────────
    socket.on("playCombo", async (payload: PlayComboPayload) => {
      try {
        const { roomId, playerToken, comboCards, targetPlayerToken, demandedCard } = payload;

        const result = await gameService.comboCard(
          roomId,
          playerToken,
          comboCards,
          targetPlayerToken,
          demandedCard,
        );

        // stolenCard เป็น private — ส่งเต็มให้แค่คนขโมย
        const publicResult = { ...result, stolenCard: undefined };

        socket.emit("comboPlayed", result);
        socket.to(roomId).emit("comboPlayed", publicResult);

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