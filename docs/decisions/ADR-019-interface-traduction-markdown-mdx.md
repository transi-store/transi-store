# ADR-019: Side-by-side translation interface for Markdown / MDX documents

**Date**: 2026-04-29

**Status**: Accepted ✅

## Context

Until now, every translatable resource in transi-store was modelled as a flat
**key / value** bag: a `translation_key` row per key, one `translations` row
per locale, edited cell-by-cell in the standard translations table.

This model fits well for short UI strings (`common.save`, `checkout.confirm_button`),
which is the original target use case. It maps cleanly to the export formats
already supported (JSON, XLIFF, YAML, CSV, PO, INI, PHP) since they are all
key/value formats.

However, it breaks down for **long-form content**: marketing pages, product
documentation, MDX guides. Such content has no meaningful per-key granularity:
splitting a 2,000-word article into hundreds of `paragraph_42`-style keys is
both painful for translators (no surrounding context) and harmful for
translation quality (paragraphs get translated in isolation, tone drifts, and
markdown structure decays).

A specific need surfaced: translating the project's own user documentation
(`apps/website/app/docs/*.mdx`) and similar long-form `.md` / `.mdx` files
hosted by users. Forcing this content through the key/value path would have
required either:

- Splitting documents into one key per heading or paragraph — losing the
  document as a coherent translation unit.
- Storing the whole document as a single key value — but then the editor is
  a one-line input and there is no AI-assisted, section-aware workflow.

Neither was acceptable. We therefore introduced a **second, parallel storage
and editing path** dedicated to document formats.

## Decision

### 1. Two new "document" formats in `SupportedFormat`

`SupportedFormat` now exposes `MARKDOWN` (`.md`, `.markdown`) and `MDX`
(`.mdx`) alongside the existing key/value formats, plus two helpers in
`@transi-store/common`:

- `DOCUMENT_FORMATS` — the read-only list of document formats.
- `isDocumentFormat(format)` — branching predicate used at every fork between
  the key/value path and the document path.

The key/value `createTranslationFormat()` factory throws an explicit
`DocumentFormatNotSupportedError` when called with `MARKDOWN` or `MDX`. This
fails loud at the boundary instead of silently falling back to a misfit
adapter.

### 2. Dedicated storage tables (one document body per locale)

Two new tables, kept entirely separate from `translation_keys` /
`translations`:

```
markdown_document_translations
├── id (PK)
├── project_file_id (FK → project_files, ON DELETE CASCADE)
├── locale (varchar(10))
├── content (text)              -- full document body
├── created_at / updated_at
└── UNIQUE(project_file_id, locale)

markdown_section_states                -- sidecar
├── id (PK)
├── document_translation_id (FK → markdown_document_translations, CASCADE)
├── structural_path (varchar(500))
├── is_fuzzy (boolean)
├── last_ai_translated_at (timestamp, nullable)
├── created_at / updated_at
└── UNIQUE(document_translation_id, structural_path)
```

The document body is the source of truth; the sidecar holds **per-section
metadata** (fuzzy flag, last AI run) keyed by a `structuralPath` derived
from the markdown AST (see below). The sidecar is reconciled on every save
inside the same transaction: rows whose `structuralPath` no longer exists
in the parsed document are deleted.

Optimistic concurrency is enforced via an `expectedUpdatedAt` parameter on
`saveDocumentTranslation()`, which raises `MarkdownDocumentConflictError`
when the row was modified between read and write.

### 3. Structural-path-based section alignment

Documents are split into `Section`s using `remark-parse` + `remark-gfm`
(+ `remark-mdx` for MDX) by walking the AST and using **headings** and
**fenced code blocks** as boundaries. Each section receives a stable
`structuralPath` such as `h1:0/h2:1/code:0`, derived from the heading
hierarchy and sibling positions — **never** from the heading text itself.
This is the load-bearing invariant: the path of a section in the English
document equals the path of its translated counterpart in the French
document, even though every heading and paragraph has been rewritten.

`alignSections(left, right)` walks both lists in parallel and pairs them by
`structuralPath` equality, with a small look-ahead window (3 sections) to
tolerate one-side insertions/deletions. The result drives:

