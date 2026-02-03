# Guide de style et architecture des fichiers

Pour avoir du code maintenable, on DOIT suivre les conventions de style et d'architecture des fichiers décrites dans ce document :

- Guide de style : https://mapado.github.io/best-practices/docs/js/style
- ReactJS : https://mapado.github.io/best-practices/docs/js/react
- Traductions : https://mapado.github.io/best-practices/docs/js/translations

Un composant React ne doit faire qu'une seule chose, et le faire bien. Si un composant devient trop gros ou complexe, il faut le diviser en plusieurs composants plus petits.

Par exemple, la page de paramétrage d'une organisation qui contient :

- la liste des clés API,
- la liste des configrations des IA de traductions

doit contenir au moins deux composants enfants :

- `ApiKeysList` pour la liste des clés API
- `TranslationAiSettings` pour la liste des configurations des IA de traductions

Le composant `ApiKeysList` peut lui-même contenir un composant `ApiKeyItem` pour chaque clé API, et un composant `ApiKeyHelper` pour afficher des informations d'aide sur les clés API.
De même, le composant `TranslationAiSettings` peut contenir un composant `TranslationAiSettingItem` pour chaque configuration d'IA de traduction.

## Organisation des fichiers

Chaque composant doit être placé dans un fichier séparé, avec un nom de fichier en PascalCase correspondant au nom du composant. Par exemple, le composant `ApiKeysList` doit être placé dans un fichier `ApiKeysList.tsx`.

Plusieurs composants très liés peuvent être regroupés dans un même dossier, avec un fichier `index.ts` pour exporter les composants. 

### Exemple simple : Composants apparentés dans un même dossier

```
src/components/OrganizationSettings/ApiKeys/
├── index.ts
├── ApiKeysList.tsx
├── ApiKeyItem.tsx
└── ApiKeyHelper.tsx
```

Le fichier `index.ts` doit exporter les composants du dossier utiles à l'extérieur du dossier :

```typescript
export { default } from "./ApiKeysList";
```

### Exemple avec sous-dossiers : Fonctionnalités multiples

Pour une page avec plusieurs fonctionnalités distinctes (ex: page de paramètres avec clés API et configuration IA), créer des sous-dossiers par fonctionnalité :

```
app/routes/orgs.$orgSlug.settings/
├── route.tsx (loader, action, composant principal)
├── ApiKeys/
│   ├── index.ts
│   ├── ApiKeysList.tsx
│   ├── ApiKeyItem.tsx
│   ├── ApiKeyCreationDialog.tsx
│   └── ApiKeyDocumentation.tsx
├── AiTranslation/
│   ├── index.ts
│   ├── AiTranslationSettings.tsx
│   ├── AiTranslationProviderItem.tsx
│   └── AiTranslationConfigDialog.tsx
└── index.ts
```

Chaque sous-dossier exporte son composant principal via `index.ts` :

```typescript
// ApiKeys/index.ts
export { default } from "./ApiKeysList";

// AiTranslation/index.ts  
export { default } from "./AiTranslationSettings";
```

Le fichier `route.tsx` importe alors facilement ces composants :

```typescript
import ApiKeysList from "./ApiKeys";
import AiTranslationSettings from "./AiTranslation";
```
