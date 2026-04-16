---
name: add-react-router-route
description: Add or modify a React Router route in the website app. Use this when asked to create a page, loader, action, or layout route.
license: MIT
---

Follow this workflow when working on route creation or route restructuring in `apps/website`:

1. Read `docs/technical-notes/README.md`.
2. Read `docs/technical-notes/routing.md`.
3. If the route is protected or touches login/session behavior, also read `docs/technical-notes/authentication.md`.
4. If the route is user-facing, also read `docs/technical-notes/docs-pages.md` to decide whether end-user docs must change.

Implementation checklist:

1. Decide whether the route is public, an authenticated app page, or an authenticated API route.
2. Create or update the route file under `apps/website/app/routes/`.
3. Wire the route into `apps/website/app/routes.ts`. The repository does not use file-based discovery.
4. Reuse middleware-backed auth patterns:
   - app pages use `userContext`
   - API routes use `orgContext`
5. Move database access, secrets, and provider SDK calls into `*.server.ts` helpers when they do not belong directly in the route module.
6. If the feature changes documented behavior, update the relevant MDX docs.

Validation checklist:

1. Run the repository type-check command.
2. Run the relevant tests for the touched surface, or the main test suite if no narrower test exists.
