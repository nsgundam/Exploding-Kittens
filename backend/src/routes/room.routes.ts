//router = Router()
// router.get(...)
// router.post(...)
// export router
import { Router } from "express";
import { createRoom, getAllRooms, joinRoom, selectSeat } from "../controllers/room.controller";
const router = Router();

router.post("/", createRoom);
router.get("/", getAllRooms);
router.post("/:roomId/join", joinRoom);
router.post("/:roomId/seat", selectSeat);
export default router;