-- CreateTable
CREATE TABLE "Room" (
    "room_id" TEXT NOT NULL,
    "room_name" TEXT NOT NULL,
    "host_session_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "max_players" INTEGER NOT NULL,
    "current_players" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("room_id")
);
