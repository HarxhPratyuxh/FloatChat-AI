-- ============================================================
-- FloatChat Chat History Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Ensure UUID generation is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─────────────────────────────────────────────────────────────
-- TABLE: conversations
-- One row per chat session. Title auto-generated from first msg.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title      TEXT        NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- TABLE: messages
-- Every individual message inside a conversation.
-- FloatChat-specific: sql_generated + tx_hash stored per message.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    content         TEXT        NOT NULL,
    sql_generated   TEXT,       -- The SQL FloatChat generated from the user's plain-English query
    tx_hash         TEXT,       -- Polygon blockchain TX hash for this query's audit trail
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- INDEXES — Performance at scale
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversations_user_id    ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at      ON messages(created_at ASC);


-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — Users only see their own data
-- ─────────────────────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

-- Conversations: full CRUD for owner
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "conversations_insert" ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_update" ON conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "conversations_delete" ON conversations FOR DELETE USING (auth.uid() = user_id);

-- Messages: scoped through conversations ownership
CREATE POLICY "messages_select" ON messages FOR SELECT
    USING (conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid()));

CREATE POLICY "messages_insert" ON messages FOR INSERT
    WITH CHECK (conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid()));

CREATE POLICY "messages_delete" ON messages FOR DELETE
    USING (conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid()));


-- ─────────────────────────────────────────────────────────────
-- TRIGGER — Auto-update conversations.updated_at on new message
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
       SET updated_at = NOW()
     WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_inserted
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION refresh_conversation_timestamp();
