# Routes — React Router 7

## Configuration

This project uses **manual route configuration** via `apps/website/app/routes.ts`, rather than React Router 7's automatic file-based routing.

## How to add a new route

### Step 1: Create the route file

Create the file in `apps/website/app/routes/` using the naming convention:

- Dots (`.`) for dynamic segments: `orgs.$orgSlug.tsx`
- Underscores (`_`) for index routes: `orgs._index.tsx`
- Hyphens (`-`) for regular segments: `auth.complete-profile.tsx`

### Step 2: Declare the route in routes.ts ⚠️

**IMPORTANT:** Creating the file alone is NOT enough. You must also add the route in `apps/website/app/routes.ts`:

```typescript
// apps/website/app/routes.ts
export default [
  // ... other routes
  route("auth/complete-profile", "routes/auth.complete-profile.tsx"),
];
```

**Without this declaration, you will get the error:**

```
Error: No route matches URL "/auth/complete-profile"
```

### Step 3: Restart the server

After adding the route in `apps/website/app/routes.ts`, restart the development server:

```bash
make dev
# or without Make:
docker compose exec app yarn dev
```

React Router will then automatically generate the TypeScript types in `.react-router/types/app/routes/+types/`.

## Route structure

```typescript
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Index route (home page)
  index("routes/_index.tsx"),

  // Simple route
  route("auth/login", "routes/auth.login.tsx"),

  // Route with parameter
  route("orgs/:orgSlug", "routes/orgs.$orgSlug._index.tsx"),

  // Nested routes
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

## URL path → file mapping

| URL                                | Declaration in routes.ts                              | File                                             |
| ---------------------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| `/auth/login`                      | `route("auth/login", "...")`                          | `routes/auth.login.tsx`                          |
| `/auth/complete-profile`           | `route("auth/complete-profile", "...")`               | `routes/auth.complete-profile.tsx`               |
| `/orgs`                            | `route("orgs", "...")`                                | `routes/orgs._index.tsx`                         |
| `/orgs/my-org`                     | `route("orgs/:orgSlug", "...")`                       | `routes/orgs.$orgSlug._index.tsx`                |
| `/orgs/my-org/projects/my-project` | `route("orgs/:orgSlug/projects/:projectSlug", "...")` | `routes/orgs.$orgSlug.projects.$projectSlug.tsx` |

## `/api` convention: public routes only

The `/api/...` prefix is **reserved for publicly exposed routes** (consumable by external integrations via API key or browser), such as endpoints documented in OpenAPI:

- ✅ `/api/orgs/:orgSlug/projects/:projectSlug/files/:fileId/translations` — public export endpoint
- ✅ `/api/locales/:lng/:ns` — client-side translation loading
- ✅ `/api/doc.json`, `/api/doc/viewer`

**Do NOT prefix with `/api`** internal actions used only by the UI (auth-session, undocumented):

- ❌ Wrong: `/api/orgs/:orgSlug/projects/:projectSlug/markdown-translate-section`
- ✅ Correct (typical case): add the action directly in the `action()` of the existing page route via a `_action` discriminator on the formData. See the `SaveContent` / `ToggleFuzzy` / `TranslateSection` / `TranslateDocument` variants in `routes/orgs.$orgSlug.projects.$projectSlug.translations/runMarkdownAction.server.ts`.
- ✅ Correct (dedicated resource route): create a sibling route with no `default export` that only exposes an `action`. Forms submit to it via `<fetcher.Form action="...">` or `fetcher.submit(..., { action: "..." })`. Example: `routes/orgs.$orgSlug.projects.$projectSlug.translations.files/index.tsx` handles `FileAction.Create | Edit | Delete` separately from the main translations `_action` flow. Use this when the split significantly lightens the page route (large action, distinct return contracts) without introducing a new user-facing URL.

If an internal action truly needs its own route, it must live under `app-layout` at a path **not prefixed** by `/api`. The OpenAPI bundle must never register it.

## File naming conventions

- **Dynamic segments**: Use `$` → `orgs.$orgSlug.tsx` for `/orgs/:orgSlug`
- **Index routes**: Use `_index` → `orgs._index.tsx` for `/orgs` (index)
- **Regular segments**: Use `.` or `-` → `auth.login.tsx` or `auth.complete-profile.tsx`

## Why manual configuration?

React Router 7 supports two modes:

1. **File-based routing** (default): Routes are automatically inferred from file structure
2. **Manual routing** (this project): Routes are explicitly declared in `apps/website/app/routes.ts`

This project uses manual mode for:

- More control over route structure
- Avoiding sometimes complex naming conventions
- Centralizing route configuration

## Checklist for adding a route

- [ ] Create the file in `apps/website/app/routes/` with the correct naming convention
- [ ] Add the declaration in `apps/website/app/routes.ts`
- [ ] Restart the development server
- [ ] Verify TypeScript types are generated in `.react-router/types/`
- [ ] Test the route in the browser

## Rendering with Chakra UI

When creating navigation links, use the `Button` component with the `asChild` prop to wrap React Router's `Link` component. This preserves button styling while using React Router navigation.

Example:

```tsx
<Button asChild variant="outline" size="sm">
  <Link to={`/orgs/${organization.slug}`}>Back</Link>
</Button>
```

## References

- [React Router 7 - Route Configuration](https://reactrouter.com/start/framework/routing)
- [React Router 7 - Manual Route Configuration](https://reactrouter.com/start/framework/route-module)
