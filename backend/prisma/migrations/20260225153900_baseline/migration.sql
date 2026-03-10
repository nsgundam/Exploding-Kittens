/*
  Warnings:

  - The values [FINISHED] on the enum `RoomStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `current_players` on the `Room` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[session_id]` on the table `Player` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[room_id,seat_number]` on the table `Player` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[host_session_id]` on the table `Room` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RoomStatus_new" AS ENUM ('WAITING', 'PLAYING');
ALTER TABLE "public"."Room" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Room" ALTER COLUMN "status" TYPE "RoomStatus_new" USING ("status"::text::"RoomStatus_new");
ALTER TYPE "RoomStatus" RENAME TO "RoomStatus_old";
ALTER TYPE "RoomStatus_new" RENAME TO "RoomStatus";
DROP TYPE "public"."RoomStatus_old";
ALTER TABLE "Room" ALTER COLUMN "status" SET DEFAULT 'WAITING';
COMMIT;

-- DropForeignKey
ALTER TABLE "CardHand" DROP CONSTRAINT "CardHand_player_id_fkey";

-- DropForeignKey
ALTER TABLE "CardHand" DROP CONSTRAINT "CardHand_session_id_fkey";

-- DropForeignKey
ALTER TABLE "DeckConfig" DROP CONSTRAINT "DeckConfig_room_id_fkey";

-- DropForeignKey
ALTER TABLE "DeckState" DROP CONSTRAINT "DeckState_session_id_fkey";

-- DropForeignKey
ALTER TABLE "GameLog" DROP CONSTRAINT "GameLog_session_id_fkey";

-- DropForeignKey
ALTER TABLE "GameSession" DROP CONSTRAINT "GameSession_room_id_fkey";

-- DropForeignKey
ALTER TABLE "Player" DROP CONSTRAINT "Player_room_id_fkey";

-- DropIndex
DROP INDEX "Player_session_id_room_id_key";

-- AlterTable
ALTER TABLE "GameSession" ALTER COLUMN "start_time" DROP NOT NULL,
ALTER COLUMN "start_time" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "current_players",
ADD COLUMN     "restart_available_at" TIMESTAMP(3),
ALTER COLUMN "host_session_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Player_session_id_key" ON "Player"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "Player_room_id_seat_number_key" ON "Player"("room_id", "seat_number");

-- CreateIndex
CREATE UNIQUE INDEX "Room_host_session_id_key" ON "Room"("host_session_id");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_host_session_id_fkey" FOREIGN KEY ("host_session_id") REFERENCES "Player"("session_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("room_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("room_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckConfig" ADD CONSTRAINT "DeckConfig_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("room_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckState" ADD CONSTRAINT "DeckState_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "GameSession"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameLog" ADD CONSTRAINT "GameLog_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "GameSession"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardHand" ADD CONSTRAINT "CardHand_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "Player"("player_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardHand" ADD CONSTRAINT "CardHand_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "GameSession"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;
