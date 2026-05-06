---
name: add-react-router-route
description: Add or modify a React Router route in the website app. Use this when asked to create a page, loader, action, or layout route.
---

Follow this workflow when working on route creation or route restructuring in `apps/website`:

1. Read `docs/technical-notes/README.md`.
2. Read `docs/technical-notes/routing.md`.
3. If the route is protected or touches login/session behavior, also read `docs/technical-notes/authentication.md`.
4. If the route is project-scoped, also read `docs/technical-notes/routes-access.md` for the project access role middleware contract.
5. If the route is user-facing, also read `docs/technical-notes/docs-pages.md` to decide whether end-user docs must change.

Implementation checklist:

1. Decide whether the route is public, an authenticated app page, a project-scoped page, or an authenticated API route.
2. Create or update the route file under `apps/website/app/routes/`.
3. Wire the route into `apps/website/app/routes.ts`. The repository does not use file-based discovery.
4. Place the route under the right layout:
   - non-project authenticated pages → `routes/app-layout.tsx`
   - members-only project pages → `routes/project-required-user-layout.tsx`
   - project pages readable on public projects → `routes/project-optional-user-layout.tsx`
   - authenticated API routes under `api/orgs/:orgSlug/...` → `routes/api-org-layout.tsx`
5. Reuse middleware-backed auth patterns:
   - app pages use `userContext`
   - project-scoped pages additionally read `projectAccessRoleContext` (set by `projectMemberAccessMiddleware` or `projectOptionalAccessMiddleware`) — do not recompute the role and do not hardcode `ProjectAccessRole.MEMBER`
   - API routes use `orgContext`
6. Move database access, secrets, and provider SDK calls into `*.server.ts` helpers when they do not belong directly in the route module.
7. If the feature changes documented behavior, update the relevant MDX docs.

Validation checklist:

1. Run the repository type-check command.
2. Run the relevant tests for the touched surface, or the main test suite if no narrower test exists.
