---
description: Guidance for React Router routes, route hierarchy, and middleware-backed app navigation.
applyTo: "apps/website/app/routes.ts,apps/website/app/routes/**/*.ts,apps/website/app/routes/**/*.tsx,apps/website/app/middleware/**/*.ts,apps/website/app/middleware/**/*.tsx"
---

Before changing routes, read `docs/technical-notes/README.md`, then `docs/technical-notes/routing.md`. Read `docs/technical-notes/authentication.md` when auth or protected navigation is involved.

Routes are manually configured in `apps/website/app/routes.ts`. Creating a new route file is not enough; you must also wire it into the route tree in `routes.ts`.

Follow the established hierarchy:

- authenticated app pages go under `layout("routes/app-layout.tsx", [...])`
- authenticated API routes under `api/orgs/:orgSlug/...` go under `routes/api-org-layout.tsx`
- public routes stay outside protected layouts

Authentication is middleware-based. For app routes, use `userContext` and `requireOrganizationMembership()` instead of re-implementing auth checks. For API routes, use the organization resolved by API auth middleware.

Keep route files focused. Move server-only queries and secrets into `*.server.ts` files when needed.
