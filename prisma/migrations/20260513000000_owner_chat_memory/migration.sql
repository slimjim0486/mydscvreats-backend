-- Sous Chef: owner chat persistence, long-term memory, daily Whisper briefings.

CREATE TABLE "owner_chat_messages" (
  "id"              TEXT PRIMARY KEY,
  "restaurant_id"   TEXT NOT NULL,
  "role"            TEXT NOT NULL,
  "content"         TEXT NOT NULL,
  "tool_calls"      JSONB,
  "tool_results"    JSONB,
  "author_user_id"  TEXT,
  "source"          TEXT NOT NULL DEFAULT 'chat',
  "whisper_id"      TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "owner_chat_messages_restaurant_id_created_at_idx"
  ON "owner_chat_messages" ("restaurant_id", "created_at");
CREATE INDEX "owner_chat_messages_whisper_id_idx"
  ON "owner_chat_messages" ("whisper_id");

CREATE TABLE "owner_chat_memories" (
  "id"                 TEXT PRIMARY KEY,
  "restaurant_id"      TEXT NOT NULL,
  "type"               TEXT NOT NULL,
  "content"            TEXT NOT NULL,
  "confidence"         DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  "tags"               TEXT[] NOT NULL DEFAULT '{}',
  "source_message_id"  TEXT,
  "reinforce_count"    INTEGER NOT NULL DEFAULT 1,
  "last_reinforced"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at"         TIMESTAMP(3),
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "owner_chat_memories_restaurant_id_last_reinforced_idx"
  ON "owner_chat_memories" ("restaurant_id", "last_reinforced");
CREATE INDEX "owner_chat_memories_restaurant_id_type_idx"
  ON "owner_chat_memories" ("restaurant_id", "type");

CREATE TABLE "owner_whispers" (
  "id"            TEXT PRIMARY KEY,
  "restaurant_id" TEXT NOT NULL,
  "for_date"      DATE NOT NULL,
  "content"       TEXT NOT NULL,
  "metrics_json"  JSONB NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'unread',
  "read_at"       TIMESTAMP(3),
  "generated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cost_usd"      DOUBLE PRECISION NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "owner_whispers_restaurant_id_for_date_key"
  ON "owner_whispers" ("restaurant_id", "for_date");
CREATE INDEX "owner_whispers_restaurant_id_generated_at_idx"
  ON "owner_whispers" ("restaurant_id", "generated_at");

ALTER TABLE "owner_chat_messages"
  ADD CONSTRAINT "owner_chat_messages_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "owner_chat_memories"
  ADD CONSTRAINT "owner_chat_memories_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "owner_whispers"
  ADD CONSTRAINT "owner_whispers_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "owner_chat_messages"
  ADD CONSTRAINT "owner_chat_messages_whisper_id_fkey"
  FOREIGN KEY ("whisper_id") REFERENCES "owner_whispers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
