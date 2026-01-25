# transi-store

Outil de gestion de traductions multi-projets, multi-organisations.

## Description

transi-store est une application web permettant de gerer les traductions de chaines de caracteres en plusieurs langues. Il remplace des outils comme Phrase, Crowdin, Transifex ou POEditor.

## Fonctionnalites

- **Multi-organisations** : Chaque utilisateur peut appartenir a plusieurs organisations
- **Multi-projets** : Chaque organisation peut avoir plusieurs projets de traduction
- **Multi-langues** : Chaque projet peut supporter plusieurs langues
- **API d'export** : Telechargement des traductions en JSON et XLIFF
- **Recherche globale** : Recherche sur les cles et les valeurs de traduction
- **Authentification OAuth2/OIDC** : Connexion via un provider OIDC

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

- Node.js 20+
- Yarn Berry
- Docker et Docker Compose

### Installation

1. Cloner le repository :

```bash
git clone <repo-url>
cd transi-store
```

2. Installer les dependances :

```bash
yarn install
```

3. Copier le fichier d'environnement :

```bash
cp .env.example .env
```

4. Configurer les variables d'environnement dans `.env` :

- `DATABASE_URL` : URL de connexion a la base de données
- `OIDC_ISSUER` : URL de l'issuer OIDC
- `OIDC_CLIENT_ID` : Client ID OAuth
- `OIDC_CLIENT_SECRET` : Client Secret OAuth
- `SESSION_SECRET` : Secret pour les sessions

5. Demarrer PostgreSQL :

```bash
docker compose up -d
```

6. Appliquer le schema de base de donnees :

```bash
yarn db:push
```

7. Activer la recherche floue (une seule fois) :

```bash
yarn db:setup-search
```

8. Demarrer le serveur de developpement :

```bash
yarn dev
```

L'application sera disponible sur http://localhost:5173

## Scripts disponibles

| Script                 | Description                                |
| ---------------------- | ------------------------------------------ |
| `yarn dev`             | Demarre le serveur de developpement        |
| `yarn build`           | Build l'application pour la production     |
| `yarn start`           | Demarre l'application en production        |
| `yarn typecheck`       | Verifie les types TypeScript               |
| `yarn db:generate`     | Genere les migrations Drizzle              |
| `yarn db:push`         | Applique le schema a la base de donnees    |
| `yarn db:studio`       | Ouvre Drizzle Studio                       |
| `yarn db:setup-search` | Active la recherche floue (une seule fois) |

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

## Decisions d'architecture

Les decisions d'architecture sont documentees dans le dossier [`docs/decisions/`](./docs/decisions/).

Consultez le [README des ADR](./docs/decisions/README.md) pour :

- La liste complete des decisions architecturales
- Le processus de creation d'un nouvel ADR
- Le template a utiliser

## Licence

Proprietaire - Tous droits reserves
