import { Request, Response } from "express";
import { roomService } from "../services/room.service";
import { CreateRoomInput, UpdateDeckConfigInput } from "../types/types";
import { RoomStatus } from "@prisma/client";
import { getErrorMessage, getErrorStatusCode } from "../utils/errors";

export const createRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body as Omit<CreateRoomInput, "playerToken">;
    const playerToken = req.playerToken!;

    if (!payload.roomName || !payload.hostName || !payload.maxPlayers) {
      res.status(400).json({ message: "roomName, hostName and maxPlayers are required" });
      return;
    }

    const room = await roomService.createRoom({
      ...payload,
      playerToken,
    });

    res.status(201).json(room);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

export const getAllRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, card_version } = req.query;
    const rooms = await roomService.getAllRooms(status as RoomStatus, card_version as string);
    res.status(200).json(rooms);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

export const getCurrentRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const playerToken = req.playerToken!;
    const currentRoom = await roomService.getCurrentRoom(playerToken);
    res.status(200).json(currentRoom || {});
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

export const joinRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const { displayName } = req.body || {};
    const playerToken = req.playerToken!;

    if (!displayName) {
      res.status(400).json({ message: "displayName is required" });
      return;
    }

    const player = await roomService.joinRoom(roomId, playerToken, displayName);
    res.status(201).json(player);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

export const selectSeat = async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const { seatNumber } = req.body;
    const playerToken = req.playerToken!;

    if (!seatNumber) {
      res.status(400).json({ message: "seatNumber is required" });
      return;
    }

    const player = await roomService.selectSeat(roomId, playerToken, Number(seatNumber));
    res.status(200).json(player);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

export const getRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const room = await roomService.getRoomById(roomId as string);
    res.status(200).json(room);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

export const leaveRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const playerToken = req.playerToken!;

    const room = await roomService.leaveRoom(roomId, playerToken);
    res.status(200).json(room || { deleted: true });
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

export const unseatPlayer = async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const playerToken = req.playerToken!;

    const player = await roomService.unseatPlayer(roomId, playerToken);
    res.status(200).json(player);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};

export const updateDeckConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const playerToken = req.playerToken!;
    const config = req.body as UpdateDeckConfigInput;

    if (!config.cardVersion) {
      res.status(400).json({ message: "cardVersion is required" });
      return;
    }

    const room = await roomService.updateDeckConfig(roomId, playerToken, config);
    res.status(200).json(room);
  } catch (error: unknown) {
    res.status(getErrorStatusCode(error)).json({ message: getErrorMessage(error) });
  }
};
