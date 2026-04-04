import { Prisma, GameSession, Player, RoomStatus, GameSessionStatus, PlayerRole } from "@prisma/client";
import { ActionType, EliminationReason } from "../constants/game";
import { TurnAdvancedResult, GameOverResult } from "../types/types";
import { BadRequestError } from "../utils/errors";

export async function advanceTurn(
  tx: Prisma.TransactionClient,
  session: GameSession,
  roomId: string,
  currentPlayerId: string,
): Promise<TurnAdvancedResult> {
  const allPlayers = await tx.player.findMany({
    where: { room_id: roomId, role: PlayerRole.PLAYER, seat_number: { not: null } },
    orderBy: { seat_number: "asc" },
  });

  const currentIndex = allPlayers.findIndex(
    (p) => p.player_id === currentPlayerId,
  );

  if (currentIndex === -1) {
    throw new BadRequestError("Current player not found in seated players");
  }

  const direction = session.direction ?? 1;

  let nextPlayer = null;
  let offset = 1;
  while (offset <= allPlayers.length) {
    const checkIndex = (currentIndex + (offset * direction) + allPlayers.length) % allPlayers.length;
    if (allPlayers[checkIndex]?.is_alive) {
      nextPlayer = allPlayers[checkIndex];
      break;
    }
    offset++;
  }

  if (!nextPlayer) {
    throw new BadRequestError(
      "Cannot determine next player, no alive players found",
    );
  }

  const pendingAttacks = session.pending_attacks ?? 0;
  const nextTurnNumber = session.turn_number + 1;

  await tx.gameSession.update({
    where: { session_id: session.session_id },
    data: {
      current_turn_player_id: nextPlayer.player_id,
      turn_number: nextTurnNumber,
      pending_attacks: pendingAttacks,
    },
  });

  return {
    success: true,
    action: ActionType.TURN_ADVANCED,
    nextTurn: {
      player_id: nextPlayer.player_id,
      display_name: nextPlayer.display_name,
      turn_number: nextTurnNumber,
      pending_attacks: pendingAttacks,
      reset_timer: true,
    },
  };
}

export async function resolveDrawCompletion(
  tx: Prisma.TransactionClient,
  session: GameSession,
  roomId: string,
  player: Player,
): Promise<TurnAdvancedResult> {
  const pendingAttacks = session.pending_attacks ?? 0;
  if (pendingAttacks > 1) {
    const nextPending = pendingAttacks - 1;
    const nextTurnNumber = session.turn_number + 1;
    await tx.gameSession.update({
      where: { session_id: session.session_id },
      data: { turn_number: nextTurnNumber, pending_attacks: nextPending },
    });
    return {
      success: true,
      action: ActionType.TURN_ADVANCED,
      nextTurn: {
        player_id: player.player_id,
        display_name: player.display_name,
        turn_number: nextTurnNumber,
        pending_attacks: nextPending,
        reset_timer: true,
      },
    };
  } else {
    const sessionForAdvance = pendingAttacks === 1 ? { ...session, pending_attacks: 0 } : session;
    return await advanceTurn(tx, sessionForAdvance, roomId, player.player_id);
  }
}

export async function getWinnerIfAny(
  tx: Prisma.TransactionClient,
  roomId: string,
): Promise<Player | null> {
  const alivePlayers = await tx.player.findMany({
    where: { room_id: roomId, role: PlayerRole.PLAYER, is_alive: true },
  });
  return alivePlayers.length === 1 ? alivePlayers[0]! : null;
}

export async function processGameOver(
  tx: Prisma.TransactionClient,
  session: GameSession,
  roomId: string,
  winner: Player,
  eliminatedPlayerId: string,
  byCard: string,
): Promise<GameOverResult> {
  await tx.gameSession.update({
    where: { session_id: session.session_id },
    data: {
      status: GameSessionStatus.FINISHED,
      winner_player_id: winner.player_id,
      end_time: new Date(),
    },
  });

  await tx.room.update({
    where: { room_id: roomId },
    data: {
      status: RoomStatus.WAITING,
      restart_available_at: new Date(),
      last_winner_token: winner.player_token ?? null,
    },
  });

  await tx.player.updateMany({
    where: { room_id: roomId, role: { not: PlayerRole.SPECTATOR } },
    data: {
      is_alive: true,
      afk_count: 0,
    },
  });

  await tx.player.updateMany({
    where: {
      room_id: roomId,
      role: PlayerRole.SPECTATOR,
      seat_number: { not: null },
    },
    data: {
      is_alive: true,
      role: PlayerRole.PLAYER,
      afk_count: 0,
    },
  });

  await tx.gameLog.create({
    data: {
      session_id: session.session_id,
      player_id: winner.player_id,
      player_display_name: winner.display_name,
      action_type: ActionType.GAME_FINISHED,
      action_details: {
        winner_id: winner.player_id,
        eliminated_last: eliminatedPlayerId,
        by_card: byCard,
      },
      turn_number: session.turn_number,
    },
  });

  return {
    success: true,
    action: ActionType.GAME_OVER,
    winner: {
      player_id: winner.player_id,
      display_name: winner.display_name,
    },
  };
}

export async function checkWinnerOrAdvance(
  tx: Prisma.TransactionClient,
  session: GameSession,
  roomId: string,
  eliminatedPlayerId: string,
  byCard: string,
): Promise<TurnAdvancedResult | GameOverResult> {
  const winner = await getWinnerIfAny(tx, roomId);
  if (winner) {
    return await processGameOver(tx, session, roomId, winner, eliminatedPlayerId, byCard);
  }
  return await advanceTurn(tx, session, roomId, eliminatedPlayerId);
}

export async function handleAFK(
  tx: Prisma.TransactionClient,
  session: GameSession,
  player: Player,
  roomId: string,
): Promise<TurnAdvancedResult | GameOverResult | null> {
  const newAfkCount = player.afk_count + 1;
  await tx.player.update({
    where: { player_id: player.player_id },
    data: { afk_count: newAfkCount },
  });

  if (newAfkCount >= 2) {
    await tx.player.update({
      where: { player_id: player.player_id },
      data: { is_alive: false, role: PlayerRole.SPECTATOR },
    });
    await tx.gameLog.create({
      data: {
        session_id: session.session_id,
        player_id: player.player_id,
        player_display_name: player.display_name,
        action_type: ActionType.PLAYER_AFK_KICKED,
        action_details: { afk_count: newAfkCount },
        turn_number: session.turn_number,
      },
    });

    const kickResult = await checkWinnerOrAdvance(
      tx,
      session,
      roomId,
      player.player_id,
      EliminationReason.AFK_KICK,
    );
    return { ...kickResult, isAfkKick: true, afkPlayerId: player.player_id };
  }
  return null;
}
