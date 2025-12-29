-- Migration: add default/custom title and description columns to objects
-- Applies to SQLite. Run once against the existing database.

BEGIN TRANSACTION;

-- 1) Add missing columns (SQLite ignores duplicates)
ALTER TABLE objects ADD COLUMN default_title TEXT NOT NULL DEFAULT '';
ALTER TABLE objects ADD COLUMN default_description TEXT;
ALTER TABLE objects ADD COLUMN custom_title TEXT;
ALTER TABLE objects ADD COLUMN custom_description TEXT;

-- 2) Backfill defaults and align display fields
UPDATE objects
SET
  default_title = COALESCE(default_title, title),
  default_description = COALESCE(default_description, description),
  title = COALESCE(custom_title, default_title, title),
  description = COALESCE(custom_description, default_description, description);

COMMIT;
