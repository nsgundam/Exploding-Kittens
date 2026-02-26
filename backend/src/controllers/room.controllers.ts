import { Request, Response } from "express";
import { roomService } from "../services/room.service";
//
export const createRoom = async (req: Request, res: Response) => {
  try {
    console.log("BODY:", req.body);

    const { roomName, displayName, maxPlayers } = req.body || {};

    if (!roomName || !displayName || !maxPlayers) {
      return res.status(400).json({
        message: "roomName, displayName and maxPlayers are required",
      });
    }

    const room = await roomService.createRoom(
      roomName,
      displayName,
      Number(maxPlayers)
    );

    return res.status(201).json(room);

  } catch (error: any) {
    return res.status(500).json({
      message: error.message
    });
  }
};

export const getAllRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await roomService.getAllRooms();
    res.status(200).json(rooms);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 
export const joinRoom = async (req: Request, res: Response) => {
  try {
const roomId = req.params.roomId as string;    
const { displayName } = req.body || {};

    if (!displayName) {
      return res.status(400).json({
        message: "displayName is required",
      });
    }

    // ตอนนี้ยังไม่มี auth system
    // ใช้ fake session id ไปก่อน
    const sessionId = "sess_user_1";

    const player = await roomService.joinRoomAsSpectator(
      roomId,
      sessionId,
      displayName
    );

    
    return res.status(201).json(player);

  } catch (error: any) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const selectSeat = async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId as string;
    const { seatNumber } = req.body;

    if (!seatNumber) {
      return res.status(400).json({
        message: "seatNumber is required",
      });
    }

    const sessionId = "sess_user_1";

    const player = await roomService.selectSeat(
      roomId,
      sessionId,
      Number(seatNumber)
    );

    return res.status(200).json(player);

  } catch (error: any) {
    return res.status(400).json({
      message: error.message,
    });
  }
};
//roomID = string นะจ๊ะ
export const getRoom = async (req: Request<{ roomId: string }>, res: Response) => {
  try {
    const { roomId } = req.params;

    const room = await roomService.getRoomById(roomId);

    res.status(200).json(room);

  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};