- **UI**: cross-side scroll synchronization, transient counterpart
  highlight on cursor moves, "next orphan" navigation.
- **Persistence**: section-level fuzzy / AI-translated state is keyed by
  `structuralPath`, so it survives heading-text translation but is dropped
  cleanly when the structure itself changes.

### 4. Section-aware AI translation

`translateMarkdownWithAI()` extends the existing AI translation server with
a markdown-aware system prompt that explicitly instructs the model to
preserve heading levels, fenced code blocks, inline code, links, images,
lists, blockquotes, tables, and (for MDX) JSX components and `{expr}`
expressions.

Two scopes are exposed through the same endpoint:

- **Section** — AI-translates the current section only, returning multiple
  suggestions that the user picks from in a dialog. This reuses the
  existing suggestion / confidence / notes contract.
- **Document** — AI-translates the full document body in one shot, returning
  a single `translatedText` written back via the normal save path.

Section-level AI calls also receive the current target-locale draft as a
**tone reference** (used for terminology consistency, not copied verbatim).

### 5. Full-width side-by-side route

Document files are edited on a **dedicated full-width route**:

```
/orgs/:orgSlug/projects/:projectSlug/files/:fileId/translations/markdown
```

The classic per-key translations route auto-redirects to it when the file's
format is `markdown` or `mdx`. The layout is:

- Two `MarkdownEditorClient` instances (CodeMirror 6 with
  `@codemirror/lang-markdown`, light + dark themes via `Compartment`)
  side by side.
- A vertical **center action bar** between the two editors, exposing
  copy section / copy document, AI-translate section / document,
  toggle fuzzy, jump to next orphan, swap sides.
- A `LanguagePicker` per side; the user freely chooses which two locales
  are shown.
- A `SectionSyncContext` that connects the two editors: each editor
  publishes its sections + cursor position; subscribers on the other
  side scroll and highlight their counterpart.

Saves are debounced (600 ms) and use an action discriminator
(`MarkdownTranslateAction.SaveContent` / `ToggleFuzzy` /
`TranslateSection` / `TranslateDocument`) on a single page action.

## Reasons

1. **Right unit of translation**: a long-form document is a single
   translation unit; section-level granularity is for the editor UX, not
   for storage. A second storage path captures this directly instead of
   distorting the key/value model.
2. **Translation quality**: AI translation needs the whole section as
   context; structural-path alignment lets the UI feed the right slice and
   the right tone reference automatically.
3. **Stability across translation**: keying section metadata by
   `structuralPath` rather than heading text means the fuzzy / AI-run
   state survives the very thing we expect to happen — translation of
   headings.
4. **Clear boundary**: `isDocumentFormat()` and the explicit
   `DocumentFormatNotSupportedError` make the fork between the two paths
   visible and impossible to miss; export / import / format-factory code
   keeps a single shape per branch.
5. **Reuse where it pays**: the same AI provider configuration, the same
   per-organization API keys, the same auth middleware and i18n machinery
   are reused. Only what genuinely differs is forked.

## Alternatives considered

### 1. Keep the key/value model, one key per heading or paragraph

**Rejected**. Generates hundreds of synthetic keys per document, loses the
document as a translation unit, makes structural changes (renaming a
heading, reordering a paragraph) destructive, and yields poor AI output
because each key is translated in isolation.

### 2. Single `text` column on a translation row, no section model

**Rejected**. Edits the document as one opaque blob: no section-level
fuzzy flag, no per-section AI translation, no scroll sync, no orphan
detection. The editing experience would not justify the feature.

### 3. Match sections by heading text equality

**Rejected**. The whole point of translation is that heading text changes.
Path-based matching by sibling position is invariant under translation
and only breaks when the structure itself changes — which is the case
where a mismatch is actually meaningful.

### 4. Embed document editing in the existing per-key translations table

**Rejected**. The standard table is row-per-key with side-by-side cells
for locales; a markdown editor needs full-page width, two large editors
side by side, and a different action vocabulary (copy section, jump to
orphan, swap sides). A dedicated route keeps both UIs simple.

