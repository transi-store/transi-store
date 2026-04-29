.PHONY: help up down restart logs ps shell install dev build test db-generate db-push db-studio db-setup-search lint-types knip clean

# Colors for help
BLUE := \033[0;34m
NC := \033[0m # No Color

help: ## Display this help
	@echo "$(BLUE)Available commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-20s$(NC) %s\n", $$1, $$2}'

## Docker
up: ## Start Docker services
	docker compose up -d

down: ## Stop Docker services
	docker compose down

restart: ## Restart Docker services
	docker compose restart

logs: ## Display logs (Ctrl+C to quit)
	docker compose logs -f

logs-app: ## Display application logs only
	docker compose logs -f app

logs-db: ## Display database logs only
	docker compose logs -f postgres

ps: ## List active containers
	docker compose ps

shell: ## Open a shell in the app container
	docker compose exec app sh

## Development
install: ## Install dependencies
	docker compose exec app yarn install

dev: ## Start the development server
	docker compose exec app yarn dev

build: ## Build the application
	docker compose exec app yarn build

build-common: ## Build the common package
	docker compose exec app yarn build:common

start: ## Start the application in production
	docker compose exec app yarn start

test: ## Run tests
	docker compose exec app yarn test --run

lint-types: ## Check TypeScript types
	docker compose exec app yarn lint:types

knip: ## Analyze unused imports/exports
	docker compose exec app yarn knip

## Database
db-generate: ## Generate database migrations
	docker compose exec app yarn db:generate

db-push: ## Push schema changes to the database
	docker compose exec app yarn db:push

db-studio: ## Open Drizzle Studio
	docker compose exec app yarn db:studio

db-setup-search: ## Configure fuzzy search in PostgreSQL
	sh scripts/enable-fuzzy-search.sh

db-reset: ## Recreate the database (WARNING: deletes all data!)
	docker compose down -v
	docker compose up -d postgres
	@echo "Waiting for PostgreSQL to start..."
	@sleep 5
	$(MAKE) db-push

## Cleanup
clean: ## Clean containers, volumes and images
	docker compose down -v
	docker system prune -f

clean-all: ## Clean all (containers, volumes, images, node_modules)
	docker compose down -v
	docker system prune -af
	rm -rf node_modules .yarn/cache

## Initial setup
setup: up install build-common db-push ## Initial project setup (starts Docker, installs dependencies, creates the DB)
	@echo "$(BLUE)✓ Setup done! Run \"make dev\" to start the development server.$(NC)"
