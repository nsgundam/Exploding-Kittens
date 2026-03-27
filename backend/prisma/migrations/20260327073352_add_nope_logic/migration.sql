-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "nope_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pending_action" JSONB,
ADD COLUMN     "pending_action_timestamp" TIMESTAMP(3);
