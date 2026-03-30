# Obsidian Ausbildung Plugins

Obsidian plugins for structured learning workflows, exam preparation, and progress tracking.

The repository bundles several standalone plugins that share a small common core and the same front matter conventions.

## What is in this repo

This is a monorepo with several standalone Obsidian plugins. Each plugin can be built and released on its own, but they share a common data model and a small shared core.

The repository includes:

- plugin code
- shared logic and tests
- CI setup
- a synthetic `test-vault` for reproducible QA

What it does not include:

- private vault content
- personal learning notes
- scraped training data

The example vault is intentionally small and artificial. It exists for reproducible tests and screenshots.

## Obsidian stack

These plugins are designed to work alongside an existing Obsidian setup.

- `Dataview` is treated as the preferred live layer, but never as a hard runtime requirement.
- `Periodic Notes` is supported as a target for review queues and day-level study planning.
- `Metadata Menu` fits naturally because the plugins stay YAML-first.
- `Kanban`, `Calendar`, `Templater`, `Buttons`, `QuickAdd`, `Database Folder`, and `Obsidian Git` all remain useful around the edges because the outputs are ordinary markdown files and normal front matter.
- `Excalidraw` stays complementary. The plugins do not try to own diagramming or visual thinking.

Optional integrations stay optional. The plugins start and run without hard dependencies on other community plugins.

## Current plugins

### Stable Tier 1

- `lernfortschritt-dashboard`
- `pruefungs-simulator`
- `lernplan-generator`

### Experimental

- `spaced-repetition-engine`
- `quiz-generator-markdown`
- `ausbildungs-analytics-dashboard`
- `ihk-keyword-tracker`

Experimental means the plugin is usable, but not yet held to the same release confidence as Tier 1.

## Quality bar

Each plugin is expected to have:

- a clean TypeScript build
- tested core logic
- a manual QA path against the synthetic vault
- a sensible fallback when optional plugins like `Dataview` are not present

## Local development

Install everything once:

```bash
npm install
npm run check
```

Build one plugin on its own:

```bash
npm run build --workspace lernfortschritt-dashboard
```

For manual QA, use the test vault and verify the resulting markdown inside Obsidian.
