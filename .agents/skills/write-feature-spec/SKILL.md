---
name: write-feature-spec
description: Create or refresh an execution-oriented feature brief in specs/. Use this when asked to write a feature specification, implementation brief, or task-ready plan for agents.
---

Use this workflow when turning a request into a reusable repository spec:

1. Read `specs/README.md`.
2. Read `specs/TEMPLATE.md`.
3. Read `docs/technical-notes/README.md` and the notes relevant to the feature area.

Authoring rules:

1. Create or update the spec in `specs/feature-briefs/`.
2. Keep the spec task-oriented: context, goal, touchpoints, constraints, acceptance criteria, and validation.
3. Explicitly list the technical notes that must be read before implementation.
4. Do not restate durable architecture rules in full. Link back to `docs/technical-notes/` instead.
5. If an older brief already exists for the same feature, update it or clearly supersede it instead of creating ambiguous duplicates.

A good spec should help an agent execute work with less guesswork while still relying on the technical notes for stable repository conventions.
