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
