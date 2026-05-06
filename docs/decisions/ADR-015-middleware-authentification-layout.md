# ADR-015 : Middleware d'authentification avec routes layout

**Date** : 2026-03-18

**Statut** : Accepté ✅

## Contexte

Toutes les routes protégées de l'application appelaient individuellement `requireUser(request)` dans leurs loaders et actions. Les routes API (export, import, translate) dupliquaient chacune la même logique de double authentification (clé API Bearer ou session cookie). Cette répétition posait plusieurs problèmes :

- **Risque d'oubli** : un développeur pouvait oublier d'ajouter `requireUser` sur une nouvelle route
- **Duplication** : ~30 lignes de code de double auth dupliquées dans chaque route API
- **Incohérence** : le comportement en cas d'échec d'auth variait selon les routes (401 vs redirect)

## Décision

### 1. Deux routes layout pathless pour centraliser l'authentification

- **`app-layout.tsx`** : Route layout pour toutes les pages web authentifiées. Utilise un middleware qui redirige vers `/auth/login` si l'utilisateur n'est pas connecté.
- **`api-layout.tsx`** : Route layout pour toutes les routes API authentifiées. Utilise un middleware qui accepte la double authentification (Bearer API key ou session cookie) et retourne une erreur 403 JSON en cas d'échec.

### 2. Middleware React Router v7 avec Context API

Utilisation de l'API middleware de React Router v7 (`future.v8_middleware`, déjà activé) avec `createContext` pour le passage type-safe des données d'authentification :

```typescript
// app/middleware/auth.server.ts
export const userContext = createContext<SessionData>();

export async function sessionAuthMiddleware({ request, context }) {
  const user = await getUserFromSession(request);
  if (!user) {
    throw redirect(`/auth/login?redirectTo=...`);
  }
  context.set(userContext, user);
}
```

```typescript
// app/middleware/api-auth.server.ts
export const apiAuthContext = createContext<ApiAuthResult>();

export async function apiAuthMiddleware({ request, context }) {
  // Bearer token → apiKey mode
  // Session cookie → session mode
  // Aucun → throw 403
  context.set(apiAuthContext, result);
}
```

### 3. Consommation dans les routes

Les routes n'appellent plus `requireUser()` mais récupèrent l'utilisateur depuis le contexte :

```typescript
// Avant
const user = await requireUser(request);

// Après (routes app)
const user = context.get(userContext);

// Après (routes API)
const auth = context.get(apiAuthContext);
if (auth.mode === "apiKey") {
  /* ... */
} else {
  /* auth.user */
}
```

### 4. Organisation des routes

```typescript
// routes.ts
layout("routes/app-layout.tsx", [
  route("orgs", ...),
  route("orgs/new", ...),
  route("search", ...),
  // ... toutes les routes web authentifiées
]);

layout("routes/api-layout.tsx", [
  route("api/orgs/:orgSlug/projects/:projectSlug/export", ...),
  route("api/orgs/:orgSlug/projects/:projectSlug/import", ...),
  route("api/orgs/:orgSlug/projects/:projectSlug/translate", ...),
]);

// Routes publiques (hors layouts)
index("routes/_index.tsx");
route("pricing", ...);
route("auth/login", ...);
route("api/locales/:lng/:ns", ...);
```

## Raisons

1. **Single Responsibility** : l'authentification est gérée à un seul endroit par type de route
2. **Sécurité par défaut** : impossible d'oublier l'auth sur une nouvelle route enfant
3. **DRY** : la logique de double auth API n'existe plus qu'une seule fois
4. **Type-safety** : `createContext<T>` garantit le typage des données d'auth

## Alternatives considérées

### 1. Middleware sur la route root

**Rejeté** : la route root inclut des pages publiques (accueil, pricing, login). Ajouter un middleware d'auth au root nécessiterait des exceptions complexes.

### 2. Wrapper/HOF autour des loaders

**Rejeté** : plus verbeux et moins intégré que le système de middleware natif de React Router v7.

## Conséquences

### Positives

- Authentification centralisée et cohérente
- Moins de code dupliqué dans les routes
- Les nouvelles routes sous un layout sont automatiquement protégées
- Séparation claire entre routes publiques, app et API

### Négatives

- Les routes enfant qui ont besoin de l'objet `user` doivent appeler `context.get(userContext)` (léger overhead cognitif)
- L'API middleware de React Router v7 est marquée `future.v8_middleware` (mais déjà utilisée par le projet pour i18next)

## Routes spéciales

- **`orgs/invite/:code`** : reste hors du layout app car elle gère l'auth de manière personnalisée (affiche un prompt de login au lieu de rediriger)
- **`api/locales/:lng/:ns`** : route publique d'i18n, hors de tout layout d'auth

## Fichiers créés

- `app/middleware/auth.server.ts` — Middleware session + userContext
- `app/middleware/api-auth.server.ts` — Middleware double auth API + apiAuthContext
- `app/routes/app-layout.tsx` — Layout pathless pour les routes web authentifiées
- `app/routes/api-layout.tsx` — Layout pathless pour les routes API authentifiées

## Fichiers modifiés

- `app/routes.ts` — Restructuration avec `layout()`
- Toutes les routes sous `/orgs/**` — Remplacement de `requireUser()` par `context.get(userContext)`
- Routes API (export, import, translate) — Remplacement de la logique de double auth inline par `context.get(apiAuthContext)`

## Références

- [React Router 7 - Middleware](https://reactrouter.com/how-to/middleware)
- [ADR-006](./ADR-006-cles-api-export.md) — Clés d'API pour l'export
- [ADR-014](./ADR-014-import-api-endpoint.md) — Endpoint API d'import
