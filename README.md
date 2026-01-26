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

## Demarrage rapide

### Prerequis

- Docker & Docker Compose (ou Docker Desktop)
- Make (généralement préinstallé sur Linux/macOS)

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

- `DATABASE_URL` : URL de connexion a la base de données (par défaut : `postgresql://transi-store:transi-store@postgres:5432/transi-store`)
- `SESSION_SECRET` : Secret pour les sessions (générer une chaîne aléatoire)
- `MAPADO_*` ou `GOOGLE_*` : Configuration OAuth (optionnel selon le provider)

4. Demarrer l'application :

```bash
make dev
```

L'application build automatiquement les images Docker et démarre tous les services.

5. Dans un autre terminal, appliquer le schema de base de donnees :

```bash
make db-push
```

6. Optionnel : activer la recherche floue (une seule fois) :

```bash
make db-setup
```

L'application sera disponible sur http://localhost:5173

**Note** : Toutes les commandes `yarn` sont remplacées par des commandes `make`. Voir la section "Scripts disponibles" ci-dessous.

## Scripts disponibles

| Commande          | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `make dev`        | Demarre le serveur de developpement (port 5173)     |
| `make build`      | Build l'application pour la production               |
| `make start`      | Demarre l'application en production (port 3000)      |
| `make install`    | Installe/met a jour les dependances                  |
| `make typecheck`  | Verifie les types TypeScript                         |
| `make db-push`    | Applique le schema a la base de donnees              |
| `make db-studio`  | Ouvre Drizzle Studio                                 |
| `make db-setup`   | Active la recherche floue (une seule fois)           |
| `make logs`       | Affiche les logs de l'application                    |
| `make shell`      | Ouvre un shell dans le container de l'application    |
| `make down`       | Arrete tous les services                             |
| `make clean`      | Arrete et supprime les volumes (⚠️ supprime les donnees) |

Utilisez `make help` pour voir toutes les commandes disponibles.

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

Proprietaire - Tous droits reserves
