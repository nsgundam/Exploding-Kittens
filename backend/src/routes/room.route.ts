import { Router } from "express";
import *as  roomControllers from "../controllers/room.controllers";

const router = Router();

router.get("/", roomControllers.getAllRooms);
router.get("/:roomId", roomControllers.getRoom);

router.post("/", roomControllers.createRoom);

router.post("/:roomId/join", roomControllers.joinRoom);
router.post("/:roomId/seat", roomControllers.selectSeat);
export default router;
