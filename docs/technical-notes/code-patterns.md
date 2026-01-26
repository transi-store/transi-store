# Patterns de code

## Organisation des fichiers

### Convention `.server.ts`

Tout code qui ne doit **JAMAIS** être envoyé au client utilise le suffixe `.server.ts` :

```
app/lib/
├── auth.server.ts           # Logique OAuth, secrets
├── session.server.ts        # Gestion des sessions
├── db.server.ts             # Configuration Drizzle
├── organizations.server.ts  # Queries organisation
└── export/
    ├── json.server.ts       # Export JSON
    └── xliff.server.ts      # Export XLIFF
```

**Avantages** :

- Vite exclut automatiquement ces fichiers du bundle client
- Impossible d'importer accidentellement du code serveur dans un composant
- Sécurité : secrets, clés API, logique métier protégée

### Structure des routes

```
app/routes/
├── _index.tsx                       # Page d'accueil
├── auth.login.tsx                   # Login
├── orgs._index.tsx                  # Liste des organisations
├── orgs.$orgSlug.tsx                # Layout organisation
├── orgs.$orgSlug._index.tsx         # Dashboard organisation
└── orgs.$orgSlug.projects.$projectSlug.tsx  # Layout projet
```

**Conventions** :

- `$paramName` = paramètre dynamique (`:paramName` dans routes.ts)
- `_index` = route index
- Fichiers plats, hiérarchie définie dans `routes.ts`

## Pattern Route (Loader + Action + Component)

### Structure typique

Chaque route exporte trois éléments :

```typescript
// 1. Loader : chargement des données (serveur)
export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request)
  const organization = await requireOrganizationMembership(user, params.orgSlug)
  // ... charger les données
  return { organization, project, translations }
}

// 2. Action : mutation (serveur, optionnel)
export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData()
  // ... traiter la mutation
  return redirect('/...')
}

// 3. Composant : rendu (client + SSR)
export default function MyPage({ loaderData }: Route.ComponentProps) {
  return <div>...</div>
}
```

## Authentification et autorisation

### Pattern de vérification

**Ordre systématique** dans les loaders :

```typescript
export async function loader({ request, params }: Route.LoaderArgs) {
  // 1. Auth : requireUser(request) → throw redirect si non connecté
  const user = await requireUser(request);

  // 2. Org membership : requireOrganizationMembership(user, orgSlug)
  // → throw 404 si org inexistante, 403 si pas membre
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  // 3. Charger les données spécifiques
  // ...
}
```

**Fichiers** :

- `app/lib/session.server.ts` → `requireUser()`
- `app/lib/organizations.server.ts` → `requireOrganizationMembership()`

## Queries Drizzle

### Imports

```typescript
import { db, schema } from "~/lib/db.server";
import { eq, and, desc } from "drizzle-orm";
```

### Patterns courants

**Query simple** :

```typescript
db.query.users.findFirst({
  where: eq(schema.users.email, email),
});
```

**Query avec relations** (chargement eager) :

```typescript
db.query.organizations.findFirst({
  where: eq(schema.organizations.slug, orgSlug),
  with: { projects: true },
});
```

**Insert avec returning** :

```typescript
const [project] = await db.insert(schema.projects)
  .values({ ... })
  .returning()
```

**Update** :

```typescript
db.update(schema.organizations)
  .set({ name: newName, updatedAt: new Date() })
  .where(eq(schema.organizations.id, id));
```

**Delete** (cascade automatique si défini dans le schéma) :

```typescript
db.delete(schema.projects).where(eq(schema.projects.id, projectId));
```

**Transaction** (opérations atomiques) :

```typescript
await db.transaction(async (tx) => {
  await tx.insert(schema.translationKeys).values(...)
  await tx.insert(schema.translations).values(...)
})
```

## Gestion des formulaires

### Pattern formulaire + action

**Composant** :

```tsx
<Form method="post">
  <Field label="Nom">
    <Input name="name" required />
  </Field>
  <Button type="submit">Créer</Button>
  {actionData?.error && <Text color="red.500">{actionData.error}</Text>}
</Form>
```

**Action** :

```typescript
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const name = formData.get("name") as string;

  // Validation
  if (!name || name.length < 3) {
    return { error: "Le nom doit contenir au moins 3 caractères" };
  }

  // Mutation
  await createProject({ name });

  // Redirection
  return redirect("/projects");
}
```

## Type inference

### Types Drizzle

Inférence automatique depuis le schéma :

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

Disponibles pour toutes les tables dans `drizzle/schema.ts`.

### Types de route

React Router génère les types automatiquement :

```typescript
import type { Route } from "./+types/orgs.$orgSlug";

export async function loader({ params }: Route.LoaderArgs) {
  // params.orgSlug typé automatiquement
}

export default function OrgPage({ loaderData }: Route.ComponentProps) {
  // loaderData typé selon le retour du loader
}
```

## Gestion des erreurs

**Throw Response pour erreurs HTTP** :

```typescript
throw new Response("Not found", { status: 404 });
throw new Response("Forbidden", { status: 403 });
throw redirect("/auth/login"); // 401
```

**Try-catch pour erreurs métier** :

```typescript
try {
  await operation();
  return { success: true };
} catch (error) {
  console.error(error);
  return { error: "Une erreur est survenue" };
}
```

## UI (Chakra UI v3)

**Composants courants** : `Container`, `Heading`, `Button`, `Input`, `VStack`, `Field`

**Form avec Field** :

```tsx
<Field label="Nom du projet" required>
  <Input name="name" />
</Field>
```

## Navigation

**Lien simple** :

```tsx
import { Link } from "react-router";
<Link to={`/orgs/${slug}`}>...</Link>;
```

**NavLink avec style actif** :

```tsx
import { NavLink } from "react-router";
<NavLink
  to="/orgs"
  style={({ isActive }) => ({ fontWeight: isActive ? "bold" : "normal" })}
>
  Organisations
</NavLink>;
```

## Références

- [React Router v7 - Routes](https://reactrouter.com/start/framework/routing)
- [Drizzle ORM - Queries](https://orm.drizzle.team/docs/rqb)
- [Chakra UI v3](https://www.chakra-ui.com/)
