---
title: Visibilité des projets (private / public)
status: draft
domain: projects, routing, auth
owned_paths:
  - apps/website/drizzle/schema.ts
  - apps/website/app/lib/projects.server.ts
  - apps/website/app/lib/organizations.server.ts
  - apps/website/app/middleware/auth.ts
  - apps/website/app/routes.ts
  - apps/website/app/routes/orgs.$orgSlug.projects.$projectSlug.tsx
  - apps/website/app/routes/orgs.$orgSlug.projects.$projectSlug.settings.tsx
  - apps/website/app/routes/orgs.$orgSlug.projects.new.tsx
required_docs:
  - docs/technical-notes/README.md
  - docs/technical-notes/database-schema.md
  - docs/technical-notes/authentication.md
  - docs/technical-notes/routing.md
  - docs/technical-notes/code-patterns.md
  - docs/technical-notes/traductions.md
---

# Contexte

Aujourd'hui, tous les projets sont implicitement privés et accessibles uniquement aux membres de l'organisation. Il n'existe pas de notion de visibilité.

On souhaite ajouter un champ `visibility` sur les projets (`private` | `public`) pour permettre à un projet public d'être lu par n'importe qui (sans compte ou sans droits sur l'organisation), tout en maintenant les droits d'écriture inchangés.

# Objectif

- Un projet a une visibilité `private` (défaut) ou `public`.
- La visibilité peut être choisie à la création et modifiée dans les paramètres.
- Un projet **public** est accessible en lecture (UI) sans être connecté ni membre.
- Les opérations d'écriture (modification de traductions, branches, paramètres, import…) restent réservées aux membres de l'organisation, sans changement.
- L'export API reste inchangé pour l'instant (accès par session ou clé API uniquement).

# Surfaces à modifier

## 1. Schéma de base de données

**`apps/website/drizzle/schema.ts`**

Créer un enum `PROJECT_VISIBILITY` dans un fichier dédié `apps/website/app/lib/project-visibility.ts` (même pattern que `BRANCH_STATUS` dans `apps/website/app/lib/branches.ts`) :

```typescript
export const PROJECT_VISIBILITY = {
  PRIVATE: "private",
  PUBLIC: "public",
} as const;

export type ProjectVisibility = (typeof PROJECT_VISIBILITY)[keyof typeof PROJECT_VISIBILITY];
```

Puis ajouter le champ `visibility` à la table `projects` dans `apps/website/drizzle/schema.ts` :

```typescript
import { PROJECT_VISIBILITY } from "~/lib/project-visibility";

visibility: varchar("visibility", {
  length: 20,
  enum: ensureOneItem(Object.values(PROJECT_VISIBILITY)),
})
  .default(PROJECT_VISIBILITY.PRIVATE)
  .notNull(),
```

Mettre à jour `Project` / `NewProject` (types inférés automatiquement par Drizzle).

## 2. Middleware optionnel d'authentification

**`apps/website/app/middleware/auth.ts`**

Ajouter :

- `maybeUserContext` : un contexte nullable `createContext<SessionData | null>()`.
- `optionalSessionAuthMiddleware` : middleware qui tente de récupérer la session, place l'utilisateur dans `maybeUserContext` (ou `null` si non connecté), **sans rediriger**.

Ajouter aussi un helper exporté `requireUserFromContext(maybeUser: SessionData | null): SessionData` qui throw un redirect vers `/auth/login` si `null`.

## 3. Layout public pour les routes projet

**Nouveau fichier : `apps/website/app/routes/project-viewer-layout.tsx`**

Ce layout utilise `optionalSessionAuthMiddleware` (liste `middleware`). Il doit exposer un loader minimal (voir `app-layout.tsx` pour le pattern). Pas de composant UI particulier, juste un `<Outlet />`.

## 4. Restructuration des routes projet dans `routes.ts`

**`apps/website/app/routes.ts`**

Déplacer les routes `orgs/:orgSlug/projects/:projectSlug/…` (layout projet et ses enfants, branches, keys) **hors** de `layout("routes/app-layout.tsx", […])` et les placer sous le nouveau `layout("routes/project-viewer-layout.tsx", […])`.

Laisser dans `app-layout` :
- `orgs/:orgSlug/projects/new` (création, toujours membres-only)
- Toutes les autres routes organisations et auth

Ainsi la structure devient :

```
layout("routes/app-layout.tsx", [
  // ...orgs routes, new project, search, etc.
])

layout("routes/project-viewer-layout.tsx", [
  route("orgs/:orgSlug/projects/:projectSlug", "routes/orgs.$orgSlug.projects.$projectSlug.tsx", [
    index("..."),
    route("translations", "..."),
    route("translations/files", "..."),
    route("settings", "..."),
    route("import-export", "..."),
  ]),
  route("orgs/:orgSlug/projects/:projectSlug/branches", "..."),
  route("orgs/:orgSlug/projects/:projectSlug/branches/new", "..."),
  route("orgs/:orgSlug/projects/:projectSlug/branches/:branchSlug", "..."),
  route("orgs/:orgSlug/projects/:projectSlug/branches/:branchSlug/merge", "..."),
  route("orgs/:orgSlug/projects/:projectSlug/keys/:keyId", "..."),
])
```

## 5. Loader du layout projet (gate d'accès)

**`apps/website/app/routes/orgs.$orgSlug.projects.$projectSlug.tsx`**

Remplacer `context.get(userContext)` par `context.get(maybeUserContext)`.

Logique du loader :

1. Récupérer l'organisation par slug (nouvelle fonction `getOrganizationBySlug` exportée depuis `organizations.server.ts`). Retourner 404 si inconnue.
2. Récupérer le projet par `(organizationId, projectSlug)`. Retourner 404 si inconnu.
3. Vérifier l'accès :
   - Si l'utilisateur est connecté ET membre → retourner `{ organization, project, languages, projectAccessRole: "member" }`.
   - Si le projet est `public` → retourner `{ organization, project, languages, projectAccessRole: "viewer" }`.
   - Sinon → `throw redirect('/auth/login?redirectTo=<current path>')`.
4. Passer `projectAccessRole` dans `useLoaderData()` et dans le contexte `<Outlet context={...} />` pour que les routes enfants puissent l'utiliser.

L'enum `ProjectAccessRole` est à définir dans `project-visibility.ts` :

```typescript
export enum ProjectAccessRole {
  MEMBER = "member",
  VIEWER = "viewer",
}
```

Les routes enfants utilisent `projectAccessRole !== ProjectAccessRole.MEMBER` pour refuser l'accès en écriture.

**Note** : `getOrganizationBySlug` est déjà définie en privée dans `organizations.server.ts` — l'exporter suffit.

## 6. Actions dans les routes enfants (protection écriture)

Toutes les routes enfants qui contiennent une `action()` (settings, translations, files, import-export, branches, etc.) doivent, au début de leur action, vérifier la membership :

```typescript
export async function action({ request, params, context }: Route.ActionArgs) {
  const maybeUser = context.get(maybeUserContext);
  const user = requireUserFromContext(maybeUser);
  const organization = await requireOrganizationMembership(user, params.orgSlug);
  // ...
}
```

Remplacer les `context.get(userContext)` par `context.get(maybeUserContext)` suivi de `requireUserFromContext(...)` dans les **actions** de toutes les routes déplacées.

Pour les **loaders** des routes membres-only (settings, branches/new, branches/:slug/merge, keys/:keyId) : appliquer la même vérification — si `projectAccessRole !== "member"`, throw 403 ou redirect.

## 7. Création de projet — champ visibilité

**`apps/website/app/routes/orgs.$orgSlug.projects.new.tsx`**

Ajouter un champ `visibility` dans le formulaire (radio group ou select) avec les valeurs `private` (défaut sélectionné) et `public`.

Mettre à jour `createProject` dans `projects.server.ts` pour accepter et persister `visibility`.

## 8. Paramètres projet — modifier la visibilité

**`apps/website/app/routes/orgs.$orgSlug.projects.$projectSlug.settings.tsx`**

Ajouter :
- Une section "Visibilité" dans l'UI affichant la visibilité actuelle et un bouton/formulaire pour changer (`_action: "update_visibility"`).
- Le handler d'action correspondant : valide la valeur, appelle `updateProjectVisibility(project.id, visibility)` (nouvelle fonction dans `projects.server.ts`), retourne `{ success: true }`.
- La route settings est membres-only (action ET loader vérifient la membership, cf. §6).

## 9. Badge de visibilité dans l'UI

Afficher un badge "Public" (couleur neutre) ou "Private" sur :
- La page de liste des projets de l'organisation (`orgs.$orgSlug._index` ou équivalent).
- Le header du layout projet.

## 10. Traductions i18next

Ajouter les clés de traduction pour tous les textes nouveaux dans les 4 fichiers locales (`en`, `fr`, et les autres supportés). Lire `docs/technical-notes/traductions.md`.

Clés suggérées (namespace `translation`) :
- `projects.visibility.label`
- `projects.visibility.private`
- `projects.visibility.public`
- `projects.visibility.privateDescription`
- `projects.visibility.publicDescription`
- `settings.visibility.title`
- `settings.visibility.updated`

## 11. Tests

Couvrir :
- `getProjectBySlug` et `getOrganizationBySlug` (unitaire).
- Loader du layout projet : accès membre, accès public non membre, accès privé non membre (redirect login).
- Action `update_visibility` dans settings : succès, valeur invalide, non-membre.
- Loader du layout avec projet inconnu (404).

# Contraintes

- `visibility` par défaut `private` — aucun projet existant ne devient public sans action explicite.
- Les opérations d'écriture (action) doivent **toujours** vérifier la membership, indépendamment de la visibilité.
- Ne pas casser l'export API existant pour les projets privés (session ou API key toujours requis).
- Multi-tenant : une organisation ne voit pas les projets des autres orgs dans son dashboard, même si publics.
- Ne pas exposer les pages d'administration (settings, import-export) en lecture publique.
- Les branches et la page de fusion restent membres-only en écriture.

# Notes techniques à lire

- `docs/technical-notes/database-schema.md` — schéma Drizzle, apply via `make db-push`
- `docs/technical-notes/authentication.md` — middleware `sessionAuthMiddleware`, `requireOrganizationMembership`
- `docs/technical-notes/routing.md` — routes manuelles, layouts, convention fichiers
- `docs/technical-notes/code-patterns.md` — loader/action pattern, TypeScript Array<T>, `.server.ts`
- `docs/technical-notes/traductions.md` — gestion des traductions i18next

# Critères d'acceptation

1. Un projet créé a la visibilité `private` par défaut si aucune valeur n'est saisie.
2. La visibilité peut être définie à `public` dans le formulaire de création.
3. La visibilité peut être modifiée depuis les paramètres du projet (section "Visibilité").
4. Un utilisateur non connecté peut accéder en lecture à l'URL d'un projet public (page traductions) sans être redirigé vers le login.
5. Un utilisateur connecté mais non membre de l'organisation peut lire un projet public.
6. Un utilisateur non connecté ou non membre ne peut pas accéder en lecture à un projet privé (redirigé vers login).
7. Aucun utilisateur non membre ne peut effectuer de mutation sur un projet (les actions retournent 403 / redirect vers login).
8. Un badge de visibilité est affiché dans la liste des projets et dans le layout projet.

# Validation

```bash
make test          # tests unitaires et d'intégration
make lint-types    # vérification TypeScript
make build         # build de production
yarn workspace @transi-store/website i18next:lint  # vérification des clés i18n
make db-push       # appliquer le schéma (en local ou CI)
```
