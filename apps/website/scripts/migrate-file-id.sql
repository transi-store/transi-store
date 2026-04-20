-- Migration: add the project_files table and the file_id column on translation_keys.
--
-- Execution order:
--   1. Run this SQL script on the production database BEFORE deploying the new code.
--   2. Deploy the new code (db:push then applies the NOT NULL constraint
--      and the composite unique index).
--
-- The script is idempotent: it can be re-run safely.

BEGIN;

-- 1. Create the project_files table if it does not exist yet
CREATE TABLE IF NOT EXISTS project_files (
  id         SERIAL       PRIMARY KEY,
  project_id INTEGER      NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  format     VARCHAR(20)  NOT NULL,
  file_path  VARCHAR(500) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 2. Create the unique index on (project_id, file_path) if missing
CREATE UNIQUE INDEX IF NOT EXISTS unique_project_file_path
  ON project_files (project_id, file_path);

-- 3. Add file_id on translation_keys if missing (nullable for the backfill)
ALTER TABLE translation_keys
  ADD COLUMN IF NOT EXISTS file_id INTEGER REFERENCES project_files(id) ON DELETE CASCADE;

-- 4. For each project without a file, create a default "<lang>.json" file
INSERT INTO project_files (project_id, format, file_path)
SELECT p.id, 'json', '<lang>.json'
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_files pf WHERE pf.project_id = p.id
);

-- 5. Backfill file_id on translation keys that do not have one
UPDATE translation_keys tk
SET file_id = (
  SELECT pf.id
  FROM project_files pf
  WHERE pf.project_id = tk.project_id
  ORDER BY pf.created_at ASC, pf.id ASC
  LIMIT 1
)
WHERE tk.file_id IS NULL;

-- 6. Make file_id NOT NULL
ALTER TABLE translation_keys ALTER COLUMN file_id SET NOT NULL;

-- 7. Sanity check: no duplicates should exist on the new unique tuple.
--    If this returns rows, the unique index creation below will fail.
SELECT project_id, file_id, key_name, COUNT(*)
    FROM translation_keys
    WHERE deleted_at IS NULL
    GROUP BY project_id, file_id, key_name
    HAVING COUNT(*) > 1;

-- 8. Replace the old unique index (project_id, key_name) with (project_id, file_id, key_name)
DROP INDEX IF EXISTS unique_project_key;
CREATE UNIQUE INDEX IF NOT EXISTS unique_project_file_key
  ON translation_keys (project_id, file_id, key_name);

COMMIT;
