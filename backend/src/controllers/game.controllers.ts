// backend/src/controllers/game.controllers.ts
import { Request, Response } from 'express'
import { gameService } from '../services/game.service'

const getPlayerToken = (req: Request): string | null => {
  return req.headers['x-player-token'] as string ?? null
}
// จะมี controller สำหรับ action ที่เกี่ยวกับเกม เช่น draw card, defuse card, eliminate player ซึ่งจะถูกเรียกจาก route และ socket timer
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
// POST /api/rooms/:roomId/defuse
//defuseCard จะถูกเรียกเมื่อผู้เล่นพยายามใช้การ์ด Defuse เพื่อป้องกันการระเบิดของ Exploding Kitten หลังจากที่ผู้เล่นดึงการ์ด Exploding Kitten ออกมาแล้ว
//ผู้เล่นจะต้องส่งคำขอ POST ไปยัง endpoint นี้พร้อมกับ x-player-token ใน header เพื่อยืนยันตัวตนของผู้เล่น และ roomId ใน URL เพื่อระบุห้องที่ผู้เล่นอยู่
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
// POST /api/rooms/:roomId/eliminate
// eliminatePlayer จะถูกเรียกเมื่อผู้เล่นถูกกำจัดออกจากเกม (เช่น เมื่อดึงการ์ด Exploding Kitten ออกมาแล้วไม่มีการ์ด Defuse 
// หรือเมื่อถูกผู้เล่นคนอื่นใช้การ์ด Attack หรือ Skip กับเขา) 
// หลังจากที่ผู้เล่นถูกกำจัดแล้ว เขาจะไม่สามารถเข้าร่วมในเกมต่อไปได้ และจะต้องรอจนกว่าเกมจะจบลง
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