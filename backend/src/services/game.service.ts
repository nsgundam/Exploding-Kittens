import { prisma } from "../config/prisma";
import { roomService } from "./room.service";
import { Prisma, RoomStatus, PlayerRole, GameSessionStatus, GameSession, Player, Room } from "@prisma/client";

export const gameService = {

  // S2-07: Draw Card
  async drawCard(roomId: string, playerToken: string, isAutoDrawn = false) {
    return await prisma.$transaction(async (tx) => {

      const room = await tx.room.findUnique({
        where: { room_id: roomId },
        include: { deck_config: true }
      })
      if (!room) throw new Error("Room not found")
      if (room.status !== RoomStatus.PLAYING) throw new Error("Game is not active")

      const session = await tx.gameSession.findFirst({
        where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS }
      })
      if (!session) throw new Error("No active session found")

      const player = await tx.player.findFirst({
        where: { room_id: roomId, player_token: playerToken }
      })
      if (!player) throw new Error("Player not found")
      if (session.current_turn_player_id !== player.player_id) {
        throw new Error("It's not your turn")
      }

      if (isAutoDrawn) {
        const afkResult = await gameService.handleAFK(tx, session, player, roomId)
        if (afkResult) return afkResult
      }

      const deckState = await tx.deckState.findUnique({
        where: { session_id: session.session_id }
      })
      if (!deckState) throw new Error("Deck state not found")

      const deck = deckState.deck_order as string[]
      if (deck.length === 0) throw new Error("Deck is empty")

      const drawnCard = deck[deck.length - 1]!
      const newDeck = deck.slice(0, deck.length - 1)

      await tx.deckState.update({
        where: { session_id: session.session_id },
        data: { deck_order: newDeck, cards_remaining: newDeck.length }
      })

      const isEK = drawnCard === 'EK' || drawnCard === 'GVE_EK'
      const isIK = drawnCard === 'IK'

      if (isEK || isIK) {
        await tx.gameLog.create({
          data: {
            session_id: session.session_id,
            player_id: player.player_id,
            player_display_name: player.display_name,
            action_type: 'DREW_EXPLODING_KITTEN',
            action_details: { card: drawnCard },
            turn_number: session.turn_number,
          }
        })

        if (isIK) {
          return await gameService.handleImplodingKitten(tx, session, player, roomId, drawnCard)
        }

        if (isEK) {
          return await gameService.handleExplodingKitten(tx, session, player, room, drawnCard)
        }
      }

      const hand = await tx.cardHand.findUnique({
        where: { player_id_session_id: {
          player_id: player.player_id,
          session_id: session.session_id
        }}
      })
      const currentCards = (hand?.cards ?? []) as string[]
      const newCards = [...currentCards, drawnCard]

      await tx.cardHand.update({
        where: { player_id_session_id: {
          player_id: player.player_id,
          session_id: session.session_id
        }},
        data: { cards: newCards, card_count: newCards.length }
      })

      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: player.player_id,
          player_display_name: player.display_name,
          action_type: 'DREW_CARD',
          action_details: { card: drawnCard, auto_drawn: isAutoDrawn },
          turn_number: session.turn_number,
        }
      })

      return await gameService.advanceTurn(tx, session, roomId, player.player_id)
    })
  },

  // S2-08: Defuse Card
  async defuseCard(roomId: string, playerToken: string) {
    return await prisma.$transaction(async (tx) => {

      const room = await tx.room.findUnique({
        where: { room_id: roomId },
        include: { deck_config: true }
      })
      if (!room) throw new Error("Room not found")
      if (room.status !== RoomStatus.PLAYING) throw new Error("Game is not active")

      const session = await tx.gameSession.findFirst({
        where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS }
      })
      if (!session) throw new Error("No active session")

      const player = await tx.player.findFirst({
        where: { room_id: roomId, player_token: playerToken }
      })
      if (!player) throw new Error("Player not found")
      if (session.current_turn_player_id !== player.player_id) {
        throw new Error("It's not your turn")
      }

      const lastLog = await tx.gameLog.findFirst({
        where: { session_id: session.session_id, player_id: player.player_id },
        orderBy: { timestamp: 'desc' }
      })
      if (lastLog?.action_type !== 'DREW_EXPLODING_KITTEN') {
        throw new Error("No Exploding Kitten to defuse")
      }

      const ekCard = (lastLog.action_details as { card: string }).card
      const dfCode = room.deck_config?.card_version === 'good_and_evil' ? 'GVE_DF' : 'DF'

      const hand = await tx.cardHand.findUnique({
        where: { player_id_session_id: {
          player_id: player.player_id,
          session_id: session.session_id
        }}
      })
      const cards = (hand?.cards ?? []) as string[]
      if (!cards.includes(dfCode)) throw new Error("No Defuse card in hand")

      let removed = false
      const newCards = cards.filter(c => {
        if (c === dfCode && !removed) { removed = true; return false }
        return true
      })

      await tx.cardHand.update({
        where: { player_id_session_id: {
          player_id: player.player_id,
          session_id: session.session_id
        }},
        data: { cards: newCards, card_count: newCards.length }
      })

      const deckState = await tx.deckState.findUnique({
        where: { session_id: session.session_id }
      })
      const deck = deckState!.deck_order as string[]
      const insertAt = Math.floor(Math.random() * (deck.length + 1))
      const deckWithEK = [
        ...deck.slice(0, insertAt),
        ekCard,
        ...deck.slice(insertAt)
      ]

      await tx.deckState.update({
        where: { session_id: session.session_id },
        data: { deck_order: deckWithEK, cards_remaining: deckWithEK.length }
      })

      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: player.player_id,
          player_display_name: player.display_name,
          action_type: 'DEFUSED',
          action_details: { ek_card: ekCard, insert_at: insertAt },
          turn_number: session.turn_number,
        }
      })

      return await gameService.advanceTurn(tx, session, roomId, player.player_id)
    })
  },

  // S2-09: Eliminate Player
  async eliminatePlayer(roomId: string, playerToken: string) {
    return await prisma.$transaction(async (tx) => {

      const session = await tx.gameSession.findFirst({
        where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS }
      })
      if (!session) throw new Error("No active session")

      const player = await tx.player.findFirst({
        where: { room_id: roomId, player_token: playerToken }
      })
      if (!player) throw new Error("Player not found")
      if (session.current_turn_player_id !== player.player_id) {
        throw new Error("It's not your turn")
      }

      const lastLog = await tx.gameLog.findFirst({
        where: { session_id: session.session_id, player_id: player.player_id },
        orderBy: { timestamp: 'desc' }
      })
      if (lastLog?.action_type !== 'DREW_EXPLODING_KITTEN') {
        throw new Error("No pending Exploding Kitten")
      }

      const ekCard = (lastLog.action_details as { card: string }).card

      await tx.player.update({
        where: { player_id: player.player_id },
        data: { is_alive: false }
      })

      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: player.player_id,
          player_display_name: player.display_name,
          action_type: 'PLAYER_ELIMINATED',
          action_details: { card: ekCard, reason: 'no_defuse_or_timeout' },
          turn_number: session.turn_number,
        }
      })

      return await gameService.checkWinner(tx, session, roomId, player.player_id, ekCard)
    })
  },

  // S2-06: Play Card — ลบไพ่ออกจากมือ + advance turn
  async playCard(roomId: string, playerToken: string, cardCode: string, targetPlayerToken?: string) {
    return await prisma.$transaction(async (tx) => {

      const room = await tx.room.findUnique({
        where: { room_id: roomId },
        include: { deck_config: true }
      })
      if (!room) throw new Error("Room not found")
      if (room.status !== RoomStatus.PLAYING) throw new Error("Game is not active")

      const session = await tx.gameSession.findFirst({
        where: { room_id: roomId, status: GameSessionStatus.IN_PROGRESS }
      })
      if (!session) throw new Error("No active session")

      const player = await tx.player.findFirst({
        where: { room_id: roomId, player_token: playerToken }
      })
      if (!player) throw new Error("Player not found")
      if (session.current_turn_player_id !== player.player_id) {
        throw new Error("It's not your turn")
      }

      // ── ตรวจว่ามีไพ่นี้ในมือจริง ───
      const hand = await tx.cardHand.findUnique({
        where: { player_id_session_id: {
          player_id: player.player_id,
          session_id: session.session_id
        }}
      })
      const cards = (hand?.cards ?? []) as string[]
      if (!cards.includes(cardCode)) throw new Error(`Card ${cardCode} not in hand`)

      // ── ลบไพ่ออกจากมือ 1 ใบ ───
      let removed = false
      const newCards = cards.filter(c => {
        if (c === cardCode && !removed) { removed = true; return false }
        return true
      })

      await tx.cardHand.update({
        where: { player_id_session_id: {
          player_id: player.player_id,
          session_id: session.session_id
        }},
        data: { cards: newCards, card_count: newCards.length }
      })

      // ── log ───
      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: player.player_id,
          player_display_name: player.display_name,
          action_type: 'PLAYED_CARD',
          action_details: {
            card: cardCode,
            target_token: targetPlayerToken ?? null,
          },
          turn_number: session.turn_number,
        }
      })

      // ── advance turn ───
      const turnResult = await gameService.advanceTurn(tx, session, roomId, player.player_id)

      return {
        ...turnResult,
        cardCode,
        playedBy: playerToken,
        playedByDisplayName: player.display_name,
        playedByPlayerId: player.player_id,
        hand: { cards: newCards, card_count: newCards.length },
        target: targetPlayerToken ?? null,
      }
    })
  },

  // ── Helper: Handle AFK ───
  async handleAFK(tx: Prisma.TransactionClient, session: GameSession, player: Player, roomId: string) {
    const newAfkCount = player.afk_count + 1
    await tx.player.update({
      where: { player_id: player.player_id },
      data: { afk_count: newAfkCount }
    })
    if (newAfkCount >= 3) {
      await tx.player.update({
        where: { player_id: player.player_id },
        data: { is_alive: false, role: PlayerRole.SPECTATOR }
      })
      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: player.player_id,
          player_display_name: player.display_name,
          action_type: 'PLAYER_AFK_KICKED',
          action_details: { afk_count: newAfkCount },
          turn_number: session.turn_number,
        }
      })
      return await gameService.advanceTurn(tx, session, roomId, player.player_id)
    }
    return null
  },

  // ── Helper: Handle Imploding Kitten ───
  async handleImplodingKitten(tx: Prisma.TransactionClient, session: GameSession, player: Player, roomId: string, drawnCard: string) {
    await tx.player.update({
      where: { player_id: player.player_id },
      data: { is_alive: false }
    })
    await tx.gameLog.create({
      data: {
        session_id: session.session_id,
        player_id: player.player_id,
        player_display_name: player.display_name,
        action_type: 'PLAYER_ELIMINATED',
        action_details: { card: drawnCard, reason: 'imploding_kitten' },
        turn_number: session.turn_number,
      }
    })
    return await gameService.checkWinner(tx, session, roomId, player.player_id, drawnCard)
  },

  // ── Helper: Handle Exploding Kitten ───
  async handleExplodingKitten(tx: Prisma.TransactionClient, session: GameSession, player: Player, room: any, drawnCard: string) {
    const hand = await tx.cardHand.findUnique({
      where: { player_id_session_id: {
        player_id: player.player_id,
        session_id: session.session_id
      }}
    })
    const cards = (hand?.cards ?? []) as string[]
    const dfCode = room.deck_config?.card_version === 'good_and_evil' ? 'GVE_DF' : 'DF'
    const hasDefuse = cards.includes(dfCode)

    return {
      success: true,
      action: 'DREW_EXPLODING_KITTEN',
      drawnCard,
      hasDefuse,
    }
  },

  // ── Helper: advance to next turn ───
  async advanceTurn(tx: Prisma.TransactionClient, session: GameSession, roomId: string, currentPlayerId: string) {
    const alivePlayers = await tx.player.findMany({
      where: { room_id: roomId, role: PlayerRole.PLAYER, is_alive: true },
      orderBy: { seat_number: 'asc' }
    })

    const currentIndex = alivePlayers.findIndex((p: { player_id: string }) => p.player_id === currentPlayerId)
    const direction = session.direction ?? 1
    const nextIndex = ((currentIndex + direction) + alivePlayers.length) % alivePlayers.length
    const nextPlayer = alivePlayers[nextIndex]

    if (!nextPlayer) {
      throw new Error("Cannot determine next player, no alive players found");
    }

    const pendingAttacks = session.pending_attacks ?? 0
    const nextPendingAttacks = pendingAttacks > 0 ? pendingAttacks - 1 : 0
    const nextTurnNumber = session.turn_number + 1

    await tx.gameSession.update({
      where: { session_id: session.session_id },
      data: {
        current_turn_player_id: nextPlayer.player_id,
        turn_number: nextTurnNumber,
        pending_attacks: nextPendingAttacks,
      }
    })

    return {
      success: true,
      action: 'TURN_ADVANCED',
      nextTurn: {
        player_id: nextPlayer.player_id,
        display_name: nextPlayer.display_name,
        turn_number: nextTurnNumber,
      }
    }
  },

  // ── Helper: check winner ───
  async checkWinner(tx: Prisma.TransactionClient, session: GameSession, roomId: string, eliminatedPlayerId: string, byCard: string) {
    const alivePlayers = await tx.player.findMany({
      where: { room_id: roomId, role: PlayerRole.PLAYER, is_alive: true }
    })

    if (alivePlayers.length === 1) {
      const winner = alivePlayers[0]
      if (!winner) throw new Error("Winner not found");

      await tx.gameSession.update({
        where: { session_id: session.session_id },
        data: {
          status: GameSessionStatus.FINISHED,
          winner_player_id: winner.player_id,
          end_time: new Date(),
        }
      })
      await tx.room.update({
        where: { room_id: roomId },
        data: {
          status: RoomStatus.WAITING,
          restart_available_at: new Date(),
        }
      })
      await tx.gameLog.create({
        data: {
          session_id: session.session_id,
          player_id: winner.player_id,
          player_display_name: winner.display_name,
          action_type: 'GAME_FINISHED',
          action_details: {
            winner_id: winner.player_id,
            eliminated_last: eliminatedPlayerId,
            by_card: byCard,
          },
          turn_number: session.turn_number,
        }
      })
      return {
        success: true,
        action: 'GAME_OVER',
        winner: {
          player_id: winner.player_id,
          display_name: winner.display_name,
        }
      }
    }

    return await gameService.advanceTurn(tx, session, roomId, eliminatedPlayerId)
  },
}