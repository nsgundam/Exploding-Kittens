// backend/src/controllers/game.controllers.ts
import { Request, Response } from 'express'
import { gameService } from '../services/game.service'

const getPlayerToken = (req: Request): string | null => {
  return req.headers['x-player-token'] as string ?? null
}

export const drawCard = async (req: Request, res: Response) => {
  try {
    const roomId = req.params['roomId'] as string
    const playerToken = getPlayerToken(req)
    if (!playerToken) return res.status(401).json({ message: 'x-player-token required' })

    const result = await gameService.drawCard(roomId, playerToken)
    return res.status(200).json(result)
  } catch (error: any) {
    return res.status(500).json({ message: error.message })
  }
}

export const defuseCard = async (req: Request, res: Response) => {
  try {
    const roomId = req.params['roomId'] as string
    const playerToken = getPlayerToken(req)
    if (!playerToken) return res.status(401).json({ message: 'x-player-token required' })

    const result = await gameService.defuseCard(roomId, playerToken)
    return res.status(200).json(result)
  } catch (error: any) {
    return res.status(500).json({ message: error.message })
  }
}

export const eliminatePlayer = async (req: Request, res: Response) => {
  try {
    const roomId = req.params['roomId'] as string
    const playerToken = getPlayerToken(req)
    if (!playerToken) return res.status(401).json({ message: 'x-player-token required' })

    const result = await gameService.eliminatePlayer(roomId, playerToken)
    return res.status(200).json(result)
  } catch (error: any) {
    return res.status(500).json({ message: error.message })
  }
}

export const playCard = async (req: Request, res: Response) => {
  try {
    const roomId = req.params['roomId'] as string
    const playerToken = getPlayerToken(req)
    if (!playerToken) return res.status(401).json({ message: 'x-player-token required' })

    const { cardCode, targetPlayerToken } = req.body
    if (!cardCode) return res.status(400).json({ message: 'cardCode is required' })

    const result = await gameService.playCard(roomId, playerToken, cardCode, targetPlayerToken)
    return res.status(200).json(result)
  } catch (error: any) {
    return res.status(500).json({ message: error.message })
  }
}