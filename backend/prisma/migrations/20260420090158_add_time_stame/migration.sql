-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "turn_start_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
