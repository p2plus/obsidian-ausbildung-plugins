# IHK Keyword Tracker

This plugin scans configured IHK-relevant keywords across notes and writes a compact coverage report.

The current version stays intentionally simple and works with explicit keyword lists.

## Current capabilities

- explicit keyword coverage
- alias groups and synonym expansion
- configurable warning threshold for low coverage
- AI-assisted topic gap suggestions when BYOK is enabled
- report preview modal before writing to disk
- settings-level provider test with visible status feedback

## BYOK

Supported providers:

- OpenAI
- OpenRouter
- custom OpenAI-compatible endpoints

The audited hit counts stay deterministic. AI suggestions are added as a separate section.

## Typical flow

1. Configure canonical keywords and alias groups.
2. Run the provider connection test if AI suggestions are enabled.
3. Open the report preview.
4. Save the coverage report.
5. Review deterministic hit counts separately from AI topic suggestions.

## Manual QA

- configure keywords and alias groups
- generate a report with AI disabled
- enable AI and rerun after a successful connection test
- confirm the connection status text updates in settings
- open the preview modal before saving
- verify that topic-gap suggestions do not change the raw hit counts
