# Spaced Repetition Engine

This plugin scans due reviews, calculates the next interval from a simple rating, and writes review queues into a `Periodic Notes`-friendly folder structure.

It is still marked experimental.

## Current capabilities

- daily review queue generation
- four explicit review ratings: `vergessen`, `schwer`, `mittel`, `leicht`
- automatic updates for `next_review` and `last_review`
- AI-assisted queue prioritization and recap prompts when BYOK is enabled
- queue preview modal before writing to disk
- settings-level provider test with visible status feedback

## BYOK

The plugin supports:

- OpenAI
- OpenRouter
- custom OpenAI-compatible endpoints

If AI is disabled or unavailable, queue generation still works with local prioritization.

## Typical flow

1. Configure folders and optional AI provider in settings.
2. Run the connection test if AI is enabled.
3. Open the queue preview.
4. Save the queue into the configured periodic folder.
5. Work through notes and rate them with the review commands.

## Manual QA

- configure a provider and run the built-in connection test
- confirm the connection status text updates in settings
- generate a review queue into the configured periodic folder
- open the preview modal before saving
- rate the active note with each review command
- verify front matter updates and queue output
