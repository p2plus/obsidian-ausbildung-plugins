# Pruefungs Simulator

This plugin is meant to make practice feel closer to an actual exam session, not just another note with checkboxes. If you already keep quiz files in markdown, the simulator turns them into something you can run, submit, and review.

Right now the focus is on multiple-choice because that is where reliable automatic scoring is straightforward. The plugin stores attempts, writes result logs, and gives you a weak-topic signal that other parts of the stack can pick up later.

## Good use cases

- AP1 or AP2-style self-tests from markdown files
- repeatable practice with stored results
- spotting weak modules without leaving Obsidian

## Manual QA

- open a quiz note with simulator-compatible syntax
- run `Pruefung: Aktuelle Quiz-Notiz simulieren`
- complete the attempt and submit it
- inspect the generated result note
- restart Obsidian and verify the attempt history is still present
