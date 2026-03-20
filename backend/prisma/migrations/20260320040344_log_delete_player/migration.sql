-- DropForeignKey
ALTER TABLE "GameLog" DROP CONSTRAINT "GameLog_player_id_fkey";

-- AddForeignKey
ALTER TABLE "GameLog" ADD CONSTRAINT "GameLog_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "Player"("player_id") ON DELETE CASCADE ON UPDATE CASCADE;
