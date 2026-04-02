# Vault Onboarding

This document explains how a user can bring real study material into the plugin suite.

## What the repo is

This repo is a mono-repo of Obsidian plugins. It is not a packaged curriculum. The user's own notes are the source material.

That means onboarding is really about:

- choosing which vault content should count as learning material
- adding enough metadata for the plugins to reason about it
- generating review, quiz, dashboard, and planning outputs from those files

## Recommended folder model

A simple layout works best:

```text
Lernen/
  LF01/
  LF02/
  AP1/
  AP2/
  Uebungen/
  Loesungen/
  Periodic/
  _plugin_outputs/
  quizzes/
```

This is not required. It is only a sane default.

## Safe onboarding for an existing vault

1. Choose one or two folders that actually represent learnable notes.
2. Set `rootFolders` in the plugin settings to only those folders at first.
3. Add front matter to a small sample of notes.
4. Generate outputs and inspect them.
5. Expand scope only after the outputs look sensible.

This avoids scanning everything at once and getting noisy analytics from unrelated material.

## Minimal metadata strategy

Users do not need to migrate the whole vault at once.

Start with:

```yaml
---
lernstatus: "neu"
lerntyp: "theorie"
modul_id: "UNSORTIERT"
pruefungsrelevanz: "mittel"
---
```

Then gradually add:

- `ausbildungsjahr`
- `score_last`
- `score_best`
- `next_review`
- `last_review`
- `time_estimate_min`

## Bootstrap workflow

The repo includes [scripts/bootstrap_vault.py](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/scripts/bootstrap_vault.py).

Use it when:

- the source notes do not yet have learning YAML
- a user wants to create a safe imported copy set first
- a user wants one consistent baseline for a whole folder

Example:

```bash
python3 scripts/bootstrap_vault.py \
  --source "/path/to/source-notes" \
  --target "/path/to/your-vault/Lernen/Imported" \
  --lernstatus gelesen \
  --lerntyp theorie \
  --modul-id UNSORTIERT \
  --pruefungsrelevanz mittel \
  --ausbildungsjahr 1
```

The script:

- copies markdown files into a target folder
- preserves relative folder structure
- injects YAML when missing
- fills missing learning fields without overwriting existing ones

## Templates

Use these files as starting points:

- [templates/learning-note.md](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/templates/learning-note.md)
- [templates/exercise-note.md](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/templates/exercise-note.md)
- [templates/exam-quiz-note.md](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/templates/exam-quiz-note.md)

These fit well with:

- Templater
- QuickAdd
- Metadata Menu

## Common mistake

The biggest mistake is treating every markdown file as a learning note.

A vault often contains:

- project notes
- admin notes
- archive material
- references
- operational docs

Only a subset should feed learning analytics and review workflows.
