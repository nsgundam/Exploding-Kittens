-- DropForeignKey
ALTER TABLE "Room" DROP CONSTRAINT "Room_host_session_id_fkey";

-- DropIndex
DROP INDEX "Room_host_session_id_key";
