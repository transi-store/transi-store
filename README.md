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
| Base de donnees | MariaDB                          |
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

- `DATABASE_URL` : URL de connexion a MariaDB
- `OIDC_ISSUER` : URL de l'issuer OIDC
- `OIDC_CLIENT_ID` : Client ID OAuth
- `OIDC_CLIENT_SECRET` : Client Secret OAuth
- `SESSION_SECRET` : Secret pour les sessions

5. Demarrer MariaDB :

```bash
docker compose up -d
```

6. Appliquer le schema de base de donnees :

```bash
yarn db:push
```

7. Demarrer le serveur de developpement :

```bash
yarn dev
```

L'application sera disponible sur http://localhost:5173

## Scripts disponibles

| Script             | Description                             |
| ------------------ | --------------------------------------- |
| `yarn dev`         | Demarre le serveur de developpement     |
| `yarn build`       | Build l'application pour la production  |
| `yarn start`       | Demarre l'application en production     |
| `yarn typecheck`   | Verifie les types TypeScript            |
| `yarn db:generate` | Genere les migrations Drizzle           |
| `yarn db:push`     | Applique le schema a la base de donnees |
| `yarn db:studio`   | Ouvre Drizzle Studio                    |

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

⚠️ **IMPORTANT : Documentation obligatoire**

**Toute décision technique importante doit être documentée** dans le dossier `docs/decisions/` sous forme d'ADR (Architecture Decision Record).

Cela inclut :

- Choix de bibliothèques ou frameworks
- Modifications du système de design
- Changements d'architecture
- Décisions impactant la base de code

Les decisions d'architecture sont documentees dans le dossier `docs/decisions/`.

### ADR-001 : Stack technique

**Contexte** : Choix de la stack technique pour le projet.

**Decision** :

- React 19 + TypeScript pour le frontend
- React Router v7 en mode framework pour le routing et le SSR
- Chakra UI v3 pour le design system
- Drizzle ORM pour l'acces a la base de donnees
- MariaDB comme base de donnees

**Raisons** :

- React Router v7 permet d'avoir un framework full-stack avec loaders/actions
- Drizzle ORM offre un excellent typage TypeScript
- Chakra UI v3 est moderne et accessible

### ADR-002 : Multi-tenant avec organisations

**Contexte** : Permettre a plusieurs entreprises d'utiliser l'application.

**Decision** :

- Creer une entite "Organisation"
- Les projets appartiennent a une organisation
- Un utilisateur peut etre membre de plusieurs organisations

**Raisons** :

- Isolation des donnees entre entreprises
- Flexibilite pour les utilisateurs travaillant sur plusieurs projets

### ADR-003 : Ajout d'icônes avec react-icons

**Date** : 2026-01-23

**Contexte** : Interface manquant de repères visuels pour différencier les actions.

**Decision** : Utilisation de react-icons avec les icônes Lucide pour tous les boutons d'action.

**Détails** : Voir [ADR-003](./docs/decisions/ADR-003-icones-react-icons.md)

### ADR-004 : Thème personnalisé avec les couleurs Mapado

**Date** : 2026-01-23

**Contexte** : Interface trop neutre, manque d'identité visuelle alignée avec la charte Mapado.

**Decision** : Création d'un système de thème Chakra UI v3 personnalisé intégrant la palette de couleurs officielle Mapado.

**Détails** : Voir [ADR-004](./docs/decisions/ADR-004-theme-couleurs-mapado.md)

### ADR-005 : Import de traductions depuis fichiers JSON

**Date** : 2026-01-23

**Contexte** : Besoin d'importer des traductions depuis des services tiers ou fichiers existants. Création manuelle trop fastidieuse pour de gros volumes.

**Decision** : Implémentation d'une fonctionnalité d'import de fichiers JSON (format clé/valeur) avec choix de langue cible et stratégie (skip/overwrite).

**Détails** : Voir [ADR-005](./docs/decisions/ADR-005-import-traductions-json.md)

### ADR-006 : Clés d'API pour l'export de données

**Date** : 2026-01-23

**Contexte** : Export des traductions nécessite actuellement une authentification OAuth2, inadaptée pour l'automatisation (CI/CD, scripts).

**Decision** : Implémentation d'un système de clés d'API permettant l'export automatisé des traductions sans interaction humaine. Les clés sont liées à l'organisation et utilisent l'authentification Bearer.

**Détails** : Voir [ADR-006](./docs/decisions/ADR-006-cles-api-export.md)

## Licence

Proprietaire - Tous droits reserves
