# Pruefungs Simulator

> Status: WIP. Core workflow is in place, but the plugin is still evolving.

The simulator turns quiz notes into timed practice runs with stored results and basic performance analysis.

The current implementation focuses on multiple-choice questions because they can be scored reliably and reproduced in tests.

```mermaid
flowchart LR
    Quiz["Quiz Note"] --> Parse["Question Parsing"]
    Parse --> Session["Timed Session"]
    Session --> Score["Automatic Scoring"]
    Score --> Result["Result Note + Attempt Log"]
    Result --> FollowUp["Weak Topic Follow-up"]
```

## Use cases

- AP1 or AP2-style self-tests from markdown files
- repeatable practice with stored results
- spotting weak modules without leaving Obsidian

## Manual QA

- open a quiz note with simulator-compatible syntax
- run `Pruefung: Aktuelle Quiz-Notiz simulieren`
- complete the attempt and submit it
- inspect the generated result note
- restart Obsidian and verify the attempt history is still present
