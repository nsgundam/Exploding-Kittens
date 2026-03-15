import { Request, Response } from "express";
import { roomService } from "../services/room.service";
import { CreateRoomInput } from "../types/Rooms";
import { RoomStatus } from "@prisma/client";

const getPlayerToken = (req: Request): string | null => {
  const token = req.headers['x-player-token'];
  return token ? String(token) : null;
};

export const createRoom = async (req: Request, res: Response) => {
  try {
    const payload = req.body as CreateRoomInput;
    const playerToken = getPlayerToken(req);

    if (!playerToken) {
      return res.status(401).json({ message: "playerToken is required (send via x-player-token header)" });
    }

    if (!payload.roomName || !payload.hostName || !payload.maxPlayers) {
      return res.status(400).json({ message: "roomName, hostName and maxPlayers are required" });
    }

    const room = await roomService.createRoom({
      ...payload,
      playerToken
    });

    return res.status(201).json(room);

  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAllRooms = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const rooms = await roomService.getAllRooms(status as RoomStatus | undefined);
    res.status(200).json(rooms);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCurrentRoom = async (req: Request, res: Response) => {
  try {
    const playerToken = getPlayerToken(req);

    if (!playerToken) {
      return res.status(401).json({ message: "playerToken is required" });
    }

    const currentRoom = await roomService.getCurrentRoom(playerToken);

    // Return empty object if no room, or the room id if there is one
    res.status(200).json(currentRoom || {});
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const joinRoom = async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId as string;
    const { displayName } = req.body || {};
    const playerToken = getPlayerToken(req);

    if (!playerToken) {
      return res.status(401).json({ message: "playerToken is required" });
    }

    if (!displayName) {
      return res.status(400).json({ message: "displayName is required" });
    }

    const player = await roomService.joinRoom(
      roomId,
      playerToken,
      displayName
    );

    return res.status(201).json(player);

  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const selectSeat = async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId as string;
    const { seatNumber } = req.body;
    const playerToken = getPlayerToken(req);

    if (!playerToken) {
      return res.status(401).json({ message: "playerToken is required" });
    }

    if (!seatNumber) {
      return res.status(400).json({ message: "seatNumber is required" });
    }

    const player = await roomService.selectSeat(
      roomId,
      playerToken,
      Number(seatNumber)
    );

    return res.status(200).json(player);

  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};

export const getRoom = async (req: Request<{ roomId: string }>, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = await roomService.getRoomById(roomId);
    res.status(200).json(room);
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};

export const leaveRoom = async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId as string;
    const playerToken = getPlayerToken(req);

    if (!playerToken) {
      return res.status(401).json({ message: "playerToken is required" });
    }

    const room = await roomService.leaveRoom(roomId, playerToken);
    return res.status(200).json(room || { deleted: true });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};
export const startGame = async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId as string;
    const playerToken = getPlayerToken(req);

    if (!playerToken) {
      return res.status(401).json({ message: "playerToken is required" });
    }

    const room = await roomService.startGame(roomId, playerToken);
    return res.status(200).json(room);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};
//  unseatPlayer controller จะรับผิดชอบในการจัดการเมื่อผู้เล่นต้องการยกเลิกการนั่งที่ที่เลือกไว้ โดยจะตรวจสอบ playerToken เพื่อยืนยันตัวตนของผู้เล่น และเรียกใช้ roomService.unseatPlayer เพื่อทำการยกเลิกการนั่งที่ จากนั้นจะส่งข้อมูลผู้เล่นที่ถูกยกเลิกการนั่งที่กลับไปยัง client
export const unseatPlayer = async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId as string;
    const playerToken = getPlayerToken(req);

      if (!playerToken) {
        return res.status(401).json({ message: "playerToken is required" });
      }

      const player = await roomService.unseatPlayer(roomId, playerToken);
      return res.status(200).json(player);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    } 
  }
