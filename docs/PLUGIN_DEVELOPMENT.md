# Plugin Development

> Sprache: Deutsch (primär) · [English](en/PLUGIN_DEVELOPMENT.md)

Neue Quelltypen sind **nur Plugins**. Für einen neuen Connector dürfen niemals
Änderungen an Crawler-/Core-Services nötig sein.

## Lebenszyklus

```
Register (plugin.json + createPlugin)
  → initialize
  → discover
  → fetch
  → parse
  → normalize → ExtractedEventFields[]
  → emit
  → healthCheck
```

Typen und Feldverträge: `docs/PLUGIN_SDK.md`.

## Regeln

1. Kein direkter Zugriff auf PostgreSQL oder interne Repositories
2. Plugins als ESM belassen (`plugins/package.json` hat `"type": "module"`)
3. Gemeinsame Fetch-/Datums-Helper können unter `plugins/utils/` liegen
4. Parse/Normalize möglichst deterministisch halten, damit Fixtures offline testbar sind
5. `Source.pluginType` in Admin/API muss `metadata.pluginType` entsprechen

## Plugin hinzufügen

1. `plugins/<name>/plugin.json` und `plugins/<name>/index.js` anlegen
2. `createPlugin` exportieren (optional auch `default = createPlugin`)
3. Alle `CrawlPlugin`-Methoden implementieren (Stubs für ungenutzte Schritte sind ok)
4. `npm run verify:plugins` ausführen
5. Crawler-Image neu bauen, damit Compose die neuen Dateien übernimmt:
   ```bash
   npm run apps:up
   ```
6. In Admin → Sources eine Quelle mit `pluginType=<name>`, URL und optionalem Cron anlegen
7. **Crawl now** nutzen oder auf den Scheduler warten

## Tipps zum Testen

- Fixtures unter `services/crawler/src/fixtures/` als Vorbild nutzen
- `fetch-url` unterstützt `file://` für lokales HTML/RSS/ICS in der Entwicklung
- Confidence-Scores ehrlich halten (`extractionConfidence`, wenn Title+Start vorhanden)

## Ausgearbeitetes Beispiel

`docs/PLUGIN_EXAMPLE.md` führt durch das HTML-Tabellen-Plugin in `plugins/html/`.
