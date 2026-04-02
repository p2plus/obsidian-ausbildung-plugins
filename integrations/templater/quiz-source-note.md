---
lernstatus: "neu"
lerntyp: "quiz"
modul_id: "<% await tp.system.prompt('Modul-ID', 'LF01') %>"
pruefungsrelevanz: "<% await tp.system.suggester(['mittel', 'hoch', 'ihk-kritisch'], ['mittel', 'hoch', 'ihk-kritisch']) %>"
ausbildungsjahr: "<% await tp.system.suggester(['1', '2', '3'], ['1', '2', '3']) %>"
time_estimate_min: <% await tp.system.prompt('Zeit in Minuten', '20') %>
created: "<% tp.date.now('YYYY-MM-DD') %>"
---

# <% tp.file.title %>

> Verwende diese Vorlage fuer kompakte Faktennotizen, aus denen spaeter gute Quizfragen gebaut werden koennen.

## Kernfakten

-

## Definitionen

-

## Typische Verwechslungen

-

## Was in einer Pruefung leicht gefragt werden kann

-

## Ein kleines Beispiel

-
