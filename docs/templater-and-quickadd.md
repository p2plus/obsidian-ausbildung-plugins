# Templater And QuickAdd

The repo now ships a small starter set that you can actually drop into a vault instead of rebuilding from scratch.

## Templater

Files live in [integrations/templater](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/templater).

Included:

- [integrations/templater/learning-note.md](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/templater/learning-note.md)
- [integrations/templater/exercise-note.md](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/templater/exercise-note.md)
- [integrations/templater/quiz-source-note.md](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/templater/quiz-source-note.md)

Suggested setup:

1. Copy these files into your vault template folder, for example `_templates/learning/`.
2. Point Templater at that folder.
3. Create notes from Templater and let it ask for module, year, relevance, and time estimate.

These templates stay close to the metadata model the plugins already expect. No extra translation layer.

## QuickAdd

Files live in [integrations/quickadd](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/quickadd).

Included:

- [integrations/quickadd/new_learning_note.js](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/quickadd/new_learning_note.js)
- [integrations/quickadd/new_exercise_note.js](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/quickadd/new_exercise_note.js)
- [integrations/quickadd/new_quiz_source_note.js](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/integrations/quickadd/new_quiz_source_note.js)

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

## Practical split

Use Templater when:

- you like creating notes from a template palette
- you want the note body to stay visible and editable as a plain template

Use QuickAdd when:

- you want a short prompt flow and a note created for you
- you want fast capture without manually picking a template each time

Most people will probably use both.
