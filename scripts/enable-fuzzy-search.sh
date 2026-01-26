#!/bin/bash

# Script pour activer l'extension pg_trgm pour la recherche floue
# Ce script doit être exécuté une seule fois après la création de la base de données

echo "🔍 Activation de l'extension pg_trgm pour la recherche floue..."

# Récupérer les variables d'environnement depuis .env si disponible
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# SQL à exécuter
SQL_COMMANDS=$(cat << 'EOF'
-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for trigram search on translation_keys
CREATE INDEX IF NOT EXISTS idx_translation_keys_keyname_trgm 
  ON translation_keys USING gin (key_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_translation_keys_description_trgm 
  ON translation_keys USING gin (description gin_trgm_ops);

-- Create GIN index for trigram search on translations
CREATE INDEX IF NOT EXISTS idx_translations_value_trgm 
  ON translations USING gin (value gin_trgm_ops);

-- Vérifier que l'extension est activée
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_trgm';

-- Vérifier que les index ont été créés
SELECT indexname, tablename FROM pg_indexes 
WHERE indexname LIKE '%_trgm' 
ORDER BY tablename, indexname;
EOF
)

# Déterminer comment se connecter à la base de données
if [ -n "$DATABASE_URL" ]; then
  # Utiliser DATABASE_URL si défini (connexion distante via Docker)
  echo "📡 Connexion à la base de données distante via DATABASE_URL..."
  
  echo "$SQL_COMMANDS" | docker run --rm -i postgres:18 psql "$FINAL_URL"
  EXIT_CODE=$?
else
  # Utiliser Docker Compose (défaut)
  echo "🐳 Connexion à la base de données via Docker Compose..."
  DB_USER=${DB_USER:-transi-store}
  DB_NAME=${DB_DATABASE:-transi-store}
  echo "$SQL_COMMANDS" | docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME"
  EXIT_CODE=$?
fi

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Extension pg_trgm et index GIN créés avec succès!"
  echo ""
  echo "La recherche floue est maintenant activée."
  echo "Les index trigram amélioreront les performances de recherche."
else
  echo "❌ Erreur lors de l'activation de l'extension"
  exit 1
fi