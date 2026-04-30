# Technical note: Server / client code separation in React Router v7

## Date: 2026-01-26

## Problem encountered

While implementing AI translation, error:

```
Server-only module referenced by client
'/home/jdeniau/code/transi-store/app/lib/ai-providers.server' imported by route 'app/routes/orgs.$orgSlug.settings.tsx'
```

## Cause

In React Router v7, `.server.ts` files can ONLY be imported in:

- `loader`
- `action`
- `headers`
- `middleware`

They CANNOT be imported in client-side React components.

## Solution

**Separate shared constants/types from server code:**

### ❌ Before (incorrect)

```typescript
// app/lib/ai-providers.server.ts
export type AiProvider = "openai" | "gemini";
export const AI_PROVIDERS = [...];
export async function saveAiProvider() { ... }

// app/routes/some-route.tsx
import { AI_PROVIDERS, type AiProvider } from "~/lib/ai-providers.server"; // ❌ ERROR!

function Component() {
  return AI_PROVIDERS.map(...); // ❌ Server import in client component
}
```

### ✅ After (correct)

```typescript
// app/lib/ai-providers.ts (WITHOUT .server)
export type AiProvider = "openai" | "gemini";
export const AI_PROVIDERS = [...];

// app/lib/ai-providers.server.ts
import type { AiProvider } from "./ai-providers";
export async function saveAiProvider() { ... }

// app/routes/some-route.tsx
import { AI_PROVIDERS, type AiProvider } from "~/lib/ai-providers"; // ✅ OK
import { saveAiProvider } from "~/lib/ai-providers.server"; // ✅ Used only in loader/action

export async function action() {
  await saveAiProvider(...); // ✅ OK in action
}

function Component() {
  return AI_PROVIDERS.map(...); // ✅ OK
}
```

## Rule to follow

**In `.server.ts` files, put ONLY:**

- Functions that access the database
- Functions that use secrets (API keys, etc.)
- Pure server logic (encryption, etc.)

**In `.ts` files (without .server), put:**

- Shared types
- Shared constants
- Pure utility functions with no server dependencies

## Files affected in this PR

- ✅ `app/lib/ai-providers.ts` — Shared types and constants
- ✅ `app/lib/ai-providers.server.ts` — CRUD functions with DB
- ✅ `app/routes/orgs.$orgSlug.settings.tsx` — Fixed import

## Official documentation

https://reactrouter.com/explanation/code-splitting#removal-of-server-code
