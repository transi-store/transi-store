# Project routes access control

How project-scoped pages decide whether the current request can read or
write a project, and how that decision is shared across loaders, actions
and components.

This note builds on the auth primitives described in
[authentication.md](./authentication.md) and the layout hierarchy in
[routing.md](./routing.md). Authentication answers "who is this user?";
this note answers "what can this user do on this project?".

## Two access roles

Project pages distinguish two roles, defined in
`apps/website/app/lib/project-visibility.ts`:

- `ProjectAccessRole.MEMBER` — the request comes from a member of the
  project's organization. Full read and write.
- `ProjectAccessRole.VIEWER` — the request is unauthenticated (or comes
  from a non-member) and the project has `visibility = public`. Read-only.

A project with `visibility = private` is invisible to non-members: the
request is redirected to `/auth/login` instead of receiving a `VIEWER`
role.

## One source of truth: middleware contexts

Three pieces of information are computed once per request in middleware
and exposed to loaders, actions and components via React Router contexts.
Loaders and actions must **read these contexts** instead of recomputing
or re-fetching:

| Context                    | Type                | Purpose                                          |
| -------------------------- | ------------------- | ------------------------------------------------ |
| `projectAccessRoleContext` | `ProjectAccessRole` | The resolved role for the current request.       |
| `organizationContext`      | `Organization`      | The organization resolved from `params.orgSlug`. |
| `projectContext`           | `Project`           | The project resolved from `params.projectSlug`.  |

```typescript
// app/middleware/project-access.ts
export const projectAccessRoleContext = createContext<ProjectAccessRole>();
export const organizationContext = createContext<Organization>();
export const projectContext = createContext<Project>();
```

Never recompute the role inline (no `isUserMemberOfOrganization` or
`project.visibility` checks in loaders), and never re-fetch the
organization or project by slug — the middleware already did it.

## Two middleware, same contexts

| Middleware                        | Auth prerequisite               | Behavior                                                                                                  |
| --------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `projectMemberAccessMiddleware`   | `sessionAuthMiddleware`         | Asserts org membership. Sets the role to `MEMBER`, otherwise throws 403/404.                              |
| `projectOptionalAccessMiddleware` | `optionalSessionAuthMiddleware` | Loads the project, then picks `MEMBER`, `VIEWER` (if public), or redirects to `/auth/login` (if private). |

Both middleware populate the same three contexts, so downstream loaders
and actions read state the same way regardless of which layout they live
under.

## Two layouts

Project pages live under exactly one of two pathless layouts in
`apps/website/app/routes.ts`:

- `routes/project-required-user-layout.tsx` —
  `[sessionAuthMiddleware, projectMemberAccessMiddleware]`. Wraps
  members-only project pages: `settings`, `import-export`,
  `branches/...`, `keys/:keyId`.
- `routes/project-optional-user-layout.tsx` —
  `[optionalSessionAuthMiddleware, projectOptionalAccessMiddleware]`.
  Wraps the project viewer pages readable on public projects:
  `:projectSlug` index, `translations`, `translations/files`.

A new project-scoped page must be added under one of these layouts —
choose by access model. Project pages do **not** belong directly under
`app-layout` because they need the project access contexts.

## Loader pattern

Loaders fetch only the page-specific data; the org, project and role
come from contexts:

```typescript
import {
  organizationContext,
  projectAccessRoleContext,
  projectContext,
} from "~/middleware/project-access";

export async function loader({ context }: Route.LoaderArgs) {
  const organization = context.get(organizationContext);
  const project = context.get(projectContext);
  const projectAccessRole = context.get(projectAccessRoleContext);
  // ...load only the page-specific data...
  return { organization, project, projectAccessRole /* ... */ };
}
```

The component then forwards `projectAccessRole` to UI helpers such as
`<ProjectNav />` and `<ProjectFileTabs />`, which gate write affordances
(`projectAccessRole === ProjectAccessRole.MEMBER`). Inside the project
viewer layout, the role is also forwarded through
`<Outlet context={...} />` so nested routes can read it via
`useOutletContext()` without re-reading the request context.

**Never hardcode `ProjectAccessRole.MEMBER`** in a loader or component
— even on a member-only page, read it from the context. This keeps a
single source of truth and stays correct if the same component is later
reused under the optional-user layout.

## Action pattern

Actions need no inline access check — both layouts guarantee that any
`POST/PUT/PATCH/DELETE` reaching an action came from a MEMBER:

- `project-required-user-layout` always sets the role to MEMBER, so any
  request is implicitly a member request.
- `project-optional-user-layout` adds `rejectViewerMutationsMiddleware`
  after the access role middleware. It throws 403 when the request
  method is mutating and the role is VIEWER, so VIEWERs cannot reach
  any action under the layout. Loaders (GET/HEAD) are unaffected and
  continue to serve read-only viewer traffic on public projects.

```typescript
export async function action({ request, context }: Route.ActionArgs) {
  const project = context.get(projectContext);
  // ...mutate, no inline role check needed...
}
```

This keeps the action-side access policy centralized in `routes.ts` and
the layout middleware: the file you read tells you what it does, the
file that wires it up tells you who can do it.

## Files

- `apps/website/app/middleware/project-access.ts` — contexts and the
  three middleware functions (member access, optional access, viewer
  mutation reject)
- `apps/website/app/routes/project-required-user-layout.tsx`
- `apps/website/app/routes/project-optional-user-layout.tsx`
- `apps/website/app/lib/project-visibility.ts` — `ProjectAccessRole`,
  `ProjectVisibility`
