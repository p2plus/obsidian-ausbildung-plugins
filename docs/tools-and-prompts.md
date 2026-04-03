# Tools And Prompts

These plugins work best when users combine them with a few established Obsidian tools.

## Recommended companion plugins

- `Dataview` for live tables and views
- `Periodic Notes` for daily review queues
- `Templater` for structured note creation
- `QuickAdd` for fast capture
- `Metadata Menu` for YAML maintenance
- `Kanban` for task and progress boards
- `Calendar` for exam dates and milestones
- `Obsidian Git` for backup and sync
- `Canvas` for linking Lernfelder to real projects and business processes

Optional, but useful if the user has installed them:

- `Pandoc Reference` for PDF exports that need to resemble official reporting layouts
- a dedicated `Spaced Repetition` plugin for flashcard-heavy drilling
- `Waypoints` for contact and department overviews

If you want ready-to-use files instead of rebuilding setup by hand, use:

- [docs/templater-and-quickadd.md](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/docs/templater-and-quickadd.md)
- [integrations/templater](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/templater)
- [integrations/quickadd](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/quickadd)
- [docs/real-world-blind-spots.md](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/docs/real-world-blind-spots.md)

## Template prompts

### New learning note

Use in Templater, QuickAdd, or a manual creation prompt:

```text
Create a new learning note with:
- a short topic title
- front matter for lernstatus, lerntyp, modul_id, pruefungsrelevanz, ausbildungsjahr
- one summary section
- one key concepts section
- one examples section
- one open questions section
```

### New exercise note

```text
Create a new exercise note with:
- lerntyp set to uebung
- a clear task statement
- assumptions
- a working area
- a solution checklist
- a reflection block for mistakes
```

### New quiz source note

```text
Create a concise theory note that can later be turned into quiz questions.
Use:
- clear headings
- short factual bullets
- highlighted definitions
- explicit contrasts and examples
```

## Metadata Menu field suggestions

Recommended controlled fields:

- `lernstatus`: `neu`, `gelesen`, `geuebt`, `sicher`, `beherrscht`
- `lerntyp`: `theorie`, `uebung`, `quiz`, `pruefung`, `review`
- `pruefungsrelevanz`: `niedrig`, `mittel`, `hoch`, `ihk-kritisch`

Numeric fields:

- `score_last`
- `score_best`
- `time_estimate_min`

Date fields:

- `last_review`
- `next_review`

## AI prompt ideas for BYOK users

### Clean up a theory note

```text
Restructure this note into a compact exam-prep note.
Keep facts grounded in the source.
Add:
- key points
- common traps
- one comparison table
- three quiz-worthy statements
```

### Turn a note into practice material

```text
Based on this note, generate:
- 5 multiple-choice questions
- 2 short-answer questions
- 1 mini case
Keep distractors plausible and avoid trivia.
```

### Improve weak-module review

```text
Summarize why this topic matters for the exam.
Then produce:
- a three-point recap
- one memory hook
- one likely exam question
```

## What users should not assume

- AI does not replace the markdown source.
- The plugins do not import PDFs or external databases automatically.
- A vault with zero YAML can still be scanned, but the outputs will be less useful.
- Export into IHK or company systems is not magically solved by good markdown. If the user needs PDF or portal output, the export path has to be chosen deliberately.
