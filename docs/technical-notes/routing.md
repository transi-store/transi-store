# Gestion des Routes - React Router 7

## Configuration

Ce projet utilise **une configuration manuelle des routes** via le fichier `apps/website/app/routes.ts`, plutôt que le routing automatique par convention de fichiers de React Router 7.

## Comment ajouter une nouvelle route

### Étape 1: Créer le fichier de route

Créer le fichier dans `apps/website/app/routes/` avec la convention de nommage:

- Points (`.`) pour les segments dynamiques: `orgs.$orgSlug.tsx`
- Underscores (`_`) pour les routes index: `orgs._index.tsx`
- Tirets (`-`) pour les segments normaux: `auth.complete-profile.tsx`

### Étape 2: Déclarer la route dans routes.ts ⚠️

**IMPORTANT:** Le simple fait de créer le fichier ne suffit PAS. Il faut également ajouter la route dans `apps/website/app/routes.ts`:

```typescript
// apps/website/app/routes.ts
export default [
  // ... autres routes
  route("auth/complete-profile", "routes/auth.complete-profile.tsx"),
];
```

**Sans cette déclaration, vous obtiendrez l'erreur:**

```
Error: No route matches URL "/auth/complete-profile"
```

### Étape 3: Redémarrer le serveur

Après avoir ajouté la route dans `apps/website/app/routes.ts`, redémarrer le serveur de développement:

```bash
make dev
# ou sans Make:
docker compose exec app yarn dev
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
  route(
    "orgs/:orgSlug/projects/:projectSlug",
    "routes/orgs.$orgSlug.projects.$projectSlug.tsx",
    [
      index("routes/orgs.$orgSlug.projects.$projectSlug._index.tsx"),
      route(
        "translations",
        "routes/orgs.$orgSlug.projects.$projectSlug.translations.tsx",
      ),
      route(
        "settings",
        "routes/orgs.$orgSlug.projects.$projectSlug.settings.tsx",
      ),
    ],
  ),
] satisfies RouteConfig;
```

## Mapping chemin URL → fichier

| URL                                | Déclaration dans routes.ts                            | Fichier                                          |
| ---------------------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| `/auth/login`                      | `route("auth/login", "...")`                          | `routes/auth.login.tsx`                          |
| `/auth/complete-profile`           | `route("auth/complete-profile", "...")`               | `routes/auth.complete-profile.tsx`               |
| `/orgs`                            | `route("orgs", "...")`                                | `routes/orgs._index.tsx`                         |
| `/orgs/my-org`                     | `route("orgs/:orgSlug", "...")`                       | `routes/orgs.$orgSlug._index.tsx`                |
| `/orgs/my-org/projects/my-project` | `route("orgs/:orgSlug/projects/:projectSlug", "...")` | `routes/orgs.$orgSlug.projects.$projectSlug.tsx` |

## Convention `/api` : routes publiques uniquement

Le préfixe `/api/...` est **réservé aux routes exposées au public** (consommables par des intégrations externes via clé API ou navigateur), comme les endpoints documentés dans OpenAPI :

- ✅ `/api/orgs/:orgSlug/projects/:projectSlug/files/:fileId/translations` — endpoint d'export public
- ✅ `/api/locales/:lng/:ns` — chargement des traductions client-side
- ✅ `/api/doc.json`, `/api/doc/viewer`

**Ne PAS préfixer par `/api`** les actions internes utilisées uniquement par l'UI (auth-session, non documentées) :

- ❌ Mauvais : `/api/orgs/:orgSlug/projects/:projectSlug/markdown-translate-section`
- ✅ Bon (cas classique) : ajouter l'action directement dans le `action()` de la route page existante via un discriminateur `_action` sur le formData. Voir les variantes `SaveContent` / `ToggleFuzzy` / `TranslateSection` / `TranslateDocument` dans `routes/orgs.$orgSlug.projects.$projectSlug.translations/runMarkdownAction.server.ts`.
- ✅ Bon (resource route dédiée) : créer une route sibling sans `default export` qui n'expose qu'une `action`. Les formulaires y soumettent via `<fetcher.Form action="...">` ou `fetcher.submit(..., { action: "..." })`. Exemple : `routes/orgs.$orgSlug.projects.$projectSlug.translations.files/index.tsx` gère les `FileAction.Create | Edit | Delete` séparément du flux `_action` principal des traductions. À utiliser quand le découpage allège significativement la route page (action volumineuse, contrats de retour distincts) sans avoir à introduire une nouvelle URL utilisateur.

Si une action interne nécessite vraiment sa propre route, elle doit vivre sous `app-layout` à un chemin **non préfixé** par `/api`. Le bundle OpenAPI ne doit jamais l'enregistrer.

## Conventions de nommage des fichiers

- **Segments dynamiques**: Utiliser `$` → `orgs.$orgSlug.tsx` pour `/orgs/:orgSlug`
- **Routes index**: Utiliser `_index` → `orgs._index.tsx` pour `/orgs` (index)
- **Segments normaux**: Utiliser `.` ou `-` → `auth.login.tsx` ou `auth.complete-profile.tsx`

## Pourquoi cette configuration manuelle?

React Router 7 supporte deux modes:

1. **File-based routing** (par défaut): Les routes sont automatiquement déduites de la structure des fichiers
2. **Manual routing** (ce projet): Les routes sont explicitement déclarées dans `apps/website/app/routes.ts`

Ce projet utilise le mode manuel, probablement pour:

- Plus de contrôle sur la structure des routes
- Éviter les conventions de nommage parfois complexes
- Centraliser la configuration des routes

## Checklist pour ajouter une route

- [ ] Créer le fichier dans `apps/website/app/routes/` avec la bonne convention de nommage
- [ ] Ajouter la déclaration dans `apps/website/app/routes.ts`
- [ ] Redémarrer le serveur de développement
- [ ] Vérifier que les types TypeScript sont générés dans `.react-router/types/`
- [ ] Tester l'accès à la route dans le navigateur

## Rendu avec chakra-ui

Lors de la création de liens de navigation, utiliser le composant `Button` avec la prop `asChild` pour envelopper le composant `Link` de React Router. Cela permet de conserver le style du bouton tout en utilisant la navigation de React Router.

Exemple:

```tsx
<Button asChild variant="outline" size="sm">
  <Link to={`/orgs/${organization.slug}`}>Retour</Link>
</Button>
```

## Références

- [React Router 7 - Route Configuration](https://reactrouter.com/start/framework/routing)
- [React Router 7 - Manual Route Configuration](https://reactrouter.com/start/framework/route-module)
