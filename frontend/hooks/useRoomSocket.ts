import { useGameConnection } from "./useGameConnection";
import { useGameState } from "./useGameState";
import { useGameActions } from "./useGameActions";
import { useGameTimer } from "./useGameTimer";

export type { GamePhase, EKBombState } from "./useGameState";

export const useRoomSocket = (roomId: string) => {
  const { socket, isConnected, error } = useGameConnection(roomId);
  const gameState = useGameState(socket, roomId);
  const { timeLeft, onCardPlayed } = useGameTimer(
    socket,
    roomId,
    gameState.gamePhase,
    gameState.currentTurnPlayerId,
    gameState.roomDataRef,
  );

  // ส่ง onCardPlayed ให้ gameState ใช้ reset timer เมื่อมีการ์ดถูกเล่น
  gameState.setOnCardPlayed(onCardPlayed);

  const actions = useGameActions(socket, roomId, {
    setMyCards: gameState.setMyCards,
    setGamePhase: gameState.setGamePhase,
    setCurrentTurnPlayerId: gameState.setCurrentTurnPlayerId,
    pendingNextTurnRef: gameState.pendingNextTurnRef,
    setSeeTheFutureCards: gameState.setSeeTheFutureCards,
    setEliminatedPlayerId: gameState.setEliminatedPlayerId,
    setFavorState: gameState.setFavorState,
    setComboState: gameState.setComboState,
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
    playCombo: actions.playCombo,
    defuseCard: actions.defuseCard,
    eliminatePlayer: actions.eliminatePlayer,
    eliminatedPlayerId: gameState.eliminatedPlayerId,
    dismissEliminated: actions.dismissEliminated,
    winner: gameState.winner,
    leaveRoom: actions.leaveRoom,
    updateDeckConfig: actions.updateDeckConfig,
    favorState: gameState.favorState,
    comboState: gameState.comboState,
    pendingAction: gameState.pendingAction,
    nopeState: gameState.nopeState,
    selectFavorTarget: actions.selectFavorTarget,
    emitCombo: actions.emitCombo,
    cancelCombo: actions.cancelCombo,
    cancelFavor: actions.cancelFavor,
    pickFavorCard: actions.pickFavorCard,
    playNope: actions.playNope,
    selectTATarget: actions.selectTATarget,
    cancelTA: actions.cancelTA,
    commitAlterTheFuture: actions.commitAlterTheFuture,
    timeLeft,
    currentTurnPlayerId: gameState.currentTurnPlayerId,
    pendingAttacks: gameState.pendingAttacks,
    lastPlayedCard: gameState.lastPlayedCard,
    deckCount: gameState.deckCount,
    direction: gameState.direction,
  };
};