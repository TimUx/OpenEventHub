# Example Plugin — HTML Table

> Sprache: Deutsch (primär) · [English](en/PLUGIN_EXAMPLE.md)

Dieser Walkthrough entspricht dem Code in `plugins/html/` (geprüft gegen
Crawler-Loader und Plugin-SDK-Verträge).

## Ziel

Eine HTML-Seite mit Event-Zeilen in `ExtractedEventFields[]` parsen, ohne die
Datenbank anzufassen. Der Crawler speichert die Raw-Fetch-Bytes und reicht
normalisierte Events weiter (AI-/OCR-Queues je nach Konfiguration).

## Dateien

```
plugins/html/
  plugin.json   # pluginType: html
  index.js      # createPlugin()
```

### Manifest

```json
{
  "pluginType": "html",
  "name": "HTML Table Plugin",
  "version": "1.0.0",
  "main": "./index.js"
}
```

### Factory

`index.js` exportiert `createPlugin` (und `default`). Die Registry macht:

```js
const factory = mod.createPlugin ?? mod.default;
const plugin = await factory();
```

## Lebenszyklus in diesem Plugin

| Step | Behavior |
|------|----------|
| `initialize` | No-op (zustandslos) |
| `discover` | Gibt `[context.sourceUrl]` zurück |
| `fetch` | `fetchUrlToBuffer(sourceUrl)` aus `plugins/utils/fetch-url.js` |
| `parse` | Findet `<tr>` mit `data-oeh-event`, `data-event` oder Klasse `oeh-event`; Fallback: alle `<tr>` |
| `normalize` | Liest Zellen mit Klassen `title`, `summary`, `description`, `start-at`/`start`, `end-at`/`end`; baut Events mit Confidence ~0.9, wenn Title+Start vorhanden |
| `emit` | Gibt `normalized.events` zurück |
| `healthCheck` | `{ status: 'ok' }` |

## Erwartetes Beispiel-Markup

```html
<tr data-oeh-event>
  <td class="title">Open Air</td>
  <td class="summary">Music in the park</td>
  <td class="description">…</td>
  <td class="start-at">2026-08-15T17:00:00.000Z</td>
  <td class="end-at">2026-08-15T22:00:00.000Z</td>
</tr>
```

## In die Plattform einbinden

1. Sicherstellen, dass das Crawler-Image `plugins/` enthält (`PLUGINS_DIR=/app/plugins`)
2. Admin → Sources → anlegen:
   - **pluginType:** `html`
   - **url:** Seiten-URL (oder `file://…` in lokalen Experimenten)
   - **scheduleCron:** z. B. `0 */6 * * *` (UTC) oder leer nur für manuell
3. **Crawl now** enqueued BullMQ `crawl` mit `{ sourceId }`
4. Unter Admin → Crawler prüfen, dass ein Crawl-Job erscheint

## Prüfen

```bash
npm run verify:plugins
```

Erwartung: `html`, `rss` und `ics` laden jeweils und melden `metadata.pluginType`.

## Geschwister-Beispiele

| Plugin | `pluginType` | Parse target |
|--------|--------------|--------------|
| RSS | `rss` | `<item>` / `pubDate` |
| ICS | `ics` | `VEVENT` / `DTSTART` |

`plugins/html/` als Skelett kopieren, wenn ein neuer Typ hinzukommt; `pluginType`,
Parse-/Normalize-Logik und Admin-Source-Zeilen ändern — nicht den Crawler-Core.
