# Plugins

Source connectors live here. Each plugin is independently versioned and must
implement the Plugin SDK lifecycle (see `docs/PLUGIN_SDK.md`).

Plugins must not access the primary database directly.

## First-party plugins

| Directory | `pluginType` |
| --------- | ------------ |
| `html/`   | `html`       |
| `rss/`    | `rss`        |
| `ics/`    | `ics`        |

Shared helpers: `utils/fetch-url.js`, `utils/parse-date.js`.
`package.json` sets `"type": "module"`.

## Contributor flow

1. `docs/PLUGIN_DEVELOPMENT.md`
2. Worked example: `docs/PLUGIN_EXAMPLE.md`
3. `npm run verify:plugins`
4. Rebuild crawler via `npm run apps:up` and register a Source in Admin
