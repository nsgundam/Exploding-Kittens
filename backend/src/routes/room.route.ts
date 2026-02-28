import { Router } from "express";
import *as  roomControllers from "../controllers/room.controllers";

const router = Router();

// GET /api/rooms
router.get("/", roomControllers.getAllRooms);
// GET /api/rooms/:roomId
router.get("/:roomId", roomControllers.getRoom);
// POST /api/rooms
router.post("/", roomControllers.createRoom);
// POST /api/rooms/:roomId/join
router.post("/:roomId/join", roomControllers.joinRoom);
// POST /api/rooms/:roomId/seat
router.post("/:roomId/seat", roomControllers.selectSeat);
export default router;
