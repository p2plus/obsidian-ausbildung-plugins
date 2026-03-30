# Lernplan Generator

Planning is easy when the exam is far away and the vault still feels manageable. It gets harder once weak topics pile up, weekends disappear, and "I should study more" stops being useful advice. This plugin is there for that phase.

`lernplan-generator` works backwards from the exam date and gives you an actual markdown plan based on available time, blocked days, and what the vault itself says is important or overdue. It is not trying to be a life coach. It is trying to be honest and useful.

## What it takes into account

- exam date
- weekly learning time
- holidays and vacation days
- due reviews
- weak or highly relevant modules

## Obsidian fit

- generated plans can live in a normal folder
- daily outputs can go straight into `Periodic Notes`
- the notes stay readable even without this plugin enabled

## Manual QA

- set an exam date and weekly hours
- add a few blocked days in the settings
- run `Lernplan: Plan generieren`
- verify that blocked days are skipped and critical modules appear early
- run the daily output command and check the generated note path
