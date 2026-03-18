# ADR-016 : Élimination des loaders redondants via middleware de contexte

**Date** : 2026-03-18

**Statut** : Proposé 🔄

## Contexte

Lors du refactoring de l'authentification (ADR-015), nous avons identifié que de nombreuses routes enfant appellent des fonctions déjà exécutées par leurs routes parentes, créant des doublons de requêtes DB à chaque navigation.

Les loaders de React Router s'exécutent en parallèle (parent et enfants simultanément), ce qui pousse les développeurs à re-fetcher les mêmes données dans chaque enfant puisqu'ils ne peuvent pas accéder directement aux résultats du loader parent.

### Redondances identifiées

#### 1. `requireOrganizationMembership` dupliqué dans tous les enfants de `orgs.$orgSlug.tsx`

Le layout parent `orgs.$orgSlug.tsx` appelle déjà `requireOrganizationMembership()`. Pourtant, **tous** les enfants suivants le rappellent :

| Route enfant                              | loader      | action      |
| ----------------------------------------- | ----------- | ----------- |
| `orgs.$orgSlug._index.tsx`                | ✅ dupliqué | —           |
| `orgs.$orgSlug.members/index.tsx`         | ✅ dupliqué | ✅ dupliqué |
| `orgs.$orgSlug.settings/index.tsx`        | ✅ dupliqué | ✅ dupliqué |
| `orgs.$orgSlug.projects.new.tsx`          | ✅ dupliqué | ✅ dupliqué |
| `orgs.$orgSlug.projects.$projectSlug.tsx` | ✅ dupliqué | —           |

#### 2. `getProjectBySlug` dupliqué dans tous les enfants de `orgs.$orgSlug.projects.$projectSlug.tsx`

Le layout parent `orgs.$orgSlug.projects.$projectSlug.tsx` appelle déjà `getProjectBySlug()`. Pourtant, **tous** les enfants suivants le rappellent :

| Route enfant                                                         | loader      | action      |
| -------------------------------------------------------------------- | ----------- | ----------- |
| `orgs.$orgSlug.projects.$projectSlug.settings.tsx`                   | ✅ dupliqué | ✅ dupliqué |
| `orgs.$orgSlug.projects.$projectSlug.translations/index.tsx`         | ✅ dupliqué | ✅ dupliqué |
| `orgs.$orgSlug.projects.$projectSlug.import-export/index.tsx`        | ✅ dupliqué | —           |
| `orgs.$orgSlug.projects.$projectSlug.branches._index.tsx`            | ✅ dupliqué | —           |
| `orgs.$orgSlug.projects.$projectSlug.branches.new.tsx`               | ✅ dupliqué | ✅ dupliqué |
| `orgs.$orgSlug.projects.$projectSlug.branches.$branchSlug.tsx`       | ✅ dupliqué | ✅ dupliqué |
| `orgs.$orgSlug.projects.$projectSlug.branches.$branchSlug.merge.tsx` | ✅ dupliqué | ✅ dupliqué |
| `orgs.$orgSlug.projects.$projectSlug.keys.$keyId.tsx`                | ✅ dupliqué | ✅ dupliqué |

#### 3. Triple duplication dans les routes branches/keys

Les routes de type `branches.$branchSlug.tsx` effectuent :

1. `requireOrganizationMembership` (déjà fait par le grand-parent `orgs.$orgSlug.tsx`)
2. `getProjectBySlug` (déjà fait par le parent `projects.$projectSlug.tsx`)

## Décision

Étendre le pattern de middleware React Router v7 déjà en place (ADR-015) pour résoudre l'organisation et le projet dans des middlewares sur les routes layout intermédiaires.

### Implémentation prévue

```typescript
// Sur orgs.$orgSlug.tsx
export const middleware = [orgMembershipMiddleware];
// → context.set(orgContext, organization)

// Sur orgs.$orgSlug.projects.$projectSlug.tsx
export const middleware = [projectMiddleware];
// → context.set(projectContext, project)
```

Les routes enfant n'auront plus qu'à lire depuis le contexte :

```typescript
// Avant
const org = await requireOrganizationMembership(user, params.orgSlug);
const project = await getProjectBySlug(org.id, params.projectSlug);

// Après
const org = context.get(orgContext);
const project = context.get(projectContext);
```

### Cas particulier : les actions

Les actions ne bénéficient pas des loaders parents (le loader parent s'exécute après l'action). En revanche, les **middlewares** s'exécutent bien avant les actions. La migration vers des middlewares sur les layouts résoudra donc également les doublons dans les actions.

## Raisons

1. **Cohérence** : utiliser le même pattern que ADR-015 (middleware + contexte) pour toute la résolution des entités
2. **Performance** : éliminer les requêtes DB redondantes (2x voire 3x) sur chaque navigation
3. **Sécurité** : centraliser les vérifications d'accès — impossible d'oublier de vérifier dans une nouvelle route enfant
4. **Lisibilité** : les loaders enfant se concentrent sur leur logique propre

## Alternatives considérées

1. **`useRouteLoaderData` côté client** : partage des données du parent aux enfants via `useRouteLoaderData("routeId")`. Ne résout pas le problème pour les loaders et actions serveur.

2. **Cache de requêtes par request** : un cache en mémoire (request-scoped) pour que le second appel à `getProjectBySlug` soit un no-op. Transparent mais ajoute de la complexité cachée et ne réduit pas vraiment le code dupliqué.

## Conséquences

### Positives

- Réduction du nombre de requêtes DB à chaque navigation (estimé : -2 à -4 requêtes par page)
- Code plus simple dans les loaders/actions enfant
- Vérifications d'accès impossibles à oublier pour les nouvelles routes

### Négatives

- Les middlewares s'exécutent même si la page n'a pas besoin de toutes les données (ex: une action qui ne fait que supprimer n'a pas besoin du projet complet)
- Nécessite de mettre à jour les tests unitaires des routes (comme pour ADR-015)

## Fichiers à créer/modifier

- `app/middleware/org.ts` — `orgMembershipMiddleware` + `orgContext`
- `app/middleware/project.ts` — `projectMiddleware` + `projectContext`
- `app/routes/orgs.$orgSlug.tsx` — ajouter `export const middleware = [orgMembershipMiddleware]`
- `app/routes/orgs.$orgSlug.projects.$projectSlug.tsx` — ajouter `export const middleware = [projectMiddleware]`
- Toutes les routes enfant — remplacer les appels redondants par `context.get(orgContext)` / `context.get(projectContext)`

## Références

- [ADR-015 : Middleware d'authentification avec routes layout](./ADR-015-middleware-authentification-layout.md)
- [React Router v7 Middleware](https://reactrouter.com/how-to/middleware)
