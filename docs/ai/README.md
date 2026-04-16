# AI repository layout

This document exists as a short bridge from the human-facing documentation in `docs/` to the canonical AI-facing configuration in `.agents/`.

## Canonical locations

- `AGENTS.md` is the generic root entry point for AI agents.
- `.agents/` is the source of truth for repository instructions and reusable skills.
- `specs/` contains execution-oriented feature briefs.
- `docs/technical-notes/` remains the durable source of truth for architecture and implementation rules.

## Why this file exists

`docs/technical-notes/README.md` links to this page from the documentation tree. Keeping this file makes the AI layout discoverable from the main technical docs without duplicating the real instructions.

If you need to update AI instructions or skills, edit `.agents/` first:

- `.agents/README.md`
- `.agents/instructions/`
- `.agents/skills/`

Tool-specific paths such as `.github/` and `.claude/` are compatibility adapters only.
