import { prisma } from "../config/prisma";
import {
  startGame,
  drawCard,
  defuseCard,
  eliminatePlayer,
  insertEK,
  commitAlterTheFuture,
  placeIKBack,
  getReconnectionState,
} from "./game.core";
import {
  playCard,
  comboCard,
  favorCard,
  favorResponse,
} from "./game.action";
import { playNope, resolvePendingAction } from "./game.nope";
import { checkWinnerOrAdvance, advanceTurn, handleAFK } from "./game.turn";

export const gameService = {
  // Core game flow
  startGame,
  drawCard,
  defuseCard,
  eliminatePlayer,
  insertEK,
  commitAlterTheFuture,
  placeIKBack,
  getReconnectionState,

  // Actions
  playCard,
  comboCard,
  favorCard,
  favorResponse,

  // Nope flow
  playNope,
  resolvePendingAction,

  // Turn management & utils
  checkWinner: checkWinnerOrAdvance,
  advanceTurn,
  handleAFK,

  // Lookups
  async getPlayerByToken(roomId: string, playerToken: string) {
    return await prisma.player.findFirst({
      where: { room_id: roomId, player_token: playerToken },
    });
  },
};