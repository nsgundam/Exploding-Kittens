import { Router } from "express";
import * as roomControllers from "../controllers/room.controllers";
import * as gameControllers from "../controllers/game.controllers";
import { extractPlayerToken } from "../middleware/auth.middleware";

const router = Router();

// ── Public routes (no token required) ──────────────────────────

// GET /api/rooms — list rooms (optionally filter by status)
router.get("/", roomControllers.getAllRooms);

// GET /api/rooms/:roomId — get room details
router.get("/:roomId", roomControllers.getRoom);

// ── Authenticated routes (token required) ──────────────────────

// GET /api/rooms/current — check if player is in a room
router.get("/current", extractPlayerToken, roomControllers.getCurrentRoom);

// POST /api/rooms — create a new room
router.post("/", extractPlayerToken, roomControllers.createRoom);

// POST /api/rooms/:roomId/join — join a room as spectator
router.post("/:roomId/join", extractPlayerToken, roomControllers.joinRoom);

// PATCH /api/rooms/:roomId/seat — select a seat
router.patch("/:roomId/seat", extractPlayerToken, roomControllers.selectSeat);

// PATCH /api/rooms/:roomId/unseat — leave seat (back to spectator)
router.patch("/:roomId/unseat", extractPlayerToken, roomControllers.unseatPlayer);

// PATCH /api/rooms/:roomId/config — update deck config (host only) [S2-03]
router.patch("/:roomId/config", extractPlayerToken, roomControllers.updateDeckConfig);

// POST /api/rooms/:roomId/leave — leave room
router.post("/:roomId/leave", extractPlayerToken, roomControllers.leaveRoom);

// ── Game action routes ─────────────────────────────────────────

// POST /api/rooms/:roomId/start — start game (host only)
router.post("/:roomId/start", extractPlayerToken, gameControllers.startGame);

// POST /api/rooms/:roomId/draw — draw a card
router.post("/:roomId/draw", extractPlayerToken, gameControllers.drawCard);

// POST /api/rooms/:roomId/defuse — use Defuse card
router.post("/:roomId/defuse", extractPlayerToken, gameControllers.defuseCard);

// POST /api/rooms/:roomId/eliminate — eliminate player (called by socket timer)
router.post("/:roomId/eliminate", extractPlayerToken, gameControllers.eliminatePlayer);

// POST /api/rooms/:roomId/play — play an action card [S2-18]
router.post("/:roomId/play", extractPlayerToken, gameControllers.playCard);

// POST /api/rooms/:roomId/favor — เล่น Favor card
router.post("/:roomId/favor", extractPlayerToken, gameControllers.favorCard);

// POST /api/rooms/:roomId/favor/response — target ตอบกลับ
router.post("/:roomId/favor/response", extractPlayerToken, gameControllers.favorResponse);

// POST /api/rooms/:roomId/nope — เล่น Nope card
router.post("/:roomId/nope", extractPlayerToken, gameControllers.nopeCard);

// POST /api/rooms/:roomId/combo — เล่น Cat Combo (2 หรือ 3 ใบ)
router.post("/:roomId/combo", extractPlayerToken, gameControllers.comboCard);

// POST /api/rooms/:roomId/ik/place — FR-07-IK2: ใส่ IK กลับ deck
router.post("/:roomId/ik/place", extractPlayerToken, gameControllers.placeIKBack);

export default router;