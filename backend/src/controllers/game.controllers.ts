import { Request, Response } from "express";
import { gameService } from "../services/game.service";
import { getErrorMessage, getErrorStatusCode } from "../utils/errors";

/**
 * POST /api/rooms/:roomId/start
 * Start a game — only host can trigger this.
 * FR-03-10, S2-06
 */
export const startGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const playerToken = req.playerToken!;

    const result = await gameService.startGame(roomId, playerToken);
    res.status(200).json(result);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

/**
 * POST /api/rooms/:roomId/draw
 * Draw a card from the deck.
 * FR-04-4, S2-19/20
 */
export const drawCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const playerToken = req.playerToken!;

    const result = await gameService.drawCard(roomId, playerToken);
    res.status(200).json(result);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

/**
 * POST /api/rooms/:roomId/defuse
 * Use Defuse card after drawing Exploding Kitten.
 * FR-04-7/9, S2-23
 */
export const defuseCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const playerToken = req.playerToken!;

    const result = await gameService.defuseCard(roomId, playerToken);
    res.status(200).json(result);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

/**
 * POST /api/rooms/:roomId/eliminate
 * Eliminate a player (called by socket timer when EK timer expires).
 * FR-04-7/8, S2-25
 */
export const eliminatePlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const playerToken = req.playerToken!;

    const result = await gameService.eliminatePlayer(roomId, playerToken);
    res.status(200).json(result);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

/**
 * POST /api/rooms/:roomId/play
 * Play a card from hand.
 * FR-05, S2-13/18
 */
export const playCard = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};