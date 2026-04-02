import { Prisma, GameSessionStatus } from "@prisma/client";
import { ActionType, CardCode } from "../constants/game";
import { prisma } from "../config/prisma";
import { NopePendingResult } from "../types/types";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { applyCardEffect } from "./effects/index";
import { advanceTurn } from "./game.turn";
import { resolveDrawFromBottom } from "./game.core";

export async function playNope(
  roomId: string,
  playerToken: string,
): Promise<NopePendingResult> {
  return await prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.findFirst({
      where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS },
    });
    if (!session) throw new NotFoundError("No active session");

    if (!session.pending_action) {
      throw new BadRequestError("No pending action to Nope");
    }

    if (
      typeof session.pending_action === "object" &&
      (session.pending_action as Record<string, unknown>)["card"] === CardCode.IMPLODING_KITTEN
    ) {
      throw new BadRequestError("Imploding Kitten cannot be Noped");
    }

    const player = await tx.player.findFirst({
      where: { room_id: roomId, player_token: playerToken, is_alive: true },
    });
    if (!player) throw new NotFoundError("Player");

    const hand = await tx.cardHand.findUnique({
      where: { player_id_session_id: { player_id: player.player_id, session_id: session.session_id } },
    });
    const cards = (hand?.cards ?? []) as string[];
    const npCode = cards.includes("GVE_NP") ? "GVE_NP" : "NP";
    if (!cards.includes(npCode))
      throw new BadRequestError("No Nope card in hand");

    let removed = false;
    const newCards = cards.filter((c) => {
      if (c === npCode && !removed) { removed = true; return false; }
      return true;
    });
    await tx.cardHand.update({
      where: { player_id_session_id: { player_id: player.player_id, session_id: session.session_id } },
      data: { cards: newCards, card_count: newCards.length },
    });

    const deckState = await tx.deckState.findUnique({ where: { session_id: session.session_id } });
    const discardPile = (deckState?.discard_pile as string[]) ?? [];
    await tx.deckState.update({
      where: { session_id: session.session_id },
      data: { discard_pile: [...discardPile, npCode] },
    });

    const newNopeCount = session.nope_count + 1;
    const isCancel = newNopeCount % 2 !== 0;

    await tx.gameSession.update({
      where: { session_id: session.session_id },
      data: {
        nope_count: newNopeCount,
        pending_action_timestamp: new Date(),
      },
    });

    await tx.gameLog.create({
      data: {
        session_id: session.session_id,
        player_id: player.player_id,
        player_display_name: player.display_name,
        action_type: "NOPE_PLAYED",
        action_details: { card: npCode, nope_count: newNopeCount, is_cancel: isCancel },
        turn_number: session.turn_number,
      },
    });

    return { success: true as const, action: "NOPE_PLAYED" as const, nopeCount: newNopeCount, isCancel, playedBy: player.player_id, playedByDisplayName: player.display_name };
  });
}

