-- CreateTable
CREATE TABLE "Player" (
    "player_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "profile_picture" TEXT,
    "room_id" TEXT NOT NULL,
    "seat_number" INTEGER,
    "role" TEXT NOT NULL,
    "is_alive" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "afk_count" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("player_id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "session_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "current_turn_session_id" TEXT,
    "turn_number" INTEGER NOT NULL DEFAULT 1,
    "start_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "winner_session_id" TEXT,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "DeckConfig" (
    "config_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "card_version" TEXT NOT NULL,
    "expansions" JSONB NOT NULL,
    "last_modified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeckConfig_pkey" PRIMARY KEY ("config_id")
);

-- CreateTable
CREATE TABLE "DeckState" (
    "deck_state_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "deck_order" JSONB NOT NULL,
    "discard_pile" JSONB NOT NULL,
    "cards_remaining" INTEGER NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeckState_pkey" PRIMARY KEY ("deck_state_id")
);

-- CreateTable
CREATE TABLE "GameLog" (
    "log_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "player_session_id" TEXT NOT NULL,
    "player_display_name" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "action_details" JSONB NOT NULL,
    "is_noped" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "turn_number" INTEGER NOT NULL,

    CONSTRAINT "GameLog_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "CardHand" (
    "hand_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "cards" JSONB NOT NULL,
    "card_count" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardHand_pkey" PRIMARY KEY ("hand_id")
);

-- CreateTable
CREATE TABLE "CardMaster" (
    "card_id" SERIAL NOT NULL,
    "card_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "effect_details" JSONB NOT NULL,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "quantity_in_deck" INTEGER NOT NULL,
    "is_playable" BOOLEAN NOT NULL,
    "is_stackable" BOOLEAN NOT NULL,
    "expansion_pack" TEXT,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardMaster_pkey" PRIMARY KEY ("card_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_session_id_key" ON "Player"("session_id");

-- CreateIndex
CREATE INDEX "Player_room_id_idx" ON "Player"("room_id");

-- CreateIndex
CREATE INDEX "GameSession_room_id_idx" ON "GameSession"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "DeckConfig_room_id_key" ON "DeckConfig"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "DeckState_session_id_key" ON "DeckState"("session_id");

-- CreateIndex
CREATE INDEX "GameLog_session_id_idx" ON "GameLog"("session_id");

-- CreateIndex
CREATE INDEX "GameLog_turn_number_idx" ON "GameLog"("turn_number");

-- CreateIndex
CREATE UNIQUE INDEX "CardHand_player_id_session_id_key" ON "CardHand"("player_id", "session_id");

-- CreateIndex
CREATE UNIQUE INDEX "CardMaster_card_code_key" ON "CardMaster"("card_code");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckConfig" ADD CONSTRAINT "DeckConfig_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckState" ADD CONSTRAINT "DeckState_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "GameSession"("session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameLog" ADD CONSTRAINT "GameLog_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "GameSession"("session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardHand" ADD CONSTRAINT "CardHand_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "Player"("player_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardHand" ADD CONSTRAINT "CardHand_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "GameSession"("session_id") ON DELETE RESTRICT ON UPDATE CASCADE;
