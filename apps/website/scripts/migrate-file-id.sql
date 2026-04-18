-- Migration : project_files sans colonne name, file_id NOT NULL sur translation_keys
--
-- Ordre d'exécution :
--   1. Exécuter ce script SQL sur la base de production
--   2. Déployer le nouveau code (db:push pour appliquer la contrainte NOT NULL et
--      supprimer la colonne name si elle n'a pas encore été retirée)
--
-- Le script est idempotent : il peut être relancé sans effet de bord.

BEGIN;

-- 1. Créer la table project_files si elle n'existe pas encore (nouvelle installation)
CREATE TABLE IF NOT EXISTS project_files (
  id         SERIAL      PRIMARY KEY,
  project_id INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  format     VARCHAR(20) NOT NULL,
  file_path  VARCHAR(500) NOT NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- 2. Ajouter file_id sur translation_keys si elle n'existe pas encore
ALTER TABLE translation_keys
  ADD COLUMN IF NOT EXISTS file_id INTEGER REFERENCES project_files(id) ON DELETE CASCADE;

-- 3. Pour chaque projet sans fichier, créer un fichier par défaut
INSERT INTO project_files (project_id, format, file_path)
SELECT p.id, 'json', '<lang>.json'
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_files pf WHERE pf.project_id = p.id
);

-- 4. Backfill file_id sur les clés de traduction qui n'en ont pas
UPDATE translation_keys tk
SET file_id = (
  SELECT pf.id
  FROM project_files pf
  WHERE pf.project_id = tk.project_id
  ORDER BY pf.created_at ASC, pf.id ASC
  LIMIT 1
)
WHERE tk.file_id IS NULL;

-- 5. Rendre file_id NOT NULL
ALTER TABLE translation_keys ALTER COLUMN file_id SET NOT NULL;

-- 6. Créer l'index unique sur (project_id, file_path) si absent
CREATE UNIQUE INDEX IF NOT EXISTS unique_project_file_path
  ON project_files (project_id, file_path);

COMMIT;
