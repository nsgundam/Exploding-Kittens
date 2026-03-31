import { Request, Response } from "express";
import { gameService } from "../services/game.service";
import { asyncHandler } from "../utils/asyncHandler";
import { getErrorMessage, getErrorStatusCode } from "../utils/errors";

/**
 * POST /api/rooms/:roomId/start
 * Start a game — only host can trigger this.
 * FR-03-10, S2-06
 */
export const startGame = asyncHandler(async (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  const playerToken = req.playerToken!;

  const result = await gameService.startGame(roomId, playerToken);
  res.status(200).json(result);
});

/**
 * POST /api/rooms/:roomId/draw
 * Draw a card from the deck.
 * FR-04-4, S2-19/20
 */
export const drawCard = asyncHandler(async (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  const playerToken = req.playerToken!;

  const result = await gameService.drawCard(roomId, playerToken);
  res.status(200).json(result);
});

/**
 * POST /api/rooms/:roomId/defuse
 * Use Defuse card after drawing Exploding Kitten.
 * FR-04-7/9, S2-23
 */
export const defuseCard = asyncHandler(async (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  const playerToken = req.playerToken!;

  const result = await gameService.defuseCard(roomId, playerToken);
  res.status(200).json(result);
});

/**
 * POST /api/rooms/:roomId/eliminate
 * Eliminate a player (called by socket timer when EK timer expires).
 * FR-04-7/8, S2-25
 */
export const eliminatePlayer = asyncHandler(async (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  const playerToken = req.playerToken!;

  const result = await gameService.eliminatePlayer(roomId, playerToken);
  res.status(200).json(result);
});

/**
 * POST /api/rooms/:roomId/play
 * Play a card from hand.
 * FR-05, S2-13/18
 */
export const playCard = asyncHandler(async (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  const playerToken = req.playerToken!;
  const { cardCode, targetPlayerToken } = req.body;

  if (!cardCode) {
    res.status(400).json({ message: "cardCode is required" });
    return;
  }

  const result = await gameService.playCard(
    roomId,
    playerToken,
    cardCode,
    targetPlayerToken
  );
  res.status(200).json(result);
});

/**
 * POST /api/rooms/:roomId/favor
 * เล่น Favor card — เลือก target
 * FR-05-FV, S3-01
 */
export const favorCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const playerToken = req.playerToken!;
    const { targetPlayerToken } = req.body;

    if (!targetPlayerToken) {
      res.status(400).json({ message: "targetPlayerToken is required" });
      return;
    }

    const result = await gameService.playCard(roomId, playerToken, "FV", targetPlayerToken);
    res.status(200).json(result);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

/**
 * POST /api/rooms/:roomId/favor/response
 * Target เลือกไพ่ให้ requester
 * FR-05-FV, S3-02
 */
export const favorResponse = async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const playerToken = req.playerToken!;
    const { cardCode } = req.body; // optional — undefined = สุ่ม

    const result = await gameService.favorResponse(roomId, playerToken, cardCode);
    res.status(200).json(result);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

/**
 * POST /api/rooms/:roomId/nope
 * เล่น Nope card — ทุกคนเล่นได้ยกเว้นคนเล่นไพ่นั้น
 * FR-05-N, S3-04
 */
export const nopeCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const playerToken = req.playerToken!;
    const { nopeCount } = req.body;

    const result = await gameService.playNope(roomId, playerToken);
    res.status(200).json(result);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

/**
 * POST /api/rooms/:roomId/combo
 * เล่น Cat Combo 2 หรือ 3 ใบ
 * 2-card: ขโมยการ์ดสุ่มจาก target
 * 3-card: ระบุการ์ดที่ต้องการ — ถ้า target ไม่มี ถือว่าโมฆะ
 */
export const comboCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const playerToken = req.playerToken!;
    const { comboCards, targetPlayerToken, demandedCard } = req.body;

    if (!Array.isArray(comboCards) || comboCards.length < 2 || comboCards.length > 3) {
      res.status(400).json({ message: "comboCards must be an array of 2 or 3 card codes" });
      return;
    }

    if (!targetPlayerToken) {
      res.status(400).json({ message: "targetPlayerToken is required" });
      return;
    }

    const result = await gameService.comboCard(
      roomId,
      playerToken,
      comboCards,
      targetPlayerToken,
      demandedCard,
    );
    res.status(200).json(result);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

/**
 * POST /api/rooms/:roomId/ik/place
 * FR-07-IK2: ผู้เล่นเลือกตำแหน่งใส่ Imploding Kitten กลับเข้า deck
 * Body: { position: number }  — 0 = บนสุด, N = ล่างสุด
 */
export const placeIKBack = asyncHandler(async (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  const playerToken = req.playerToken!;
  const { position } = req.body;

  if (position === undefined || typeof position !== "number") {
    res.status(400).json({ message: "position (number) is required" });
    return;
  }

  const result = await gameService.placeIKBack(roomId, playerToken, position);
  res.status(200).json(result);
});

/**
 * POST /api/rooms/:roomId/alter-future
 * FR-AF: Commit the new order of top 3 cards after playing Alter the Future
 * Body: { newOrder: string[] }  — topmost card first
 */
export const alterTheFuture = asyncHandler(async (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  const playerToken = req.playerToken!;
  const { newOrder } = req.body;

  if (!Array.isArray(newOrder) || newOrder.length === 0) {
    res.status(400).json({ message: "newOrder (string[]) is required" });
    return;
  }

  const result = await gameService.commitAlterTheFuture(roomId, playerToken, newOrder);
  res.status(200).json(result);
});