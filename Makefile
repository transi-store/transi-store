.PHONY: help dev build start stop restart logs shell install typecheck db-push db-studio db-setup db-reset clean up down ps

# Default target
help:
	@echo "transi-store - Makefile commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development server (http://localhost:5176)"
	@echo "  make dev-build    - Rebuild and start dev server (after Dockerfile changes)"
	@echo "  make logs         - Show application logs"
	@echo "  make shell        - Open shell in app container"
	@echo "  make restart      - Restart the app container"
	@echo ""
	@echo "Build & Production:"
	@echo "  make build        - Build the application"
	@echo "  make start        - Start production server (http://localhost:3000)"
	@echo ""
	@echo "Dependencies:"
	@echo "  make install      - Install/update dependencies"
	@echo ""
	@echo "Type checking:"
	@echo "  make typecheck    - Run TypeScript type checking"
	@echo ""
	@echo "Database:"
	@echo "  make db-push      - Apply database schema"
	@echo "  make db-studio    - Open Drizzle Studio"
	@echo "  make db-setup     - Setup fuzzy search (run once)"
	@echo "  make db-reset     - Reset database (WARNING: deletes all data)"
	@echo ""
	@echo "Docker management:"
	@echo "  make up           - Start all services"
	@echo "  make down         - Stop all services"
	@echo "  make stop         - Stop all services (alias for down)"
	@echo "  make ps           - Show running containers"
	@echo "  make clean        - Stop and remove volumes (WARNING: deletes data)"
	@echo ""

# Development
dev:
	@echo "🚀 Starting development server..."
	@docker compose up -d
	@echo "✅ Services started! Logs: make logs"

dev-build:
	@echo "🔨 Rebuilding dev containers..."
	@docker compose up --build -d

up:
	@docker compose up -d

logs:
	@docker compose logs -f app

shell:
	@docker compose exec app sh

restart:
	@docker compose restart app

# Build
build:
	@echo "🏗️  Building application..."
	@docker compose exec app yarn build

# Production
start:
	@echo "🚀 Starting production server..."
	@docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
	@echo "✅ Production services started on http://localhost:3000"

# Dependencies
install:
	@echo "📦 Installing dependencies..."
	@docker compose run --rm app yarn install

# Type checking
typecheck:
	@echo "🔍 Running type check..."
	@docker compose exec app yarn typecheck

# Database commands
db-push:
	@echo "📊 Applying database schema..."
	@docker compose exec app yarn db:push

db-studio:
	@echo "🎨 Opening Drizzle Studio..."
	@docker compose exec app yarn db:studio

db-setup:
	@echo "🔍 Setting up fuzzy search..."
	@docker compose exec app yarn db:setup-search

db-reset:
	@echo "⚠️  WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v; \
		docker compose up -d postgres; \
		sleep 5; \
		docker compose exec app yarn db:push; \
		echo "✅ Database reset complete"; \
	else \
		echo "❌ Cancelled"; \
	fi

# Docker management
down:
	@docker compose down

stop: down

ps:
	@docker compose ps

clean:
	@echo "⚠️  WARNING: This will delete all volumes and data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v; \
		echo "✅ Cleanup complete"; \
	else \
		echo "❌ Cancelled"; \
	fi
