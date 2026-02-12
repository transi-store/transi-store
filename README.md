# transi-store

Outil de gestion de traductions multi-projets, multi-organisations.

## Description

transi-store est une application web permettant de gerer les traductions de chaines de caracteres en plusieurs langues. Il remplace des outils comme Phrase, Crowdin, Transifex ou POEditor.

## Fonctionnalites

### Gestion des traductions

- **Multi-organisations** : Chaque utilisateur peut appartenir a plusieurs organisations
- **Multi-projets** : Chaque organisation peut avoir plusieurs projets de traduction
- **Multi-langues** : Support de plusieurs langues par projet avec langues par defaut
- **Cles de traduction** : Gestion centralisee des cles avec descriptions pour les traducteurs
- **Editeur ICU MessageFormat** : Syntaxe ICU pour pluralisation, genre, et variables avec validation en temps reel
- **Recherche floue** : Recherche puissante sur les cles et valeurs avec PostgreSQL pg_trgm

### Import/Export

- **API d'export** : Telechargement des traductions en JSON (plat ou multi-langues) et XLIFF 2.0
- **Cles d'API** : Authentification par Bearer token pour integration CI/CD
- **Import JSON** : Import en masse de traductions avec strategies (overwrite/skip)

### Collaboration

- **Gestion d'equipe** : Invitation d'utilisateurs par email avec codes d'invitation
- **Multi-utilisateurs** : Plusieurs membres par organisation avec acces partage aux projets
- **Authentification OAuth2/OIDC** : Support multi-provider (Google, Mapado) avec PKCE

## Demarrage rapide

### Prerequis

- Docker et Docker Compose
- **Make (fortement recommandé)**
  - **Linux/Mac** : généralement pré-installé
  - **Windows** : installer via Chocolatey `choco install make`
    ```powershell
    # Dans PowerShell en administrateur
    choco install make
    ```

> **Note** : L'application s'exécute entièrement dans Docker. Node.js et Yarn ne sont pas nécessaires sur votre machine hôte.

### Installation

1. Cloner le repository :

```bash
git clone <repo-url>
cd transi-store
```

2. Copier le fichier d'environnement :

```bash
cp .env.example .env
```

3. Configurer les variables d'environnement dans `.env` :

- `DATABASE_URL` : Utiliser `postgres` comme host (ex: `postgresql://transi-store:transi-store@postgres:5432/transi-store`)
- `SESSION_SECRET` : Secret pour les sessions
- `ENCRYPTION_KEY` : Clé de chiffrement
- Configurer les providers OAuth si nécessaire (au moins un provider est requis pour l'authentification) :
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` : Identifiants OAuth Google
  - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` : Identifiants OAuth GitHub
  - `MAPADO_CLIENT_ID` / `MAPADO_CLIENT_SECRET` : Identifiants OAuth Mapado

4. Setup complet en une commande :

```bash
make setup
```

Cette commande va :

- Démarrer les conteneurs Docker (app + PostgreSQL)
- Installer les dépendances
- Créer le schéma de base de données

5. Demarrer le serveur de developpement :

```bash
make dev
```

L'application sera disponible sur http://localhost:5173

<details>
<summary><strong>⚠️ Utilisation sans Make (non recommandé)</strong></summary>

Si vous ne pouvez vraiment pas installer Make, vous pouvez utiliser directement les commandes Docker Compose :

```bash
# Setup initial
docker compose up -d
docker compose exec app yarn install
docker compose exec app yarn db:push

# Développement
docker compose exec app yarn dev
docker compose exec app yarn build
docker compose exec app yarn lint:types

# Base de données
docker compose exec app yarn db:push
docker compose exec app yarn db:studio
docker compose exec app yarn db:setup-search
```

**Important** : Cette approche n'est pas recommandée et rend les commandes plus longues et difficiles à retenir. Installez Make pour une meilleure expérience.

</details>

## Commandes disponibles

Tapez `make help` pour voir toutes les commandes disponibles. Principales commandes :

| Commande          | Description                                         |
| ----------------- | --------------------------------------------------- |
| `make help`       | Affiche toutes les commandes disponibles            |
| `make setup`      | Setup initial complet (première utilisation)        |
| `make dev`        | Démarre le serveur de développement                 |
| `make build`      | Build l'application pour la production              |
| `make up`         | Démarre les conteneurs Docker                       |
| `make down`       | Arrête les conteneurs Docker                        |
| `make logs`       | Affiche les logs en temps réel                      |
| `make shell`      | Ouvre un shell dans le conteneur app                |
| `make install`    | Installe/met à jour les dépendances                 |
| `make db-push`    | Applique le schéma à la base de données             |
| `make db-studio`  | Ouvre Drizzle Studio                                |
| `make db-reset`   | Recrée la base de données (⚠️ supprime les données) |
| `make lint-types` | Vérifie les types TypeScript                        |
| `make knip`       | Analyse les imports/exports non utilisés            |

## Structure du projet

```
transi-store/
├── app/                    # Code applicatif React Router
│   ├── routes/            # Routes (file-based routing)
│   ├── components/        # Composants React
│   └── lib/               # Utilitaires et helpers
├── drizzle/               # Schema et migrations Drizzle
├── docs/                  # Documentation
│   └── decisions/         # Architecture Decision Records
└── docker-compose.yml     # Configuration Docker
```

## Stack technique

| Composant       | Technologie                      |
| --------------- | -------------------------------- |
| Frontend        | React 19 + TypeScript            |
| Build           | Vite                             |
| Routing         | React Router v7 (mode framework) |
| Design System   | Chakra UI v3                     |
| Package Manager | Yarn Berry (v4)                  |
| Base de donnees | PostgreSQL                       |
| ORM             | Drizzle ORM                      |
| Auth            | OAuth2/OIDC                      |

## Documentation technique

### Architecture et implementation

- **[Notes techniques](./docs/technical-notes/)** : Documentation detaillee de l'architecture, patterns, et systemes
- **[Decisions d'architecture (ADR)](./docs/decisions/)** : Historique des decisions techniques importantes

### Pour les developpeurs

Consultez le dossier [`docs/technical-notes/`](./docs/technical-notes/) pour comprendre :

- L'architecture generale du projet
- Le systeme d'authentification OAuth2/OIDC
- Le schema de base de donnees
- L'API d'export et le systeme d'import
- Les patterns de code utilises

## Licence

GNU AFFERO GENERAL PUBLIC LICENSE Version 3 (AGPL-3.0). See [LICENSE](./LICENSE) for details.
