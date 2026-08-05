# Example Plugin — HTML Table

This walkthrough matches the code in `plugins/html/` (verified against the
crawler loader and Plugin SDK contracts).

## Goal

Parse an HTML page with event rows into `ExtractedEventFields[]` without touching
the database. The crawler stores raw fetch bytes, then hands normalized events
downstream (AI / OCR queues as configured).

## Files

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

`index.js` exports `createPlugin` (and `default`). The registry does:

```js
const factory = mod.createPlugin ?? mod.default;
const plugin = await factory();
```

## Lifecycle in this plugin

| Step | Behavior |
|------|----------|
| `initialize` | No-op (stateless) |
| `discover` | Returns `[context.sourceUrl]` |
| `fetch` | `fetchUrlToBuffer(sourceUrl)` from `plugins/utils/fetch-url.js` |
| `parse` | Finds `<tr>` with `data-oeh-event`, `data-event`, or class `oeh-event`; falls back to all `<tr>` |
| `normalize` | Reads cells with classes `title`, `summary`, `description`, `start-at`/`start`, `end-at`/`end`; builds events with confidence ~0.9 when title+start exist |
| `emit` | Returns `normalized.events` |
| `healthCheck` | `{ status: 'ok' }` |

## Sample markup the plugin expects

```html
<tr data-oeh-event>
  <td class="title">Open Air</td>
  <td class="summary">Music in the park</td>
  <td class="description">…</td>
  <td class="start-at">2026-08-15T17:00:00.000Z</td>
  <td class="end-at">2026-08-15T22:00:00.000Z</td>
</tr>
```

## Wire it into the platform

1. Ensure the crawler image includes `plugins/` (`PLUGINS_DIR=/app/plugins`)
2. Admin → Sources → create:
   - **pluginType:** `html`
   - **url:** page URL (or `file://…` in local experiments)
   - **scheduleCron:** e.g. `0 */6 * * *` (UTC) or empty for manual only
3. **Crawl now** enqueues BullMQ `crawl` with `{ sourceId }`
4. Confirm a crawl job appears under Admin → Crawler

## Verify

```bash
npm run verify:plugins
```

Expected: `html`, `rss`, and `ics` each load and report `metadata.pluginType`.

## Sibling examples

| Plugin | `pluginType` | Parse target |
|--------|--------------|--------------|
| RSS | `rss` | `<item>` / `pubDate` |
| ICS | `ics` | `VEVENT` / `DTSTART` |

Copy `plugins/html/` as a skeleton when adding a new type; change `pluginType`,
parse/normalize logic, and Admin source rows — not the crawler core.
