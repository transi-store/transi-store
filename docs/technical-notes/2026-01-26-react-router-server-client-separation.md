# Note technique : Séparation code serveur / client dans React Router v7

## Date : 2026-01-26

## Problème rencontré

Lors de l'implémentation de la traduction IA, erreur :

```
Server-only module referenced by client
'/home/jdeniau/code/transi-store/app/lib/ai-providers.server' imported by route 'app/routes/orgs.$orgSlug.settings.tsx'
```

## Cause

Dans React Router v7, les fichiers `.server.ts` ne peuvent être importés **QUE** dans :

- `loader`
- `action`
- `headers`
- `middleware`

Ils **NE PEUVENT PAS** être importés dans les composants React côté client.

## Solution

**Séparer les constantes/types partagés du code serveur :**

### ❌ Avant (incorrect)

```typescript
// app/lib/ai-providers.server.ts
export type AiProvider = "openai" | "gemini";
export const AI_PROVIDERS = [...];
export async function saveAiProvider() { ... }

// app/routes/some-route.tsx
import { AI_PROVIDERS, type AiProvider } from "~/lib/ai-providers.server"; // ❌ ERREUR!

function Component() {
  return AI_PROVIDERS.map(...); // ❌ Import serveur dans composant client
}
```

### ✅ Après (correct)

```typescript
// app/lib/ai-providers.ts (SANS .server)
export type AiProvider = "openai" | "gemini";
export const AI_PROVIDERS = [...];

// app/lib/ai-providers.server.ts
import type { AiProvider } from "./ai-providers";
export async function saveAiProvider() { ... }

// app/routes/some-route.tsx
import { AI_PROVIDERS, type AiProvider } from "~/lib/ai-providers"; // ✅ OK
import { saveAiProvider } from "~/lib/ai-providers.server"; // ✅ Utilisé seulement dans loader/action

export async function action() {
  await saveAiProvider(...); // ✅ OK dans action
}

function Component() {
  return AI_PROVIDERS.map(...); // ✅ OK
}
```

## Règle à suivre

**Dans les fichiers `.server.ts`, mettre UNIQUEMENT :**

- Fonctions qui accèdent à la base de données
- Fonctions qui utilisent des secrets (clés API, etc.)
- Logique serveur pure (chiffrement, etc.)

**Dans les fichiers `.ts` (sans .server), mettre :**

- Types partagés
- Constantes partagées
- Utilitaires pure fonctions sans dépendances serveur

## Fichiers concernés dans cette PR

- ✅ `app/lib/ai-providers.ts` - Types et constantes partagés
- ✅ `app/lib/ai-providers.server.ts` - Fonctions CRUD avec DB
- ✅ `app/routes/orgs.$orgSlug.settings.tsx` - Import corrigé

## Documentation officielle

https://reactrouter.com/explanation/code-splitting#removal-of-server-code
