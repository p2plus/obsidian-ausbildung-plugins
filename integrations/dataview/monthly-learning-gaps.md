# Monthly Learning Gaps

```dataview
TABLE modul_id as "Lernfeld / Modul", length(rows) as "Notizen diesen Monat"
FROM "Lernen"
WHERE date(file.mtime).month = date(today).month
GROUP BY modul_id
SORT modul_id ASC
```

Use this as a rough first check. If your vault uses a different root folder or relies on `ausbildungsjahr` plus tags instead of `modul_id`, adjust the query accordingly.
