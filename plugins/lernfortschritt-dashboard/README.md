# Lernfortschritt Dashboard

This plugin is for the moment where a vault starts to feel large and slightly vague. You have notes, exercises, maybe some quiz files, but no quick answer to the obvious question: "What have I actually worked through already?"

`lernfortschritt-dashboard` scans your learning notes, reads the front matter you already maintain, and turns that into a clear progress snapshot. It is deliberately conservative: plain markdown in, plain markdown out, and no fragile dependency on `Dataview`, even though it works well alongside it.

## What it does well

- counts progress by `lernstatus` and `ausbildungsjahr`
- highlights weak modules based on recorded scores
- shows due reviews without forcing a separate review system
- lets you update the current note's `lernstatus` quickly from inside Obsidian

## Where it fits in a stack

- strong match with `Dataview`
- clean front matter for `Metadata Menu`
- generated outputs can be turned into boards with `Kanban`

## Manual QA

- activate the plugin in a clean test vault
- run `Dashboard: Snapshot generieren`
- open the generated file and verify totals, years, and weak modules
- run `Dashboard: Aktuelle Notiz als geuebt markieren`
- restart Obsidian and confirm the YAML change persisted cleanly
