# Getting Started

`obsidian-ausbildung-plugins` is not a content library. It becomes useful when it runs against a real Obsidian vault with real markdown notes.

## What a user needs

- an Obsidian vault with markdown files
- the built plugin files from this repo
- a small amount of YAML front matter on notes that should participate in learning workflows

## Install the plugins

1. Install dependencies once:

```bash
npm install
```

2. Build everything:

```bash
npm run build
```

3. Install each plugin into the target vault.

Manual path:

- `plugins/<plugin-id>/main.js`
- `plugins/<plugin-id>/manifest.json`
- `plugins/<plugin-id>/styles.css` when present

The target location is:

```text
<your-vault>/.obsidian/plugins/<plugin-id>/
```

Or use the helper:

```bash
python3 scripts/install_plugin.py --plugin lernfortschritt-dashboard --vault "/path/to/your-vault"
```

4. Enable the plugins in Obsidian.

## First useful setup

For a normal user, the fastest path is:

1. Keep existing markdown notes in the vault.
2. In each plugin, leave `rootFolders` empty to scan the whole vault, or point it at one learning area.
3. Add YAML front matter only to the notes that matter first.
4. Use commands to generate outputs.

Useful commands:

- `Analytics: Bericht generieren`
- `Quiz: Aus aktueller Notiz erzeugen`
- `Reviews: Faellige Wiederholungen generieren`
- `Lernfortschritt: Snapshot generieren`
- `Lernplan: Plan generieren`

## Minimal front matter

This is enough to make a note useful to the suite:

```yaml
---
lernstatus: "gelesen"
lerntyp: "theorie"
modul_id: "LF01"
pruefungsrelevanz: "hoch"
ausbildungsjahr: "1"
---
```

Optional fields that make the outputs better:

```yaml
score_last: 85
score_best: 92
next_review: "2026-04-10"
last_review: "2026-04-02"
time_estimate_min: 35
```

## Three practical starting points

### 1. Existing vault

Do nothing destructive. Keep the files where they are. Point the plugins at the relevant folders and enrich only the notes you actually want to learn from.

### 2. New study area inside an existing vault

Create a folder such as `Lernen/` or `Ausbildung/`, use the templates from [templates](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/templates), and keep the plugin scan scope narrow at first.

### 3. Bulk onboarding for a large markdown set

Use the bootstrap script from [scripts/bootstrap_vault.py](/Users/p2plus/Library/CloudStorage/GoogleDrive-philipp.rudics@gmail.com/Meine%20Ablage/Vault/obsidian-ausbildung-plugins/scripts/bootstrap_vault.py) to copy notes into a dedicated import area and inject baseline YAML.

## BYOK providers

The current provider layer supports:

- OpenAI
- OpenRouter
- Anthropic
- Google
- Z.AI
- MiniMax
- Moonshot
- Custom OpenAI-compatible endpoints

AI is optional. The plugins should still produce local outputs when AI is disabled or unavailable.
