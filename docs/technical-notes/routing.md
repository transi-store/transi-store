# Gestion des Routes - React Router 7

## Configuration

Ce projet utilise **une configuration manuelle des routes** via le fichier `app/routes.ts`, plutôt que le routing automatique par convention de fichiers de React Router 7.

## Comment ajouter une nouvelle route

### Étape 1: Créer le fichier de route
Créer le fichier dans `app/routes/` avec la convention de nommage:
- Points (`.`) pour les segments dynamiques: `orgs.$orgSlug.tsx`
- Underscores (`_`) pour les routes index: `orgs._index.tsx`
- Tirets (`-`) pour les segments normaux: `auth.complete-profile.tsx`

### Étape 2: Déclarer la route dans app/routes.ts ⚠️
**IMPORTANT:** Le simple fait de créer le fichier ne suffit PAS. Il faut également ajouter la route dans `app/routes.ts`:

```typescript
// app/routes.ts
export default [
  // ... autres routes
  route("auth/complete-profile", "routes/auth.complete-profile.tsx"),
]
```

**Sans cette déclaration, vous obtiendrez l'erreur:**
```
Error: No route matches URL "/auth/complete-profile"
```

### Étape 3: Redémarrer le serveur
Après avoir ajouté la route dans `app/routes.ts`, redémarrer le serveur de développement:
```bash
yarn dev
```

React Router générera alors automatiquement les types TypeScript dans `.react-router/types/app/routes/+types/`.

## Structure des routes

```typescript
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Route index (page d'accueil)
  index("routes/_index.tsx"),

  // Route simple
  route("auth/login", "routes/auth.login.tsx"),

  // Route avec paramètre
  route("orgs/:orgSlug", "routes/orgs.$orgSlug._index.tsx"),

  // Routes imbriquées
  route("orgs/:orgSlug/projects/:projectSlug", "routes/orgs.$orgSlug.projects.$projectSlug.tsx", [
    index("routes/orgs.$orgSlug.projects.$projectSlug._index.tsx"),
    route("translations", "routes/orgs.$orgSlug.projects.$projectSlug.translations.tsx"),
    route("settings", "routes/orgs.$orgSlug.projects.$projectSlug.settings.tsx"),
  ]),
] satisfies RouteConfig;
```

## Mapping chemin URL → fichier

| URL | Déclaration dans routes.ts | Fichier |
|-----|---------------------------|---------|
| `/auth/login` | `route("auth/login", "...")` | `routes/auth.login.tsx` |
| `/auth/complete-profile` | `route("auth/complete-profile", "...")` | `routes/auth.complete-profile.tsx` |
| `/orgs` | `route("orgs", "...")` | `routes/orgs._index.tsx` |
| `/orgs/my-org` | `route("orgs/:orgSlug", "...")` | `routes/orgs.$orgSlug._index.tsx` |
| `/orgs/my-org/projects/my-project` | `route("orgs/:orgSlug/projects/:projectSlug", "...")` | `routes/orgs.$orgSlug.projects.$projectSlug.tsx` |

## Conventions de nommage des fichiers

- **Segments dynamiques**: Utiliser `$` → `orgs.$orgSlug.tsx` pour `/orgs/:orgSlug`
- **Routes index**: Utiliser `_index` → `orgs._index.tsx` pour `/orgs` (index)
- **Segments normaux**: Utiliser `.` ou `-` → `auth.login.tsx` ou `auth.complete-profile.tsx`

## Pourquoi cette configuration manuelle?

React Router 7 supporte deux modes:
1. **File-based routing** (par défaut): Les routes sont automatiquement déduites de la structure des fichiers
2. **Manual routing** (ce projet): Les routes sont explicitement déclarées dans `app/routes.ts`

Ce projet utilise le mode manuel, probablement pour:
- Plus de contrôle sur la structure des routes
- Éviter les conventions de nommage parfois complexes
- Centraliser la configuration des routes

## Checklist pour ajouter une route

- [ ] Créer le fichier dans `app/routes/` avec la bonne convention de nommage
- [ ] Ajouter la déclaration dans `app/routes.ts`
- [ ] Redémarrer le serveur de développement
- [ ] Vérifier que les types TypeScript sont générés dans `.react-router/types/`
- [ ] Tester l'accès à la route dans le navigateur

## Références

- [React Router 7 - Route Configuration](https://reactrouter.com/start/framework/routing)
- [React Router 7 - Manual Route Configuration](https://reactrouter.com/start/framework/route-module)