### 5. Store sections as separate rows in the database

**Rejected**. The document body is the source of truth — sections are a
parser artefact. Storing sections as rows would force write-path
re-segmentation, complicate transactional save, and create drift between
what the user typed and what's stored.

## Consequences

### Positive

- Long-form content becomes a first-class citizen with an editor
  designed for it.
- Per-section metadata (fuzzy, last AI run) is stable across heading
  translation thanks to structural-path keying.
- Export / import / format-factory paths stay clean: document formats
  fail loud at the boundary and route through their own data-access
  module.
- AI translation prompts are tailored to markdown / MDX, preserving
  headings, code blocks, links and JSX.
- The classic per-key translations route auto-redirects to the new
  layout when the selected file is a document format — no extra
  navigation required.

### Negative

- Two storage paths to maintain in parallel: any feature that touches
  "all translations of a project" (export, branch, search, deletion
  audit) must consider both `translations` and
  `markdown_document_translations`.
- `structuralPath` keying is robust to text translation but **not** to
  structural rewrites: reordering or splitting headings invalidates the
  sidecar entries for the affected sections (they are dropped on next
  save). This is intentional but worth documenting for users.
- Branch workflow (ADR-018) currently does not cover document
  translations — only key-level additions/deletions. Extending branches
  to documents is out of scope for this ADR.
- The `markdown_document_translations` row is the upsert anchor for all
  section-state operations: callers must save content at least once
  before flagging a section as fuzzy
  (`MarkdownTranslationMissingError`).

## Files created/modified

### Created

- `apps/website/app/lib/markdown-sections.ts` — isomorphic parser,
  alignment, counterpart resolution.
- `apps/website/app/lib/markdown-sections.test.ts` — parser /
  alignment / offset / counterpart unit tests.
- `apps/website/app/lib/markdown-documents.server.ts` — server-side
  data access (save with sidecar reconciliation,
  `setSectionFuzzy`, `recordAiTranslation`, optimistic concurrency).
- `apps/website/app/components/markdown-editor/*` — CodeMirror 6
  wrapper with markdown language and light/dark themes.
- `apps/website/app/components/markdown-translate/*` — full layout,
  center action bar, language pickers, section-sync context, AI
  suggestions dialog.
- `apps/website/app/routes/orgs.$orgSlug.projects.$projectSlug.files.$fileId.translations.markdown/`
  — full-width route.
- `apps/website/app/routes/api.orgs.$orgSlug.projects.$projectSlug.markdown-translate-section/`
  — POST endpoint reused by the action bar.

### Modified

- `packages/common/src/supported-format.ts` — `MARKDOWN`, `MDX`,
  `DOCUMENT_FORMATS`, `isDocumentFormat()`, extension mapping.
- `apps/website/drizzle/schema.ts` — `markdownDocumentTranslations`,
  `markdownSectionStates` and inferred types.
- `apps/website/drizzle/relations.ts` — relations for the new tables.
- `apps/website/app/lib/format/format-factory.server.ts` — explicit
  `DocumentFormatNotSupportedError` for document formats.
- `apps/website/app/lib/ai-translation.server.ts` —
  markdown-aware system prompt + `translateMarkdownWithAI()`.
- `apps/website/app/routes.ts` — new markdown route + redirect from
  the classic translations route.
- `apps/website/app/locales/{en,fr,de,es}/translation.json` — new
  `markdownTranslate.*` keys.

## References

- [ADR-008](./ADR-008-migration-postgresql-drizzle-v1.md) — PostgreSQL +
  Drizzle storage layer.
- [ADR-009](./ADR-009-editeur-icu-codemirror.md) — first introduction
  of CodeMirror as the editor for translation values.
- [ADR-010](./ADR-010-fuzzy-search.md) — pg_trgm fuzzy search (the
  "fuzzy" terminology used here for sections is unrelated; it refers
  to the gettext-style "needs review" flag).
- [remark](https://github.com/remarkjs/remark) — markdown AST parser
  (`remark-parse`, `remark-gfm`, `remark-mdx`).
- [CommonMark](https://commonmark.org/) — markdown specification used
  by `remark-parse`.
