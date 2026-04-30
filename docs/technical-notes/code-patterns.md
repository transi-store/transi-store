# Code patterns

## File organization

### `.server.ts` convention

Any code that must **NEVER** be sent to the client uses the `.server.ts` suffix:

```
app/lib/
├── auth.server.ts           # OAuth logic, secrets
├── session.server.ts        # Session management
├── db.server.ts             # Drizzle configuration
├── organizations.server.ts  # Organization queries
└── export/
    ├── json.server.ts       # JSON export
    └── xliff.server.ts      # XLIFF export
```

**Benefits**:

- Vite automatically excludes these files from the client bundle
- Impossible to accidentally import server code in a component
- Security: secrets, API keys, protected business logic

### Route structure

```
app/routes/
├── _index.tsx                       # Home page
├── auth.login.tsx                   # Login
├── orgs._index.tsx                  # Organization list
├── orgs.$orgSlug.tsx                # Organization layout
├── orgs.$orgSlug._index.tsx         # Organization dashboard
└── orgs.$orgSlug.projects.$projectSlug.tsx  # Project layout
└── complex-route.$orgSlug/index.tsx  # A route can be defined in a folder with an index.tsx as entry point. This is useful when we want to have multiple sub-components related under the same route.
```

**Conventions**:

- `$paramName` = dynamic parameter (`:paramName` in routes.ts)
- `_index` = index route
- Flat files, hierarchy defined in `routes.ts`

## Route pattern (Loader + Action + Component)

### Typical structure

Each route exports three elements:

```typescript
// 1. Loader: data loading (server)
export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request)
  const organization = await requireOrganizationMembership(user, params.orgSlug)
  // ... load data
  return { organization, project, translations }
}

// 2. Action: mutation (server, optional)
export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData()
  // ... process mutation
  return redirect('/...')
}

// 3. Component: rendering (client + SSR)
export default function MyPage({ loaderData }: Route.ComponentProps) {
  return <div>...</div>
}
```

## Authentication and authorization

### Verification pattern

**Systematic order** in loaders:

```typescript
export async function loader({ request, params }: Route.LoaderArgs) {
  // 1. Auth: requireUser(request) → throw redirect if not logged in
  const user = await requireUser(request);

  // 2. Org membership: requireOrganizationMembership(user, orgSlug)
  // → throw 404 if org doesn't exist, 403 if not a member
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  // 3. Load specific data
  // ...
}
```

**Files**:

- `apps/website/app/lib/session.server.ts` → `requireUser()`
- `apps/website/app/lib/organizations.server.ts` → `requireOrganizationMembership()`

## Drizzle queries

### Imports

```typescript
import { db, schema } from "~/lib/db.server";
import { eq, and, desc } from "drizzle-orm";
```

### Common patterns

**Simple query**:

```typescript
db.query.users.findFirst({
  where: eq(schema.users.email, email),
});
```

**Query with relations** (eager loading):

```typescript
db.query.organizations.findFirst({
  where: eq(schema.organizations.slug, orgSlug),
  with: { projects: true },
});
```

**Insert with returning**:

```typescript
const [project] = await db.insert(schema.projects)
  .values({ ... })
  .returning()
```

**Update**:

```typescript
db.update(schema.organizations)
  .set({ name: newName, updatedAt: new Date() })
  .where(eq(schema.organizations.id, id));
```

**Delete** (automatic cascade if defined in the schema):

```typescript
db.delete(schema.projects).where(eq(schema.projects.id, projectId));
```

**Transaction** (atomic operations):

```typescript
await db.transaction(async (tx) => {
  await tx.insert(schema.translationKeys).values(...)
  await tx.insert(schema.translations).values(...)
})
```

## Form management

### Form + action pattern

**Component**:

```tsx
<Form method="post">
  <Field label="Name">
    <Input name="name" required />
  </Field>
  <Button type="submit">Create</Button>
  {actionData?.error && <Text color="red.500">{actionData.error}</Text>}
</Form>
```

**Action**:

```typescript
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const name = formData.get("name") as string;

  // Validation
  if (!name || name.length < 3) {
    return { error: "Name must be at least 3 characters" };
  }

  // Mutation
  await createProject({ name });

  // Redirect
  return redirect("/projects");
}
```

### Routes with multiple actions

When a route exposes multiple actions (via an `_action` field), values must be **enum constants** defined in a dedicated file next to the route, never scattered string literals.

**`FileAction.ts` file** (next to the route):

```typescript
export enum FileAction {
  Create = "create_file",
  Edit = "edit_file",
  Delete = "delete_file",
}
```

**In the form**:

```tsx
<input type="hidden" name="_action" value={FileAction.Create} />
```

**In the action**:

```typescript
import { FileAction } from "./FileAction";

const action = formData.get("_action");

if (action === FileAction.Create) { ... }
if (action === FileAction.Edit) { ... }
```

**In the component** (checking `useActionData`):

```tsx
error={actionData?.action === FileAction.Create ? actionData.error : undefined}
```

## TypeScript conventions

### Array types

Always use the generic form `Array<Foo>`, never the shorthand `Foo[]`.

```typescript
// ✅ Correct
const items: Array<string> = [];
function getUsers(): Array<User> { ... }
type Props = { tags: Array<string> };

// ❌ Incorrect
const items: string[] = [];
function getUsers(): User[] { ... }
type Props = { tags: string[] };
```

## Type inference

### Drizzle types

Automatic inference from the schema:

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

Available for all tables in `apps/website/drizzle/schema.ts`.

### Route types

React Router generates types automatically:

```typescript
import type { Route } from "./+types/orgs.$orgSlug";

export async function loader({ params }: Route.LoaderArgs) {
  // params.orgSlug automatically typed
}

export default function OrgPage({ loaderData }: Route.ComponentProps) {
  // loaderData typed according to the loader return value
}
```

## Error handling

**Throw Response for HTTP errors**:

```typescript
throw new Response("Not found", { status: 404 });
throw new Response("Forbidden", { status: 403 });
throw redirect("/auth/login"); // 401
```

**Try-catch for business errors**:

```typescript
try {
  await operation();
  return { success: true };
} catch (error) {
  console.error(error);
  return { error: "An error occurred" };
}
```

## UI (Chakra UI v3)

**Common components**: `Container`, `Heading`, `Button`, `Input`, `VStack`, `Field`

**Form with Field**:

```tsx
<Field label="Project name" required>
  <Input name="name" />
</Field>
```

## Navigation

**Simple link**:

```tsx
import { Link } from "react-router";
<Link to={`/orgs/${slug}`}>...</Link>;
```

**NavLink with active style**:

```tsx
import { NavLink } from "react-router";
<NavLink
  to="/orgs"
  style={({ isActive }) => ({ fontWeight: isActive ? "bold" : "normal" })}
>
  Organizations
</NavLink>;
```

## References

- [React Router v7 - Routes](https://reactrouter.com/start/framework/routing)
- [Drizzle ORM - Queries](https://orm.drizzle.team/docs/rqb)
- [Chakra UI v3](https://www.chakra-ui.com/)
