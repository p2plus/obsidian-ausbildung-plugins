# Lernplan Generator

> Status: WIP. Planning logic is implemented, but the plugin is still being refined.

`lernplan-generator` builds a markdown study plan from the exam date, available time, blocked days, and the current state of the vault.

The plan is file-based and meant to stay readable without the plugin.

## What it takes into account

- exam date
- weekly learning time
- holidays and vacation days
- due reviews
- weak or highly relevant modules

## Integration

- generated plans can live in a normal folder
- daily outputs can go straight into `Periodic Notes`
- the notes stay readable even without this plugin enabled

## Manual QA

- set an exam date and weekly hours
- add a few blocked days in the settings
- run `Lernplan: Plan generieren`
- verify that blocked days are skipped and critical modules appear early
- run the daily output command and check the generated note path
