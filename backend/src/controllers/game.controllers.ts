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

    const result = await gameService.favorCard(roomId, playerToken, targetPlayerToken);
    res.status(200).json(result);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

  const result = await gameService.defuseCard(roomId, playerToken);
  res.status(200).json(result);
});

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

    if (nopeCount === undefined || typeof nopeCount !== "number") {
      res.status(400).json({ message: "nopeCount is required and must be a number" });
      return;
    }

    const result = await gameService.nopeCard(roomId, playerToken, nopeCount);
    res.status(200).json(result);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });


  const result = await gameService.playCard(
    roomId,
    playerToken,
    cardCode,
    targetPlayerToken
  );
  res.status(200).json(result);
});