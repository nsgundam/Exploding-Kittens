-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "direction" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "pending_attacks" INTEGER NOT NULL DEFAULT 0;
