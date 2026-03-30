# IHK Keyword Tracker

This plugin scans configured IHK-relevant keywords across notes and writes a compact coverage report.

The current version stays intentionally simple and works with explicit keyword lists.

## Current capabilities

- explicit keyword coverage
- alias groups and synonym expansion
- configurable warning threshold for low coverage
- AI-assisted topic gap suggestions when BYOK is enabled

## BYOK

Supported providers:

- OpenAI
- OpenRouter
- custom OpenAI-compatible endpoints

The audited hit counts stay deterministic. AI suggestions are added as a separate section.

## Manual QA

- configure keywords and alias groups
- generate a report with AI disabled
- enable AI and rerun after a successful connection test
- verify that topic-gap suggestions do not change the raw hit counts
