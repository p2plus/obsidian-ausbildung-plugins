# Real-World Blind Spots

This repo covers a lot of ground inside Obsidian. The rough edges usually appear outside Obsidian: IHK portal rules, Betriebspraxis, and the difference between "good notes" and "exam-ready repetition".

Important boundary:

- this repo can ship templates, snippets, starter assets, and workflows
- it cannot embed third-party Obsidian plugins like `Pandoc Reference`, `Waypoints`, or a dedicated flashcard plugin
- those stay optional dependencies the user installs and configures in their own vault

## 1. IHK export check first, not last

The biggest operational risk is not note quality. It is format acceptance.

Before someone builds a whole reporting workflow around Obsidian, they should check:

- does the Ausbildungsbetrieb accept PDF exports from Obsidian?
- does the local IHK still accept uploaded PDFs?
- or does everything have to go into an external portal such as `BLok`?

If a portal is mandatory, the practical setup is:

- use Obsidian as the draft system
- write and structure reports locally
- export either to PDF or to a cleaned plain-text draft
- transfer the result into the official portal once or twice per week

If the user has installed `Pandoc Reference`, it is worth building:

- one export template for a clean PDF that resembles the official report layout
- one export template for plain copy-paste without markdown noise

That avoids the classic end-of-month scramble where the content exists but the final format still fights back.

The repo now at least carries a draft-side helper for that path:

- [templates/report-export-draft.md](../templates/report-export-draft.md)

## 2. Lernfeld matrix for theory-to-practice transfer

In the real Ausbildungsalltag, Berufsschule and Betrieb often drift apart in time.

That gap becomes painful in:

- Fachgespräch
- Präsentation
- transfer questions in the exam

The practical fix is not another plugin view. It is a visible transfer map.

Use an Obsidian `Canvas` board:

- put the 12 Lernfelder on the canvas
- link school notes to each field
- add real projects, tickets, process changes, ERP incidents, or department workflows from the company
- connect theory to actual work

For someone with a key-user / ERP / production background, this matters even more. Transfer is usually the strongest argument in a Fachgespräch, especially when processes, departments, and handoffs are involved.

The repo can hold the starting asset for that:

- [templates/lernfeld-matrix.canvas](../templates/lernfeld-matrix.canvas)

## 3. Exam mode needs active recall, not only archives

The repo already helps with review queues, quiz generation, and simulation. That still does not fully replace a frictionless flashcard habit.

If the user installs a dedicated `Spaced Repetition` plugin, a clean split works well:

- keep the repo for note quality, planning, review pressure, and quiz output
- keep flashcard-style recall in the dedicated repetition plugin

Practical pattern:

- mark high-value definitions with `#card`
- keep short, atomic questions inside theory notes
- let the spaced repetition layer handle the frequent drilling
- let this repo handle the bigger learning workflow around it

That division is usually more robust than trying to force one system to do everything.

This repo can support that style, but it does not replace the dedicated plugin. The practical handoff is:

- store the source knowledge here
- use tags such as `#card` inside the note body
- let the external repetition plugin handle the high-frequency drilling layer

## 4. Stakeholder log for real people in the Betrieb

One thing apprentices often underestimate: a lot of useful knowledge is tied to people, not documents.

Helpful structure:

```text
04_Kontakte/
  Einkauf/
  Vertrieb/
  Lager/
  IT/
  Schule/
```

Each note can track:

- role
- department
- what the person taught you
- which processes they own
- which topics are worth following up on

If the user installs `Waypoints`, that folder becomes much easier to navigate because department overviews stop needing manual maintenance.

The repo can at least hold the note structure for the people side:

- [templates/contact-note.md](../templates/contact-note.md)

## 5. QuickAdd and Dataview are not optional in practice

Strictly speaking, the repo can run without them.

In practice:

- `QuickAdd` is what turns note capture into a habit
- `Dataview` is what turns raw metadata into management visibility

Good examples:

- "create today's daily report"
- "create a new exercise note"
- "which Lernfelder did I not touch this month?"
- "how many report hours are still missing?"

The repo now also carries starter snippets for the visibility side:

- [integrations/dataview](../integrations/dataview)

That is the difference between a clever setup and a setup people actually keep using on a tired Thursday afternoon.

## Suggested operating model

If the user installs the surrounding dependencies, a pragmatic stack looks like this:

- this repo for learning flow, note quality, review pressure, planning, and exam simulation
- `QuickAdd` for fast capture
- `Dataview` for dashboards and blind spots
- `Canvas` for Lernfeld vs. Betrieb transfer
- `Pandoc Reference` for PDF export if PDFs are accepted
- a dedicated spaced repetition plugin for dense drill work
- `Waypoints` for people and department navigation

That is usually enough structure without making the vault feel like an ERP rollout in miniature.
