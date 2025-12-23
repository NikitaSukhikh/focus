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
