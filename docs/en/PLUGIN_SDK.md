# Plugin SDK

> Language: English · [Deutsch (primary)](../PLUGIN_SDK.md)

TypeScript contracts for source connectors live in `@openeventhub/plugin-sdk`.
The package exports **types only** (no runtime helpers). Runtime plugins are plain
ESM modules under `plugins/<name>/`.

Plugins must be independently versionable and must **not** access the primary
database. Authentication / login flows for protected sources are **out of scope**
for the current SDK surface (future extension).

## Manifest (`plugin.json`)

| Field | Required | Meaning |
|-------|----------|---------|
| `pluginType` | yes | Stable id matched to `Source.pluginType` |
| `name` | yes | Human-readable name |
| `version` | yes | Plugin SemVer string |
| `main` | yes | Relative ESM entry (e.g. `./index.js`) |

## Module contract

The crawler dynamic-imports `main` and calls:

```js
const factory = mod.createPlugin ?? mod.default;
const plugin = await factory();
```

`createPlugin()` must return an object implementing `CrawlPlugin`.

## `CrawlPlugin` lifecycle

Order used by the crawler pipeline:

1. `initialize(context)` — once per crawl setup
2. `discover(context)` → `{ urls }`
3. `fetch(context)` → `{ content: Buffer, mimeType }`
4. `parse(fetchResult)` → `{ payload }` (plugin-specific IR)
5. `normalize(parseResult)` → `{ events: ExtractedEventFields[] }`
6. `emit(normalized)` → final `ExtractedEventFields[]` (usually pass-through)
7. `healthCheck()` → `{ status: 'ok' \| 'degraded' \| 'error', details? }`

`metadata` must expose `{ pluginType, name, version }` consistent with the manifest.

## `ExtractedEventFields`

Defined in `@openeventhub/shared`:

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

## Loading

`PluginRegistryService` scans `PLUGINS_DIR` (or repo `plugins/` candidates) for
directories that contain `plugin.json`, loads each factory, and registers by
`metadata.pluginType`. Directories without a manifest (e.g. `plugins/utils/`) are skipped.

In Compose, the crawler image copies `plugins/` and sets `PLUGINS_DIR=/app/plugins`.

## First-party plugins

| `pluginType` | Path |
|--------------|------|
| `html` | `plugins/html/` |
| `rss` | `plugins/rss/` |
| `ics` | `plugins/ics/` |

Verify locally: `npm run verify:plugins`.
