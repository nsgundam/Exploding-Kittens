import { useGameConnection } from "./useGameConnection";
import { useGameState } from "./useGameState";
import { useGameActions } from "./useGameActions";
import { useGameTimer } from "./useGameTimer";

export type { GamePhase, EKBombState } from "./useGameState";

export const useRoomSocket = (roomId: string) => {
  const { socket, isConnected, error } = useGameConnection(roomId);
  const gameState = useGameState(socket, roomId);
  const { timeLeft } = useGameTimer(
    socket,
    roomId,
    gameState.gamePhase,
    gameState.currentTurnPlayerId,
    gameState.roomDataRef,
    gameState.lastPlayedCard
  );
  const actions = useGameActions(socket, roomId, {
    setMyCards: gameState.setMyCards,
    setGamePhase: gameState.setGamePhase,
    setCurrentTurnPlayerId: gameState.setCurrentTurnPlayerId,
    pendingNextTurnRef: gameState.pendingNextTurnRef,
    setSeeTheFutureCards: gameState.setSeeTheFutureCards,
    setEliminatedPlayerId: gameState.setEliminatedPlayerId,
  });

  return {
    roomData: gameState.roomData,
    isConnected,
    error,
    cardHands: gameState.cardHands,
    myCards: gameState.myCards,
    gameLogs: gameState.gameLogs,
    sessionId: gameState.sessionId,
    gamePhase: gameState.gamePhase,
    ekBombState: gameState.ekBombState,
    seeTheFutureCards: gameState.seeTheFutureCards,
    setSeeTheFutureCards: gameState.setSeeTheFutureCards,
    closeSeeTheFuture: actions.closeSeeTheFuture,
    insertEK: actions.insertEK,
    closeInsertEK: actions.closeInsertEK,
    selectSeat: actions.selectSeat,
    startGame: actions.startGame,
    drawCard: actions.drawCard,
    playCard: actions.playCard,
    defuseCard: actions.defuseCard,
    eliminatePlayer: actions.eliminatePlayer,
    eliminatedPlayerId: gameState.eliminatedPlayerId,
    dismissEliminated: actions.dismissEliminated,
    winner: gameState.winner,
    leaveRoom: actions.leaveRoom,
    timeLeft,
    currentTurnPlayerId: gameState.currentTurnPlayerId,
    lastPlayedCard: gameState.lastPlayedCard,
    deckCount: gameState.deckCount,
  };
};
