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
