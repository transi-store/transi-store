.PHONY: help up down restart logs ps shell install dev build db-generate db-push db-studio db-setup-search lint-types knip clean

# Couleurs pour l'aide
BLUE := \033[0;34m
NC := \033[0m # No Color

help: ## Affiche cette aide
	@echo "$(BLUE)Commandes disponibles :$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-20s$(NC) %s\n", $$1, $$2}'

## Docker
up: ## Démarre les services Docker
	docker compose up -d

down: ## Arrête les services Docker
	docker compose down

restart: ## Redémarre les services Docker
	docker compose restart

logs: ## Affiche les logs (Ctrl+C pour quitter)
	docker compose logs -f

logs-app: ## Affiche les logs de l'application uniquement
	docker compose logs -f app

logs-db: ## Affiche les logs de la base de données uniquement
	docker compose logs -f postgres

ps: ## Liste les conteneurs actifs
	docker compose ps

shell: ## Ouvre un shell dans le conteneur app
	docker compose exec app sh

## Développement
install: ## Installe les dépendances
	docker compose exec app yarn install

dev: ## Lance le serveur de développement
	docker compose exec app yarn dev

build: ## Build l'application
	docker compose exec app yarn build

start: ## Démarre l'application en production
	docker compose exec app yarn start

lint-types: ## Vérifie les types TypeScript
	docker compose exec app yarn lint:types

knip: ## Analyse les imports/exports non utilisés
	docker compose exec app yarn knip

## Base de données
db-generate: ## Génère les migrations de la base de données
	docker compose exec app yarn db:generate

db-push: ## Pousse les modifications du schéma vers la base de données
	docker compose exec app yarn db:push

db-studio: ## Ouvre Drizzle Studio
	docker compose exec app yarn db:studio

db-setup-search: ## Configure la recherche fuzzy dans PostgreSQL
	docker compose exec app yarn db:setup-search

db-reset: ## Recrée la base de données (ATTENTION: supprime toutes les données!)
	docker compose down -v
	docker compose up -d postgres
	@echo "Attente du démarrage de PostgreSQL..."
	@sleep 5
	$(MAKE) db-push

## Nettoyage
clean: ## Nettoie les conteneurs, volumes et images
	docker compose down -v
	docker system prune -f

clean-all: ## Nettoie tout (conteneurs, volumes, images, node_modules)
	docker compose down -v
	docker system prune -af
	rm -rf node_modules .yarn/cache

## Setup initial
setup: up install db-push ## Setup initial du projet (démarre Docker, installe les dépendances, crée la DB)
	@echo "$(BLUE)✓ Setup terminé! Lancez 'make dev' pour démarrer le serveur de développement.$(NC)"
