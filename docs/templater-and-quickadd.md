# Templater And QuickAdd

The repo now ships a small starter set that you can actually drop into a vault instead of rebuilding from scratch.

If you only read one thing on this page, read this:

- `learning-note` is for theory and concept notes
- `exercise-note` is for work you actively solve
- `quiz-source-note` is for compact input that should later turn into quiz questions

There is also a short overview in [integrations/README.md](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/README.md).

## Templater

Files live in [integrations/templater](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/templater).

Included:

- [integrations/templater/learning-note.md](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/templater/learning-note.md)
- [integrations/templater/exercise-note.md](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/templater/exercise-note.md)
- [integrations/templater/quiz-source-note.md](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/templater/quiz-source-note.md)

What each one is for:

- `learning-note`: when you want to understand and remember a topic cleanly
- `exercise-note`: when the note should capture the actual solving process
- `quiz-source-note`: when the note should be short, factual, and easy to turn into questions later

Suggested setup:

1. Copy these files into your vault template folder, for example `_templates/learning/`.
2. Point Templater at that folder.
3. Create notes from Templater and let it ask for module, year, relevance, and time estimate.

These templates stay close to the metadata model the plugins already expect. No extra translation layer.
They also now carry a short purpose hint at the top of the note so a user is not dropped into a blank structure without context.

## QuickAdd

Files live in [integrations/quickadd](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/quickadd).

Included:

- [integrations/quickadd/new_learning_note.js](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/quickadd/new_learning_note.js)
- [integrations/quickadd/new_exercise_note.js](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/quickadd/new_exercise_note.js)
- [integrations/quickadd/new_quiz_source_note.js](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/quickadd/new_quiz_source_note.js)

What each one creates:

- `new_learning_note.js`: a theory note with metadata and a clean study structure
- `new_exercise_note.js`: a practice note with task, solution path, result, and reflection
- `new_quiz_source_note.js`: a concise source note for later quiz generation

Suggested setup:

1. Copy the scripts into your vault, for example `_quickadd/`.
2. In QuickAdd, create a new `Macro` or `User Script` choice.
3. Point the choice at one of the shipped scripts.
4. Run it once and check the target folder and metadata defaults still match your vault.

What the scripts do:

- ask for title, module, year, and relevance
- create the note in a chosen folder
- add the baseline frontmatter
- open the new note immediately

They are intentionally small. You should be able to read them in two minutes and change a default folder without spelunking through a framework.

## Are these templates actually any good?

Good enough to start with, yes. They are opinionated on purpose:

- they bias notes toward recall, review, and later reuse
- they keep the frontmatter aligned with the plugin suite
- they do not try to be perfect master templates for every study style

If a user already has a strong note-taking style, these are better treated as a base layer than as sacred structure.

## Practical split

Use Templater when:

- you like creating notes from a template palette
- you want the note body to stay visible and editable as a plain template

Use QuickAdd when:

- you want a short prompt flow and a note created for you
- you want fast capture without manually picking a template each time

Most people will probably use both.
