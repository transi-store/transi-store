# Documentation Pages

This document explains how the user-facing documentation pages work and how to keep them up to date.

## Overview

The documentation section is available at `/docs` in the application. It contains two main guides:

| Page            | Route             | File                                  | Audience                  |
| --------------- | ----------------- | ------------------------------------- | ------------------------- |
| User Guide      | `/docs/usage`     | `apps/website/app/docs/usage.mdx`     | End users of the platform |
| Developer Guide | `/docs/developer` | `apps/website/app/docs/developer.mdx` | Self-hosting developers   |

The docs header link is in the site header alongside the API doc link.

## Tech stack

- **Content**: MDX files (Markdown with JSX) in `apps/website/app/docs/`
- **Rendering**: `@mdx-js/rollup` Vite plugin compiles MDX to React components at build time
- **Styling**: Custom MDX component map in `apps/website/app/components/docs/MdxComponents.tsx` using Chakra UI
- **Layout**: `apps/website/app/components/docs/DocLayout.tsx` with sticky sidebar navigation
- **UI Mockups**: React components in `apps/website/app/components/docs/ui-mockups/` — used inline in MDX files to show the UI without screenshots

## How to update the docs

### Adding content to an existing page

Edit the relevant MDX file:

- `apps/website/app/docs/usage.mdx` — for user-facing features (translations editor, branches, import/export, AI, teams)
- `apps/website/app/docs/developer.mdx` — for self-hosting, configuration, and CLI

MDX supports standard Markdown syntax plus JSX components:

```mdx
## My new section {#my-section}

Regular markdown paragraph.

<SomeReactComponent />

| Column 1 | Column 2 |
| -------- | -------- |
| Value    | Value    |
```

### Adding a UI mockup

When a feature needs a visual illustration, create a new mockup component:

1. Create a file in `apps/website/app/components/docs/ui-mockups/MyFeatureMockup.tsx`
2. Build the mockup using Chakra UI components and fake data (no real database calls)
3. Import and use it in the MDX file:

```mdx
import { MyFeatureMockup } from "~/components/docs/ui-mockups/MyFeatureMockup";

<MyFeatureMockup />
```

### Adding a new docs page

1. Create a new MDX file in `apps/website/app/docs/`
2. Create a new route file in `apps/website/app/routes/` that imports the MDX file
3. Register the route in `apps/website/app/routes.ts` inside the `docs-layout.tsx` layout block
4. Add the new page to the sidebar in `apps/website/app/components/docs/DocLayout.tsx`

### Updating the sidebar navigation

The sidebar is defined in `DocLayout.tsx` as the `NAV_SECTIONS` constant. Each section has a title and an array of items with `label` and `href`. The `href` can include a hash anchor (e.g. `/docs/usage#branch-management`).

## When to update the docs

**Always update the docs when:**

- A new feature is added to the translation editor, branches, import/export, or AI
- The self-hosting setup or configuration options change
- The CLI tool gains new commands or options
- Pricing or tier information changes

**The sidebar nav should be updated when:**

- A significant new section is added to a docs page
- A section is renamed or removed

## MDX component reference

The following custom components are available in MDX files (defined in `MdxComponents.tsx`):

| Element             | Rendering                                |
| ------------------- | ---------------------------------------- | --- | ---------------------------- |
| `# Heading`         | Chakra UI `Heading` (h1–h4 with spacing) |
| `paragraph`         | Chakra UI `Text` with `mb={4}`           |
| `- list item`       | Styled `ul`/`li` with disc bullets       |
| `` `inline code` `` | Chakra UI `Code` component               |
| ` ```block``` `     | Styled `pre` with bg.subtle and border   |
| `> blockquote`      | Accented left-border box                 |
| `---`               | Separator with vertical margin           |
| `[link](url)`       | Accent-colored underlined link           |
| `                   | table                                    | `   | Scrollable table with border |
