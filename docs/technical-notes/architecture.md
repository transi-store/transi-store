# Architecture générale

## Vue d'ensemble

transi-store est une application full-stack React Router v7 avec SSR (Server-Side Rendering). L'architecture suit un pattern classique de framework full-stack où les routes gèrent à la fois le rendu côté serveur et les interactions client.

## Structure du projet

```
transi-store/
├── app/                     # Code applicatif React Router
│   ├── routes.ts           # Configuration centralisée des routes
│   ├── root.tsx            # Layout principal (header, session)
│   ├── routes/             # Route handlers (loaders, actions, composants)
│   ├── components/         # Composants React réutilisables
│   ├── lib/                # Utilitaires et logique serveur (*.server.ts)
│   └── entry.server.tsx    # Point d'entrée SSR
├── drizzle/                # Schéma et relations Drizzle ORM
│   ├── schema.ts           # Définitions des tables PostgreSQL
│   └── relations.ts        # Relations entre tables
├── docs/                   # Documentation
│   ├── decisions/          # Architecture Decision Records
│   └── technical-notes/    # Notes techniques détaillées
└── scripts/                # Scripts utilitaires (setup DB, etc.)
```

## Pattern architectural

### React Router v7 avec SSR

Le projet utilise React Router v7 en mode "framework" qui fournit :

- **SSR complet** : Rendu côté serveur de toutes les pages
- **Loaders** : Chargement de données serveur avant le rendu
- **Actions** : Mutations de données via form submissions
- **File-based + configuration** : Routes définies dans `app/routes.ts`

### Séparation client/serveur

```
Route component (client + server)
    │
    ├─→ loader() → *.server.ts → Database
    ├─→ action() → *.server.ts → Database
    └─→ Component (client render)
```

**Fichiers `.server.ts`** : Code qui ne sera JAMAIS envoyé au client

- Logique métier
- Accès base de données
- Secrets (clés API, tokens OAuth)

**Fichiers `.tsx` dans routes/** : Peuvent contenir du code client et serveur

- Loaders et actions = serveur
- Composant React = client (après hydratation)

## Hiérarchie des entités

```
Organization (tenant/workspace)
  │
  ├─→ OrganizationMembers (utilisateurs avec accès)
  ├─→ OrganizationInvitations (invitations en attente)
  ├─→ ApiKeys (clés pour export programmatique)
  │
  └─→ Projects (projets de traduction)
        │
        ├─→ ProjectLanguages (locales supportées)
        │
        └─→ TranslationKeys (clés de traduction)
              │
              └─→ Translations (valeurs traduites par locale)
```

### Multi-tenant via organisations

- Chaque utilisateur peut appartenir à plusieurs organisations
- Les données sont isolées par organisation
- Toutes les opérations vérifient l'appartenance à l'organisation via `requireOrganizationMembership()`

## Flow de données

### 1. Requête entrante

```
User Request → React Router → Route Loader → Server logic → Database
                                    ↓
                            Render with data
                                    ↓
                           Send HTML to client
```

### 2. Mutation (formulaire)

```
Form Submit → React Router → Route Action → Server logic → Database
                                    ↓
                           Redirect or return data
                                    ↓
                         Client updates or navigates
```

## Technologies clés

### Frontend

- **React 19** : Bibliothèque UI avec hooks modernes
- **Chakra UI v3** : Système de design avec composants accessibles
- **CodeMirror 6** : Éditeur de code pour syntaxe ICU

### Backend

- **React Router v7** : Framework full-stack avec SSR
- **Drizzle ORM** : ORM TypeScript-first pour PostgreSQL
- **Arctic** : Client OAuth2/OIDC pour authentification
- **Jose** : Manipulation de JWT (pour provider Mapado)

### Base de données

- **PostgreSQL 17** : Base de données relationnelle
- **pg_trgm** : Extension pour recherche floue
- **GIN indexes** : Index pour optimiser la recherche

### Build & Dev

- **Vite** : Build tool rapide
- **Yarn Berry (v4)** : Gestionnaire de paquets avec PnP
- **TypeScript** : Type-safety complet

## Principes de conception

### 1. Type Safety

- Typage complet avec TypeScript
- Inférence automatique depuis le schéma Drizzle
- Types générés par React Router pour les routes

### 2. Sécurité

- Authentification OAuth2 avec PKCE
- Cookies httpOnly + signed pour les sessions
- Validation de l'appartenance organisation sur toutes les routes protégées
- API keys pour accès programmatique avec last_used tracking

### 3. Performance

- SSR pour le first paint rapide
- Index GIN pour recherche floue performante
- Pagination sur les listes de traductions

### 4. Simplicité

- Pas de migrations Drizzle : `db:push` pour l'instant (early dev)
- Routes déclaratives centralisées
- Pas d'abstraction excessive

## Références

- [React Router v7 Documentation](https://reactrouter.com/start/framework/installation)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Chakra UI v3](https://www.chakra-ui.com/)
