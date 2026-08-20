# Example Plugin — HTML Listings

> Sprache: Deutsch (primär) · [English](en/PLUGIN_EXAMPLE.md)

Dieser Walkthrough entspricht dem Code in `plugins/html/` (geprüft gegen
Crawler-Loader und Plugin-SDK-Verträge).

## Ziel

Event-Kandidaten aus **beliebigem HTML-Markup** extrahieren (Tabelle, Liste, Div-Karten,
Divi-Blöcke, JSON-LD, `<time>`), ohne die Datenbank anzufassen. Der Crawler speichert
die Raw-Fetch-Bytes und enqueued bei Treffern **einen AI-Job pro Event-Kandidat**.

## Dateien

```
plugins/html/
  plugin.json   # pluginType: html
  index.js      # createPlugin()
  index.test.js
```

### Manifest

```json
{
  "pluginType": "html",
  "name": "HTML Listing Plugin",
  "version": "1.3.0",
  "main": "./index.js"
}
```

## Erkennungsstrategien (`normalize`)

Alle Treffer werden gemerged und dedupliziert (Titel + Start + Ende):

| Strategie | Beispiele |
|-----------|-----------|
| JSON-LD | `<script type="application/ld+json">` mit `@type: Event` |
| Markierte Tabellen | `tr.oeh-event` / `data-oeh-event` + Zellenklassen `title`, `start-at`, … |
| Generische Tabellen | Beliebige `tr`/`td` mit Datum + Titel in den Zellen |
| Event-Blöcke | `article` / `li` / `div.event*` / `itemtype=…Event` |
| `<time datetime>` | Mit nahem Überschriftentitel |
| Klartext-Listen | Markup wird zu Zeilen flatten; DE/EN/ISO-Datumszeilen unter Monats-/Jahreskontext |
| Embedded EMS (Toubiz) | `<toubiz-widget api-token …>` → API `mein.toubiz.de`, **alle zukünftigen** Termine (`eventDates` + Event-Detail für Beschreibung/Kategorie/Adresse) |

Datumsbeispiele: `01.08.2026`, `01.08. + 02.08.`, `07.08. – 09.08.`, `15 + 16.08.2026`,
`2026-08-01`, `1. August 2026`, Monatsüberschriften wie `August 2026` / `Termine 2026`.

## Erwartetes Beispiel-Markup

```html
<!-- Tabelle -->
<tr data-oeh-event>
  <td class="title">Open Air</td>
  <td class="start-at">2026-08-15T17:00:00.000Z</td>
</tr>

<!-- Liste -->
<ul><li>04.04.2026 Osterfeuer Allendorf</li></ul>

<!-- Div / Divi -->
<h3>August 2026</h3>
<p>01.08. + 02.08.<br />Hüttenkirmes Olberode</p>

<!-- Karte -->
<div class="event-card">
  <h3>Sommerlauf</h3>
  <time datetime="2026-08-23">23.08.2026</time>
</div>
```

## In die Plattform einbinden

1. Crawler-Image enthält `plugins/` (`PLUGINS_DIR=/app/plugins`)
2. Admin → Sources → `pluginType: html` (auto-detects Toubiz widgets) or `pluginType: toubiz`, URL setzen
3. Crawl now → Admin → Crawler / Events (Moderation)

## Prüfen

```bash
npm run verify:plugins
node --test plugins/html/index.test.js
node --test plugins/toubiz/index.test.js
```
