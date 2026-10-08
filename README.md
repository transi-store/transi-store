# transi-store

**The open-source translation management platform for developer teams.**

Stop paying for Phrase, Crowdin, or Transifex. Host your own translation platform with a first-class developer experience — export API, CLI, CI/CD integration, and ICU MessageFormat support out of the box.

🌐 **Hosted version**: [transi-store.com](https://transi-store.com)

---

## Why transi-store?

Managing translations across multiple projects and teams is painful. Most tools are either too expensive, too complex, or too locked-in. transi-store is different:

- **Free & self-hosted** — run it on your own infrastructure, no per-seat pricing
- **Developer-first** — REST API, CLI, and CI/CD workflows built in from day one
- **Multi-tenant** — manage multiple organisations and projects from a single instance
- **ICU MessageFormat** — proper pluralisation, gender, and variable support with live validation
- **Blazing fast search** — PostgreSQL `pg_trgm` fuzzy search across all your keys and values
- **Modern stack** — React 19, React Router v7 SSR, Drizzle ORM, TypeScript end-to-end

---

## Features

### 🗂️ Translation management

- **Multi-organisation** — one instance, multiple teams, fully isolated data
- **Multi-project** — as many projects per organisation as you need
- **Multi-language** — unlimited locales per project with configurable defaults
- **ICU MessageFormat editor** — syntax highlighting (CodeMirror), real-time validation, pluralisation and variables
- **Fuzzy search** — find any key or value instantly, powered by PostgreSQL `pg_trgm`
- **Branch support** — work on translation changes in branches, just like code

### 🔌 Integrations

- **Export API** — download translations in multiple formats: JSON, XLIFF, YAML, CSV, Gettext PO, INI, PHP
- **Import API** — bulk-upload translations with `overwrite` or `skip` strategies
- **API keys** — Bearer token auth for CI/CD pipelines, with usage tracking
- **CLI** — `@transi-store/cli` package to sync translations in your build pipeline

### 👥 Collaboration

- **Team management** — invite members by email with invitation codes
- **Multi-user** — shared access to projects within an organisation
- **OAuth2/OIDC** — sign in with Google, GitHub, or any OIDC provider

---

## Quick Start

> **Prerequisites**: [Docker](https://docs.docker.com/get-docker/) and [Make](https://www.gnu.org/software/make/)
> — Node.js and Yarn are **not** required on your host machine, everything runs inside Docker.

### 1. Clone & configure

```bash
git clone https://github.com/transi-store/transi-store.git
cd transi-store
cp .env.example .env
```

Open `.env` and configure at minimum:

```bash
DOMAIN_ROOT=https://example.com

# Database connection string for website and scripts
DATABASE_URL=postgresql://transi-store:transi-store@localhost:5432/transi-store

SESSION_SECRET=a-long-random-secret-string
ENCRYPTION_KEY=a-64-character-hexadecimal-key # generate one with `openssl rand -hex 32`

# Optional admin email notifications (SMTP)
# If ADMIN_NOTIFICATION_EMAIL is empty, no notification is sent.
# SMTP_HOST, SMTP_USER and SMTP_PASSWORD are required when enabled.
ADMIN_NOTIFICATION_EMAIL=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=

# At least one OAuth provider is required for authentication.
# Google OAuth (optional)
# Get your credentials at: https://console.cloud.google.com/apis/credentials > Create Credentials > OAuth 2.0 Client IDs > Authorized redirect URIs: your-domain-root:your-port/auth/google/callback
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth (optional)
# Get your creadentials at: https://github.com/settings/developers > New OAuth App > Authorization callback URL: your-domain-root:your-port/auth/github/callback
# GITHUB_CLIENT_ID=your_client_id
# GITHUB_CLIENT_SECRET=your_client_secret
```

> The `DATABASE_URL` is pre-configured for the Docker Compose PostgreSQL container and doesn't need to be changed.

### 2. Start everything

```bash
make setup   # starts Docker, installs dependencies, creates the database schema
make dev     # starts the dev server
```

Open **[http://localhost:5173](http://localhost:5173)** — that's it! 🎉

---

## Integrate with your project

### CLI — sync translations in your CI/CD

Install the CLI:

```bash
npm install -g @transi-store/cli
```

Create a `transi-store.config.json` in your project:

```jsonc
{
  "$schema": "https://unpkg.com/@transi-store/cli/schema.json",
  "org": "my-org",
  "projects": [
    {
      "project": "my-app",
      "langs": ["en", "fr", "de"],
      "format": "json",
      "output": "./locales/<lang>/translations.json",
    },
  ],
}
```

Download translations (set `TRANSI_STORE_API_KEY` in your environment):

```bash
TRANSI_STORE_API_KEY=your-api-key transi-store
```

### REST API — fetch translations programmatically

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-instance.com/api/orgs/my-org/projects/my-app/translations?format=json&locale=fr"
```

### GitHub Actions example

```yaml
- name: Download translations
  env:
    TRANSI_STORE_API_KEY: ${{ secrets.TRANSI_STORE_API_KEY }}
  run: |
    npx @transi-store/cli
```

---

## Available commands

```bash
make help        # list all available commands
make setup       # first-time setup (Docker + deps + DB schema)
make dev         # start dev server at http://localhost:5173
make build       # production build
make test        # run tests
make lint-types  # TypeScript type check
make knip        # find unused code and dependencies
make shell       # open a shell inside the app container
make db-push     # apply schema changes to the database
make db-studio   # open Drizzle Studio (database GUI)
make db-reset    # ⚠️  recreate the database (deletes all data)
make logs        # tail all Docker logs
make up / down   # start/stop Docker containers
```

<details>
<summary>Using without Make</summary>

```bash
# Setup
docker compose up -d
docker compose exec app yarn install
docker compose exec app yarn db:push

# Development
docker compose exec app yarn dev

# Other commands
docker compose exec app yarn build
docker compose exec app yarn test
docker compose exec app yarn lint:types
docker compose exec app yarn db:studio
```

</details>

---

## Tech stack

| Layer           | Technology                             |
| --------------- | -------------------------------------- |
| Framework       | React Router v7 (SSR)                  |
| UI              | React 19 + Chakra UI v3                |
| Build           | Vite                                   |
| Package manager | Yarn Berry v4 (monorepo)               |
| Database        | PostgreSQL 18 + Drizzle ORM            |
| Auth            | OAuth2/OIDC via Arctic (PKCE)          |
| Search          | PostgreSQL `pg_trgm` + GIN indexes     |
| Editor          | CodeMirror 6 (ICU MessageFormat)       |
| Testing         | Vitest + PGlite (in-memory PostgreSQL) |

---

## Project structure

```
transi-store/
├── apps/website/           # Main web application (React Router v7)
│   ├── app/                # Routes, components, server logic
│   ├── drizzle/            # Database schema & relations
│   └── tests/              # Test setup (PGlite)
├── packages/
│   ├── cli/                # @transi-store/cli — download/upload translations
│   └── common/             # Shared types and utilities
├── docs/
│   ├── technical-notes/    # Architecture, patterns, API docs
│   └── decisions/          # Architecture Decision Records (ADRs)
└── docker-compose.yml      # PostgreSQL + app containers
```

---

## Documentation

- **[Technical notes](./docs/technical-notes/)** — architecture, authentication, database schema, export/import API, coding patterns
- **[Architecture Decision Records](./docs/decisions/)** — history of key technical decisions
- **[CLI README](./packages/cli/README.md)** — CLI usage and configuration reference

---

## Contributing

Contributions are welcome! Please read the technical notes before submitting a PR:

1. Fork the repository
2. Run `make setup && make dev` to get your environment running
3. Run `make lint-types` and `make knip` before committing
4. Submit a PR with a clear description of your change

---

## License

[GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE) — free to use, modify, and self-host. If you distribute a modified version as a web service, you must publish your source code.
