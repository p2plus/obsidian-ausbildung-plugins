# Ausbildungs Analytics Dashboard

This plugin aggregates learning time, exercise volume, and mastered content into a markdown report.

It is still experimental because the report quality depends heavily on consistent metadata.

## Current capabilities

- deterministic metrics from note metadata
- weak-module summary
- due-review counts
- AI-generated summary, risks, and next actions when BYOK is enabled
- report preview modal before writing to disk
- settings-level provider test with visible status feedback

## BYOK

Supported providers:

- OpenAI
- OpenRouter
- custom OpenAI-compatible endpoints

AI adds interpretation only. Numeric metrics remain local and deterministic.

## Typical flow

1. Configure folders and optional AI provider.
2. Run the provider connection test if AI-backed summaries are enabled.
3. Open the analytics preview.
4. Save the report into the configured output folder.

## Manual QA

- run report generation without AI and inspect the markdown
- enable AI, test the provider connection, and rerun
- confirm the connection status text updates in settings
- open the preview modal before saving
- verify that narrative sections appear without replacing the hard metrics
