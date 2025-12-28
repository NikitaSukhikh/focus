-- Migration: add per-island monotonic sequence to undo_events
-- Applies to SQLite. Run once against the existing database.

BEGIN TRANSACTION;

-- 1) Add sequence column if it does not exist (SQLite ignores duplicate add).
ALTER TABLE undo_events ADD COLUMN sequence INTEGER NOT NULL DEFAULT 0;

-- 2) Backfill sequence per island using stable ordering (timestamp, id).
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY island_id ORDER BY timestamp, id) AS seq
  FROM undo_events
)
UPDATE undo_events
SET sequence = ordered.seq
FROM ordered
WHERE undo_events.id = ordered.id;

-- 3) Rebuild indexes to use sequence for undo/redo stepping.
DROP INDEX IF EXISTS idx_undo_events_island_undone;
DROP INDEX IF EXISTS idx_undo_events_island_sequence;
CREATE UNIQUE INDEX IF NOT EXISTS idx_undo_events_island_sequence ON undo_events (island_id, sequence);
CREATE INDEX IF NOT EXISTS idx_undo_events_island_undone ON undo_events (island_id, is_undone, sequence);

COMMIT;
