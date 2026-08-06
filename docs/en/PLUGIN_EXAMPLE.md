# Example Plugin — HTML Listings

> Language: English · [Deutsch (primary)](../PLUGIN_EXAMPLE.md)

This walkthrough matches the code in `plugins/html/` (verified against the
crawler loader and Plugin SDK contracts).

## Goal

Extract event candidates from **any HTML markup** (table, list, div cards, Divi
blocks, JSON-LD, `<time>`) without touching the database. The crawler stores raw
fetch bytes and, on hits, enqueues **one AI job per event candidate**.

## Files

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

## Detection strategies (`normalize`)

All hits are merged and deduped (title + start + end):

| Strategy | Examples |
|----------|----------|
| JSON-LD | `<script type="application/ld+json">` with `@type: Event` |
| Marked tables | `tr.oeh-event` / `data-oeh-event` + cell classes `title`, `start-at`, … |
| Generic tables | Any `tr`/`td` with date + title in cells |
| Event blocks | `article` / `li` / `div.event*` / `itemtype=…Event` |
| `<time datetime>` | With a nearby heading title |
| Plain-text listings | Markup flattened to lines; DE/EN/ISO date lines under month/year context |
| Embedded EMS (Toubiz) | `<toubiz-widget api-token …>` → API `mein.toubiz.de`, **all future** dates (paginated, including `dateIntervals`) |

Date examples: `01.08.2026`, `01.08. + 02.08.`, `07.08. – 09.08.`, `15 + 16.08.2026`,
`2026-08-01`, `1 August 2026`, headings like `August 2026` / `Termine 2026`.

## Sample markup

```html
<!-- Table -->
<tr data-oeh-event>
  <td class="title">Open Air</td>
  <td class="start-at">2026-08-15T17:00:00.000Z</td>
</tr>

<!-- List -->
<ul><li>04.04.2026 Osterfeuer Allendorf</li></ul>

<!-- Div / Divi -->
<h3>August 2026</h3>
<p>01.08. + 02.08.<br />Hüttenkirmes Olberode</p>

<!-- Card -->
<div class="event-card">
  <h3>Sommerlauf</h3>
  <time datetime="2026-08-23">23.08.2026</time>
</div>
```

## Wire it into the platform

1. Crawler image includes `plugins/` (`PLUGINS_DIR=/app/plugins`)
2. Admin → Sources → `pluginType: html` (auto-detects Toubiz widgets) or `pluginType: toubiz`, set URL
3. Crawl now → Admin → Crawler / Events (moderation)

## Verify

```bash
npm run verify:plugins
node --test plugins/html/index.test.js
node --test plugins/toubiz/index.test.js
```
