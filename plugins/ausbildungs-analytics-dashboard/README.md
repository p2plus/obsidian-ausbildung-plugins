# Ausbildungs Analytics Dashboard

This plugin aggregates learning time, exercise volume, and mastered content into a markdown report.

It is still experimental because the report quality depends heavily on consistent metadata.

## Current capabilities

- deterministic metrics from note metadata
- weak-module summary
- due-review counts
- AI-generated summary, risks, and next actions when BYOK is enabled

## BYOK

Supported providers:

- OpenAI
- OpenRouter
- custom OpenAI-compatible endpoints

AI adds interpretation only. Numeric metrics remain local and deterministic.

## Manual QA

- run report generation without AI and inspect the markdown
- enable AI, test the provider connection, and rerun
- verify that narrative sections appear without replacing the hard metrics
