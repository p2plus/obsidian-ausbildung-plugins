# Integrations

These files are meant to be copied into a user's vault.

They are intentionally plain:

- no extra build step
- no hidden dependency on this repo at runtime
- easy to read and adjust in a text editor

## What lives here

### `templater/`

Use these when you already work from a template picker and want the body of the note to stay visible.

- `learning-note.md`: theory and concept notes
- `exercise-note.md`: worked tasks, calculations, and practice notes
- `quiz-source-note.md`: compact source notes that later turn into quiz material

### `quickadd/`

Use these when you want a short prompt flow and a note created for you.

- `new_learning_note.js`: creates a theory note
- `new_exercise_note.js`: creates an exercise note
- `new_quiz_source_note.js`: creates a compact quiz source note

## Rule of thumb

If the note is mainly something you need to explain, use the learning note.

If the note is mainly something you need to solve, use the exercise note.

If the note is mainly there to be turned into questions later, use the quiz source note.
