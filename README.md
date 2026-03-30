# Obsidian Ausbildung Plugins

This repository exists for one very practical reason: learning in Obsidian should feel structured, measurable, and less improvised, especially when you are working toward exams.

The plugins in here are built for study workflows, not for showing off a framework. They focus on things that matter in day-to-day use: knowing what you already covered, where your weak spots are, what to review next, and how to turn plain markdown notes into something you can actually train with.

## What is in this repo

This is a monorepo with several standalone Obsidian plugins. Each plugin can be built and released on its own, but they share a common data model and a small shared core so the behavior stays consistent across the stack.

The repository includes:

- plugin code
- shared logic and tests
- CI setup
- a synthetic `test-vault` for reproducible QA

What it does not include:

- private vault content
- personal learning notes
- scraped training data

The example vault is intentionally artificial. It exists to test behavior safely, not to ship somebody's real study material.

## Obsidian stack

These plugins are meant to sit comfortably inside a real Obsidian setup instead of pretending to replace it.

- `Dataview` is treated as the preferred live layer, but never as a hard runtime requirement.
- `Periodic Notes` is supported as a target for review queues and day-level study planning.
- `Metadata Menu` fits naturally because the plugins stay YAML-first.
- `Kanban`, `Calendar`, `Templater`, `Buttons`, `QuickAdd`, `Database Folder`, and `Obsidian Git` all remain useful around the edges because the outputs are ordinary markdown files and normal front matter.
- `Excalidraw` stays complementary. The plugins do not try to own diagramming or visual thinking.

In short: the repo assumes a serious Obsidian stack, but it does not collapse if one plugin is missing.

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

Experimental here does not mean throwaway. It means the plugin is useful, but not yet at the same release confidence as Tier 1.

## Quality bar

Nothing should go public just because it builds once.

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

If you want to work on a plugin seriously, use the test vault and verify the markdown output in Obsidian instead of trusting the terminal alone.
