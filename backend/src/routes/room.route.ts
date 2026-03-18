import { Router } from "express";
import * as roomControllers from "../controllers/room.controllers";
import * as gameControllers from "../controllers/game.controllers";
const router = Router();

// GET /api/rooms
router.get("/", roomControllers.getAllRooms);
// GET /api/rooms/current
router.get("/current", roomControllers.getCurrentRoom);
// GET /api/rooms/:roomId
router.get("/:roomId", roomControllers.getRoom);

// POST /api/rooms
router.post("/", roomControllers.createRoom);
// POST /api/rooms/:roomId/join
router.post("/:roomId/join", roomControllers.joinRoom);

// PATCH /api/rooms/:roomId/seat
router.patch("/:roomId/seat", roomControllers.selectSeat);

// PATCH /api/rooms/:roomId/unseat
router.patch('/:roomId/unseat', roomControllers.unseatPlayer);

// PATCH /api/rooms/:roomId/deck-config
router.patch("/:roomId/deck-config", roomControllers.updateDeckConfig);

// POST /api/rooms/:roomId/leave
router.post("/:roomId/leave", roomControllers.leaveRoom);

// POST /api/rooms/:roomId/start
router.post("/:roomId/start", roomControllers.startGame);

// Game actions
// POST /api/rooms/:roomId/draw
router.post('/:roomId/draw', gameControllers.drawCard);
// POST /api/rooms/:roomId/defuse
router.post('/:roomId/defuse', gameControllers.defuseCard);
// POST /api/rooms/:roomId/eliminate
router.post('/:roomId/eliminate', gameControllers.eliminatePlayer);

export default router;