# Community Release Checklist

Use this before calling any plugin "ready" in public.

## Repo level

- `npm run check` passes locally
- release packaging runs cleanly with `python3 scripts/package_releases.py`
- onboarding docs still match the repo state
- plugin list in [README.md](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/README.md) is current
- no private vault content slipped into commits

## Per plugin

- `manifest.json` description matches the actual feature set
- `main.js`, `manifest.json`, and `styles.css` are present after build
- the plugin can be installed into a clean vault with [scripts/install_plugin.py](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/scripts/install_plugin.py)
- settings save and reload without surprises
- the core command path works on a small test sample
- the plugin fails politely when data is missing or malformed

## Manual vault QA

- try the plugin against the synthetic test vault
- try it once against a messy real vault folder, not just the happy path
- confirm output files land where the README says they will
- confirm empty states look intentional instead of broken
- confirm disabling AI still leaves the plugin usable
- confirm a bad API key produces a clear error, not silent nonsense

## Before uploading release files

- package the plugin
- unzip it once and confirm the expected files are inside
- install from the packaged files, not from the repo folder
- skim the plugin README one last time for stale claims

## Do not release yet if

- the plugin only works on the sample vault
- the output still depends on undocumented folder assumptions
- the UI hides errors behind "something went wrong"
- there is no clear answer to "what problem does this plugin actually solve"
