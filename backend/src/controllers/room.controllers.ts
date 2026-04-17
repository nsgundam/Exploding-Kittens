import { Request, Response } from "express";
import { roomService } from "../services/room.service";
import { CreateRoomInput, UpdateDeckConfigInput } from "../types/types";
import { RoomStatus } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
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
});

export const getAllRooms = asyncHandler(async (req: Request, res: Response) => {
  const { status, card_version } = req.query;
  const rooms = await roomService.getAllRooms(status as RoomStatus, card_version as string);
  
  // Sanitize: Remove sensitive tokens before sending to public lobby
  const sanitizedRooms = rooms.map(room => ({
    ...room,
    players: room.players.map(p => ({
      player_id: p.player_id,
      display_name: p.display_name,
      profile_picture: p.profile_picture,
      role: p.role,
      seat_number: p.seat_number,
      is_alive: p.is_alive,
      is_host: room.host_token === p.player_token
    }))
  }));
  
  res.status(200).json(sanitizedRooms);
});

export const getCurrentRoom = asyncHandler(async (req: Request, res: Response) => {
  const playerToken = req.playerToken!;
  const currentRoom = await roomService.getCurrentRoom(playerToken);
  res.status(200).json(currentRoom || {});
});

export const joinRoom = asyncHandler(async (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  const { displayName, profilePicture } = req.body || {};
  const playerToken = req.playerToken!;

  if (!displayName) {
    res.status(400).json({ message: "displayName is required" });
    return;
  }

  const player = await roomService.joinRoom(roomId, playerToken, displayName, profilePicture);
  res.status(201).json(player);
});

export const selectSeat = asyncHandler(async (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  const { seatNumber } = req.body;
  const playerToken = req.playerToken!;

  if (!seatNumber) {
    res.status(400).json({ message: "seatNumber is required" });
    return;
  }

  const player = await roomService.selectSeat(roomId, playerToken, Number(seatNumber));
  res.status(200).json(player);
});

export const getRoom = asyncHandler(async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const room = await roomService.getRoomById(roomId as string);
  res.status(200).json(room);
});

export const leaveRoom = asyncHandler(async (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  const playerToken = req.playerToken!;

  const room = await roomService.leaveRoom(roomId, playerToken);
  res.status(200).json(room || { deleted: true });
});

export const unseatPlayer = asyncHandler(async (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  const playerToken = req.playerToken!;

  const player = await roomService.unseatPlayer(roomId, playerToken);
  res.status(200).json(player);
});

export const updateDeckConfig = asyncHandler(async (req: Request, res: Response) => {
  const roomId = req.params.roomId as string;
  const playerToken = req.playerToken!;
  const config = req.body as UpdateDeckConfigInput;

  if (!config.cardVersion) {
    res.status(400).json({ message: "cardVersion is required" });
    return;
  }

  const room = await roomService.updateDeckConfig(roomId, playerToken, config);
  res.status(200).json(room);
});
