---
description: Guidance for React Router routes, route hierarchy, and middleware-backed app navigation.
applyTo: "apps/website/app/routes.ts,apps/website/app/routes/**/*.ts,apps/website/app/routes/**/*.tsx,apps/website/app/middleware/**/*.ts,apps/website/app/middleware/**/*.tsx"
---

Before changing routes, read `docs/technical-notes/README.md`, then `docs/technical-notes/routing.md`. Read `docs/technical-notes/authentication.md` when auth or protected navigation is involved, and `docs/technical-notes/routes-access.md` for project-scoped pages.

Routes are manually configured in `apps/website/app/routes.ts`. Creating a new route file is not enough; you must also wire it into the route tree in `routes.ts`.

Follow the established layout hierarchy:

- authenticated app pages with no project scope (orgs, search, `projects/new`, profile) go under `layout("routes/app-layout.tsx", [...])`
- members-only project pages (`projects/:projectSlug/settings`, `import-export`, `branches/...`, `keys/:keyId`) go under `layout("routes/project-required-user-layout.tsx", [...])`
- project pages readable on public projects (`projects/:projectSlug` index, `translations`, `translations/files`) go under `layout("routes/project-optional-user-layout.tsx", [...])`
- authenticated API routes under `api/orgs/:orgSlug/...` go under `routes/api-org-layout.tsx`
- public routes stay outside protected layouts

Authentication and project access are middleware-based. For app routes, use `userContext` and `requireOrganizationMembership()` instead of re-implementing auth checks. For API routes, use the organization resolved by API auth middleware.

For any project-scoped page, the layout middleware exposes three precomputed contexts: `organizationContext`, `projectContext`, `projectAccessRoleContext`. Loaders and actions must read these instead of re-fetching by slug or recomputing the role. Forward `projectAccessRole` to components such as `<ProjectNav />`. Do not recompute the role with `isUserMemberOfOrganization`/`project.visibility` and do not hardcode `ProjectAccessRole.MEMBER` — the middleware has already resolved it.

Actions need no inline role guard: both project layouts ensure that any mutating request reaching an action came from a MEMBER. The optional-user layout chains `rejectViewerMutationsMiddleware` after the access role middleware, which throws 403 on POST/PUT/PATCH/DELETE when the role is VIEWER. Loaders under that layout continue to serve VIEWERs read-only data.

Keep route files focused. Move server-only queries and secrets into `*.server.ts` files when needed. Middleware files live in `apps/website/app/middleware/` and must also use the `*.server.ts` suffix when they import server-only modules (which is almost always — every middleware file in this repo does).
