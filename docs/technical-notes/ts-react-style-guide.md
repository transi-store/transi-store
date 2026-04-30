# Style guide and file architecture

To keep the code maintainable, we MUST follow the style and file architecture conventions described in this document:

- Style guide: https://mapado.github.io/best-practices/docs/js/style
- ReactJS: https://mapado.github.io/best-practices/docs/js/react
- Translations: https://mapado.github.io/best-practices/docs/js/translations

A React component should do one thing, and do it well. If a component grows too large or complex, split it into smaller components.

For example, an organization settings page that contains:

- the list of API keys
- the list of AI translation configurations

should have at least two child components:

- `ApiKeysList` for the list of API keys
- `TranslationAiSettings` for the list of AI translation configurations

The `ApiKeysList` component can itself contain an `ApiKeyItem` component for each API key and an `ApiKeyHelper` component to display help information about API keys.
Similarly, `TranslationAiSettings` can contain a `TranslationAiSettingItem` component for each AI translation configuration.

## File organization

Each component must be in its own file, with a PascalCase filename matching the component name. For example, the `ApiKeysList` component must be in `ApiKeysList.tsx`.

Several closely related components can be grouped in the same folder with an `index.ts` to export them.

### Simple example: Related components in the same folder

```
src/components/OrganizationSettings/ApiKeys/
├── index.ts
├── ApiKeysList.tsx
├── ApiKeyItem.tsx
└── ApiKeyHelper.tsx
```

The `index.ts` file must export the components from the folder that are useful outside of it:

```typescript
export { default } from "./ApiKeysList";
```

### Example with subfolders: Multiple features

For a page with several distinct features (e.g. a settings page with API keys and AI configuration), create subfolders per feature:

```
app/routes/orgs.$orgSlug.settings/
├── index.tsx (loader, action, main route component)
├── ApiKeys/
│   ├── index.tsx (main ApiKeys component)
│   ├── ApiKeysList.tsx
│   ├── ApiKeyItem.tsx
│   ├── ApiKeyCreationDialog.tsx
│   └── ApiKeyDocumentation.tsx
└── AiTranslation/
    ├── index.tsx (main AiTranslation component)
    ├── AiTranslationSettings.tsx
    ├── AiTranslationProviderItem.tsx
    └── AiTranslationConfigDialog.tsx
```

Each subfolder exports its main component via `index.tsx` as the default export.

The route's `index.tsx` can then import these components easily:

```
import ApiKeysList from "./ApiKeys";
import AiTranslationSettings from "./AiTranslation";
```
