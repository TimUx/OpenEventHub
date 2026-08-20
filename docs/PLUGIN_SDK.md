# Plugin SDK

> Sprache: Deutsch (primär) · [English](en/PLUGIN_SDK.md)

TypeScript-Verträge für Quellen-Connectoren liegen in `@openeventhub/plugin-sdk`.
Das Paket exportiert **nur Typen** (keine Runtime-Helper). Laufzeit-Plugins sind
einfache ESM-Module unter `plugins/<name>/`.

Plugins müssen unabhängig versionierbar sein und dürfen **nicht** auf die
primäre Datenbank zugreifen. Authentifizierung / Login-Flows für geschützte
Quellen liegen **außerhalb** der aktuellen SDK-Oberfläche (spätere Erweiterung).

## Manifest (`plugin.json`)

| Field | Required | Meaning |
|-------|----------|---------|
| `pluginType` | yes | Stabile ID, abgestimmt auf `Source.pluginType` |
| `name` | yes | Menschenlesbarer Name |
| `version` | yes | Plugin-SemVer-String |
| `main` | yes | Relativer ESM-Einstieg (z. B. `./index.js`) |

## Modulvertrag

Der Crawler importiert `main` dynamisch und ruft auf:

```js
const factory = mod.createPlugin ?? mod.default;
const plugin = await factory();
```

`createPlugin()` muss ein Objekt zurückgeben, das `CrawlPlugin` implementiert.

## `CrawlPlugin`-Lebenszyklus

Reihenfolge in der Crawler-Pipeline:

1. `initialize(context)` — einmalig beim Crawl-Setup
2. `discover(context)` → `{ urls }`
3. `fetch(context)` → `{ content: Buffer, mimeType }`
4. `parse(fetchResult)` → `{ payload }` (plugin-spezifisches IR)
5. `normalize(parseResult)` → `{ events: ExtractedEventFields[] }`
6. `emit(normalized)` → finales `ExtractedEventFields[]` (meist Pass-Through)
7. `healthCheck()` → `{ status: 'ok' \| 'degraded' \| 'error', details? }`

`metadata` muss `{ pluginType, name, version }` konsistent zum Manifest bereitstellen.

## `ExtractedEventFields`

Definiert in `@openeventhub/shared`:

| Field | Type |
|-------|------|
| `isEvent` | `boolean` |
| `title` | `string \| null` |
| `summary` | `string \| null` |
| `description` | `string \| null` |
| `startAt` | ISO string \| `null` |
| `endAt` | ISO string \| `null` |
| `organizerName` | `string \| null` |
| `venueName` | `string \| null` |
| `venueAddress` | `string \| null` |
| `isRecurring` | `boolean` |
| `extractionConfidence` | `number` (0..1) |
| `sourceCategories` | `string[]` optional (EMS-Labels, z. B. Toubiz `category.name`) |

## Laden

`PluginRegistryService` durchsucht `PLUGINS_DIR` (oder Repo-Kandidaten unter `plugins/`)
nach Verzeichnissen mit `plugin.json`, lädt jede Factory und registriert nach
`metadata.pluginType`. Verzeichnisse ohne Manifest (z. B. `plugins/utils/`) werden übersprungen.

In Compose kopiert das Crawler-Image `plugins/` und setzt `PLUGINS_DIR=/app/plugins`.

## First-Party-Plugins

| `pluginType` | Path |
|--------------|------|
| `html` | `plugins/html/` |
| `rss` | `plugins/rss/` |
| `ics` | `plugins/ics/` |
| `toubiz` | `plugins/toubiz/` (mein.toubiz.de / embedded `<toubiz-widget>`) |

Lokal prüfen: `npm run verify:plugins`.
