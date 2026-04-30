---
description: Guidance for technical docs, user docs, AI instructions, and execution specs.
applyTo: "README.md,AGENTS.md,CLAUDE.md,docs/**/*.md,apps/website/app/docs/**/*.mdx,.agents/**/*.md,.github/**/*.md,.claude/**/*.md,specs/**/*.md"
---

All documentation files in this repository must be written in **English**, regardless of the language used in conversation with the AI agent. This applies to `docs/technical-notes/`, `.agents/`, `specs/`, and any other code file tracked in this repository.

Keep the documentation layers distinct:

- `docs/technical-notes/` is the durable source of truth for architecture, patterns, and implementation rules
- `.agents/` is the canonical home for AI-facing instructions and skills
- `specs/` is for execution-oriented feature briefs and task context
- `.github/` and `.claude/` are compatibility adapters when a tool requires those paths

When changing a user-visible feature, update the MDX docs in `apps/website/app/docs/` if the behavior, workflow, or self-hosting story changed.

Keep AI-facing files concise and task-oriented. Put stable product knowledge in `docs/technical-notes/`, not in specs or skills.

When creating a new spec, start from `specs/TEMPLATE.md` and list the relevant technical notes explicitly.
