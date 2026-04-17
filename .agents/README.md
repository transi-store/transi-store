# .agents

`.agents/` is the canonical home for the repository's AI-facing assets.

## Structure

- `instructions/` - repository-wide and path-specific instructions
- `skills/` - reusable task workflows

## Compatibility

Some tools still expect their files in tool-specific locations. This repository keeps compatibility symlinks instead of duplicating content:

- `.github/copilot-instructions.md` -> `.agents/instructions/repository.instructions.md`
- `.github/instructions` -> `.agents/instructions`
- `.github/skills` -> `.agents/skills`
- `.claude/skills` -> `.agents/skills`
- `CLAUDE.md` -> `AGENTS.md`

## Rule of thumb

Edit files in `.agents/` first. Treat the tool-specific locations as adapters unless a tool explicitly requires otherwise.
