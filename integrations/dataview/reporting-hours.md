# Reporting Hours

```dataview
TABLE sum(default(time_estimate_min, 0)) / 60 as "Stunden"
FROM "Lernen"
WHERE date(file.mtime).month = date(today).month
GROUP BY ausbildungsjahr
SORT ausbildungsjahr ASC
```

If your report logic uses another field, replace `time_estimate_min` with the field you actually maintain.
