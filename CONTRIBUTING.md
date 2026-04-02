# Contributing

Thanks for helping. This repo is easiest to work on when changes stay specific and testable.

## Ground Rules

- Keep plugins independently installable.
- Do not add private vault content to the repository.
- Add or update tests for shared-core behavior changes.
- Document manual QA steps in the affected plugin README.
- If a change only works on the synthetic vault, it is not ready yet.

## Pull Requests

- Describe the user-facing change, not just the internal refactor.
- Say which plugin is affected and whether it is on the stable path or still experimental.
- Include manual QA notes for the actual command or workflow you touched.
- Include screenshots for major UI changes, but only after the UI is in decent shape.

## Useful local commands

```bash
npm run check
python3 scripts/install_plugin.py --help
python3 scripts/bootstrap_vault.py --help
python3 scripts/package_releases.py
```
