-- SQLite schema reference for core tables

CREATE TABLE IF NOT EXISTS islands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    object_count INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS objects (
    id TEXT PRIMARY KEY,
    island_id TEXT NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    tags JSON NOT NULL DEFAULT '[]',
    metadata JSON NOT NULL DEFAULT '{}',
    position INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_objects_island_type ON objects (island_id, type);

CREATE TABLE IF NOT EXISTS google_tokens (
    user_id TEXT PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_uri TEXT,
    client_id TEXT,
    client_secret TEXT,
    scopes JSON NOT NULL DEFAULT '[]',
    expires_at DATETIME,
    user_email TEXT,
    requires_reauth INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Undo / Redo event log (monotonic per-island sequence)
CREATE TABLE IF NOT EXISTS undo_events (
    id TEXT PRIMARY KEY,
    island_id TEXT NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL DEFAULT 0,
    event_type TEXT NOT NULL,
    event_data JSON NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_undone INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_undo_events_island_sequence ON undo_events (island_id, sequence);
CREATE INDEX IF NOT EXISTS idx_undo_events_island_undone ON undo_events (island_id, is_undone, sequence);
