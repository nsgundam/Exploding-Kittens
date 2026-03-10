import { prisma } from "../config/prisma";
import { roomService } from "./room.service";
import { RoomStatus } from "@prisma/client";

export const gameService = {
    // S2-06 Stub: Play Card
    async playCard(roomId: string, playerToken: string, cardCode: string, targetPlayerToken?: string) {
        // Validate room
        const room = await roomService.getRoomById(roomId);
        if (!room) throw new Error("Room not found");
        if (room.status !== RoomStatus.PLAYING) throw new Error("Game is not active");

        // TODO: Complete implementation of S2-06, S2-08, S3-01
        // 1. Verify it's the player's turn
        // 2. Verify player has the card
        // 3. Remove card from player's hand
        // 4. Apply card effect (using targetPlayerToken if applicable, e.g., Favor)
        // 5. Create GameLog entry
        // 6. Update Turn state

        return {
            success: true,
            message: `Card ${cardCode} played`,
            playedBy: playerToken,
            target: targetPlayerToken || null,
            timestamp: new Date()
        };
    },

    // S2-07 Stub: Draw Card
    async drawCard(roomId: string, playerToken: string) {
        const room = await roomService.getRoomById(roomId);
        if (!room) throw new Error("Room not found");
        if (room.status !== RoomStatus.PLAYING) throw new Error("Game is not active");

        // TODO: Complete implementation of S2-07, S2-08, S2-09
        // 1. Verify it's the player's turn
        // 2. Pop top card from DeckState
        // 3. If Exploding Kitten: wait for Defuse or eliminate player
        // 4. Else: add to player's hand
        // 5. Update Turn state to next player
        // 6. Create GameLog entry

        return {
            success: true,
            message: "Card drawn",
            drawnBy: playerToken,
            timestamp: new Date()
        };
    }
};
