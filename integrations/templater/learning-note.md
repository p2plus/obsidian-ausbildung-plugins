---
lernstatus: "neu"
lerntyp: "theorie"
modul_id: "<% await tp.system.prompt('Modul-ID', 'LF01') %>"
pruefungsrelevanz: "<% await tp.system.suggester(['niedrig', 'mittel', 'hoch', 'ihk-kritisch'], ['niedrig', 'mittel', 'hoch', 'ihk-kritisch']) %>"
ausbildungsjahr: "<% await tp.system.suggester(['1', '2', '3'], ['1', '2', '3']) %>"
score_last:
score_best:
last_review:
next_review:
time_estimate_min: <% await tp.system.prompt('Zeit in Minuten', '30') %>
created: "<% tp.date.now('YYYY-MM-DD') %>"
---

# <% tp.file.title %>

## Kurzfassung

-

## Kernbegriffe

-

## Beispiele

-

## Pruefungsbezug

-

## Offene Fragen

-
