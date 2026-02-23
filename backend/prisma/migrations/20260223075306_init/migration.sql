/*
  Warnings:

  - The `status` column on the `GameSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `Player` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Room` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[session_id,room_id]` on the table `Player` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PlayerRole" AS ENUM ('SPECTATOR', 'PLAYER');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('WAITING', 'PLAYING', 'FINISHED');

-- CreateEnum
CREATE TYPE "GameSessionStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'FINISHED');

-- DropIndex
DROP INDEX "Player_session_id_key";

-- AlterTable
ALTER TABLE "GameSession" DROP COLUMN "status",
ADD COLUMN     "status" "GameSessionStatus" NOT NULL DEFAULT 'WAITING';

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "role",
ADD COLUMN     "role" "PlayerRole" NOT NULL DEFAULT 'SPECTATOR';

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "status",
ADD COLUMN     "status" "RoomStatus" NOT NULL DEFAULT 'WAITING',
ALTER COLUMN "current_players" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "Player_session_id_idx" ON "Player"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "Player_session_id_room_id_key" ON "Player"("session_id", "room_id");
