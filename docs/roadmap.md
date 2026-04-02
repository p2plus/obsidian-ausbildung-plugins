# Roadmap

This is the practical roadmap, not the pitch deck version.

The repo already has enough moving parts. The next work should make it easier to install, easier to trust, and harder to break.

## Near term

### 1. Installation should stop being fiddly

- keep `scripts/install_plugin.py` working and documented
- add one-line examples per plugin
- add a small sanity check after install so users can tell whether they copied the right files

### 2. Vault onboarding should feel less manual

- add a `vault doctor` command that reports missing fields, odd values, and notes that look like they should not be in scope
- add a bootstrap modal in Obsidian for folder selection and baseline metadata
- ship a few Templater and QuickAdd snippets that are ready to paste, not just described

### 3. Tier 1 plugins should talk to each other better

- weak topics from `pruefungs-simulator` should feed `lernplan-generator`
- due and overdue review pressure should show up in `lernfortschritt-dashboard`
- generated quiz quality should influence review priority, not sit in isolation

## Mid term

### 4. Experimental plugins need fewer caveats

- `quiz-generator-markdown`: add more than one comfortable workflow, not just "generate and inspect"
- `spaced-repetition-engine`: improve queue controls and note-level history
- `ausbildungs-analytics-dashboard`: tighten empty-state handling, make exports more useful, and cut UI noise

### 5. Documentation should feel like it was written after using the repo

- add "first 10 minutes" setup docs for new users
- add one realistic example flow for existing vaults
- add screenshots only after the UI actually deserves screenshots

### 6. Community maintenance should stop being ad hoc

- use issue templates that ask for the right failure context
- keep plugin status honest: stable, usable WIP, or experimental
- package per-plugin releases so testing is not blocked on local repo knowledge

## Later, if it still feels worth it

- a real plugin health page in the repo
- import helpers for larger note collections
- more structured quiz formats
- better release notes per plugin instead of one blob for the whole repo

## What is intentionally not first

- another half-finished plugin
- automatic scraping or bundling of study content
- pretending the repo is a complete vault in a box

This project is most useful when it stays honest about its shape: tools around a user's notes, not a replacement for them.
