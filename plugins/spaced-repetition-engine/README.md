# Spaced Repetition Engine

This plugin scans due reviews, calculates the next interval from a simple rating, and writes review queues into a `Periodic Notes`-friendly folder structure.

It is still marked experimental.

## Current capabilities

- daily review queue generation
- four explicit review ratings: `vergessen`, `schwer`, `mittel`, `leicht`
- automatic updates for `next_review` and `last_review`
- AI-assisted queue prioritization and recap prompts when BYOK is enabled

## BYOK

The plugin supports:

- OpenAI
- OpenRouter
- custom OpenAI-compatible endpoints

If AI is disabled or unavailable, queue generation still works with local prioritization.

## Manual QA

- configure a provider and run the built-in connection test
- generate a review queue into the configured periodic folder
- rate the active note with each review command
- verify front matter updates and queue output