export async function resolvePendingAction(roomId: string) {
  return await prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.findFirst({
      where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS },
    });
    if (!session) throw new NotFoundError("No active session");

    const pendingActionData = session.pending_action as any;
    if (!pendingActionData || !session.pending_action_timestamp) {
      return { success: false, reason: "NO_PENDING_ACTION" };
    }

    const elapsed = Date.now() - session.pending_action_timestamp.getTime();
    if (elapsed < 2800) {
      return { success: false, reason: "TIMER_NOT_EXPIRED", timeLeft: 3000 - elapsed };
    }

    const isCancelled = session.nope_count % 2 !== 0;
    const originalPlayer = await tx.player.findFirst({
      where: { room_id: roomId, player_token: pendingActionData.playedByToken },
    });

    if (!originalPlayer) throw new NotFoundError("Player not found");

    await tx.gameSession.update({
      where: { session_id: session.session_id },
      data: {
        pending_action: Prisma.JsonNull,
        pending_action_timestamp: null,
        nope_count: 0,
      },
    });

    if (isCancelled) {
      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: originalPlayer.player_id,
          player_display_name: originalPlayer.display_name,
          action_type: "ACTION_CANCELLED",
          action_details: { reason: "NOPED" },
          is_noped: true,
          turn_number: session.turn_number,
        },
      });
      return {
        success: true as const,
        action: "ACTION_CANCELLED" as const,
        originalAction: pendingActionData.type,
        playedBy: originalPlayer.player_id,
        playedByDisplayName: originalPlayer.display_name,
      };
    }

    if (pendingActionData.type === "PLAY_CARD") {
      const cardCode = pendingActionData.cardCode;
      const normalizedCode = cardCode.replace(/^GVE_/, "");

      if (normalizedCode === CardCode.DRAW_FROM_BOTTOM) {
        return await resolveDrawFromBottom(
          tx, session, originalPlayer, roomId
        );
      }

      const effectData = await applyCardEffect(normalizedCode, {
        tx,
        session,
        roomId,
        currentPlayerId: originalPlayer.player_id,
        targetPlayerToken: pendingActionData.targetPlayerToken,
        advanceTurn: advanceTurn,
      });

      // FR-07-IK: เมื่อ Shuffle ถูกเล่น → reset ik_face_up = false
      // เพราะตำแหน่ง IK ในกองถูกสับใหม่ ไม่ควรโชว์ IK บน deck อีกต่อไป
      if (normalizedCode === CardCode.SHUFFLE) {
        await tx.deckState.update({
          where: { session_id: session.session_id },
          data: { ik_face_up: false },
        });
      }

      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: originalPlayer.player_id,
          player_display_name: originalPlayer.display_name,
          action_type: ActionType.PLAY_CARD,
          action_details: {
            card: cardCode,
            target: pendingActionData.targetPlayerToken ?? null,
            effect: effectData.effect?.type,
          },
          turn_number: session.turn_number,
        },
      });

      return {
        success: true as const,
        action: ActionType.CARD_PLAYED,
        cardCode,
        playedBy: originalPlayer.player_id,
        playedByDisplayName: originalPlayer.display_name,
        playedByToken: pendingActionData.playedByToken,
        targetToken: pendingActionData.targetPlayerToken,
        target: pendingActionData.targetPlayerToken ?? null,
        effect: effectData.effect,
        nextTurn: effectData.turnResult?.nextTurn,
      };
    } else if (pendingActionData.type === "COMBO_CARD") {
      const { comboCards, targetPlayerToken, demandedCard } = pendingActionData;
      const isThreeCard = comboCards.length === 3;

      const target = await tx.player.findFirst({
        where: { room_id: roomId, player_token: targetPlayerToken, is_alive: true },
      });

      if (!target) {
        return { success: false, reason: "Target not found" };
      }

      const targetHand = await tx.cardHand.findUnique({
        where: { player_id_session_id: { player_id: target.player_id, session_id: session.session_id } },
      });
      const targetCards = [...((targetHand?.cards ?? []) as string[])];

      const thiefHand = await tx.cardHand.findUnique({
        where: { player_id_session_id: { player_id: originalPlayer.player_id, session_id: session.session_id } },
      });
      const remaining = [...((thiefHand?.cards ?? []) as string[])];

      let stolenCard: string | undefined;
      let wasVoid = false;

      if (targetCards.length === 0) {
        wasVoid = true;
      } else {
        if (isThreeCard) {
          const normalizedDemand = demandedCard.replace(/^GVE_/, "");
          if (["EK", "IK"].includes(normalizedDemand)) throw new BadRequestError("Cannot demand Exploding Kitten or Imploding Kitten");
          const demandIdx = targetCards.indexOf(demandedCard);
          if (demandIdx === -1) {
            wasVoid = true;
          } else {
            stolenCard = demandedCard;
            targetCards.splice(demandIdx, 1);
          }
        } else {
          const stealable = targetCards.filter(
            (c) => c !== "EK" && c !== "GVE_EK" && c !== "DF" && c !== "GVE_DF"
          );
          const pool = stealable.length > 0 ? stealable : targetCards;
          const randomIdx = Math.floor(Math.random() * pool.length);
          stolenCard = pool[randomIdx]!;
          const realIdx = targetCards.indexOf(stolenCard);
          targetCards.splice(realIdx, 1);
        }
      }

      if (stolenCard) {
        await tx.cardHand.update({
          where: { player_id_session_id: { player_id: target.player_id, session_id: session.session_id } },
          data: { cards: targetCards, card_count: targetCards.length },
        });

        const newThiefCards = [...remaining, stolenCard];
        await tx.cardHand.update({
          where: { player_id_session_id: { player_id: originalPlayer.player_id, session_id: session.session_id } },
          data: { cards: newThiefCards, card_count: newThiefCards.length },
        });
      }

      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: originalPlayer.player_id,
          player_display_name: originalPlayer.display_name,
          action_type: ActionType.PLAY_CARD,
          action_details: {
            combo_type: isThreeCard ? "THREE_CARD" : "TWO_CARD",
            combo_cards: comboCards,
            target_player_id: target.player_id,
            demanded_card: demandedCard ?? null,
            stolen_card: stolenCard ?? null,
            was_void: wasVoid,
          },
          turn_number: session.turn_number,
        },
      });

      const thiefFinalCards = stolenCard ? [...remaining, stolenCard] : remaining;

      return {
        success: true as const,
        action: "COMBO_PLAYED" as const,
        nextTurn: {
          player_id: session.current_turn_player_id!,
          display_name: originalPlayer.display_name,
          turn_number: session.turn_number,
        },
        comboType: isThreeCard ? ("THREE_CARD" as const) : ("TWO_CARD" as const),
        stolenCard,
        wasVoid,
        robbedFromDisplayName: target.display_name,
        robbedFromPlayerId: target.player_id,
        robbedFromToken: targetPlayerToken,
        playedByToken: pendingActionData.playedByToken,
        thiefHand: thiefFinalCards,
        targetHand: targetCards,
        playedBy: originalPlayer.player_id,
        playedByDisplayName: originalPlayer.display_name,
        comboCards,
      };
    }
    return { success: false, reason: "UNKNOWN_PENDING_ACTION_TYPE" };
  });
}