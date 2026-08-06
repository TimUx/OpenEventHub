# Plugin Development

> Language: English · [Deutsch (primary)](../PLUGIN_DEVELOPMENT.md)

New source types are **plugins only**. Never require crawler/core service changes
for a new connector.

## Lifecycle

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

See `docs/PLUGIN_SDK.md` for types and field contracts.

## Rules

1. No direct access to PostgreSQL or internal repositories
2. Keep plugins ESM (`plugins/package.json` has `"type": "module"`)
3. Shared fetch/date helpers may live under `plugins/utils/`
4. Prefer deterministic parse/normalize so fixtures can be tested offline
5. `Source.pluginType` in Admin/API must equal `metadata.pluginType`

## Add a plugin

1. Create `plugins/<name>/plugin.json` and `plugins/<name>/index.js`
2. Export `createPlugin` (and optionally `default = createPlugin`)
3. Implement all `CrawlPlugin` methods (stubs are fine for unused steps)
4. Run `npm run verify:plugins`
5. Rebuild the crawler image so Compose picks up the new files:
   ```bash
   npm run apps:up
   ```
6. In Admin → Sources, create a source with `pluginType=<name>`, URL, and an update-interval preset (or custom cron)
7. Use **Crawl now** or wait for the scheduler

## Testing tips

- Use fixtures under `services/crawler/src/fixtures/` as models
- `fetch-url` supports `file://` for local HTML/RSS/ICS during development
- Keep confidence scores honest (`extractionConfidence` when title+start exist)

## Worked example

`docs/PLUGIN_EXAMPLE.md` walks through the HTML table plugin in `plugins/html/`.
