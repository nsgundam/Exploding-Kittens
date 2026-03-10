/*
  Warnings:

  - You are about to drop the column `player_session_id` on the `GameLog` table. All the data in the column will be lost.
  - You are about to drop the column `current_turn_session_id` on the `GameSession` table. All the data in the column will be lost.
  - You are about to drop the column `winner_session_id` on the `GameSession` table. All the data in the column will be lost.
  - You are about to drop the column `session_id` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `host_session_id` on the `Room` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[player_token,room_id]` on the table `Player` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `player_id` to the `GameLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `player_token` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Added the required column `host_token` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Player_session_id_idx";

-- DropIndex
DROP INDEX "Player_session_id_key";

-- AlterTable
ALTER TABLE "GameLog" DROP COLUMN "player_session_id",
ADD COLUMN     "player_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "GameSession" DROP COLUMN "current_turn_session_id",
DROP COLUMN "winner_session_id",
ADD COLUMN     "current_turn_player_id" TEXT,
ADD COLUMN     "winner_player_id" TEXT;

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "session_id",
ADD COLUMN     "player_token" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "host_session_id",
ADD COLUMN     "host_token" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "PlayerIdentity" (
    "token" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "profile_picture" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerIdentity_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE INDEX "Player_player_token_idx" ON "Player"("player_token");

-- CreateIndex
CREATE UNIQUE INDEX "Player_player_token_room_id_key" ON "Player"("player_token", "room_id");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_host_token_fkey" FOREIGN KEY ("host_token") REFERENCES "PlayerIdentity"("token") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_player_token_fkey" FOREIGN KEY ("player_token") REFERENCES "PlayerIdentity"("token") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_current_turn_player_id_fkey" FOREIGN KEY ("current_turn_player_id") REFERENCES "Player"("player_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_winner_player_id_fkey" FOREIGN KEY ("winner_player_id") REFERENCES "Player"("player_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameLog" ADD CONSTRAINT "GameLog_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "Player"("player_id") ON DELETE RESTRICT ON UPDATE CASCADE;
