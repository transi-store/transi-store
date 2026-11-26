# Local Development and Testing

## Running Tests

```bash
yarn test                    # Run all tests
yarn test path/to/file.test.ts  # Run a specific test file
```

This will run tests in watch mode, allowing you to see results immediately as you make changes. You can also run tests in CI mode (without watch) using:

```bash
yarn test --run
yarn test --run path/to/file.test.ts
```

The project uses **vitest** with an in-memory PGlite database (see `apps/website/tests/setup-db.ts` and `apps/website/tests/test-db.ts`).

Website tests run in the container, through the vitest binary (`yarn workspace … test` does not find it there):

```bash
docker compose exec -w /app/apps/website app /app/node_modules/.bin/vitest run path/to/file.test.ts
```

On the host, they fail on `.react-router/types`, which the container writes as root.
CLI tests run on the host, from `packages/cli`: `../../node_modules/.bin/vitest run`.
The CLI reads `@transi-store/common` from its `dist`: rebuild it (`tsc` in `packages/common`) after changing a shared schema.
