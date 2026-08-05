# Plugin SDK

Every source connector implements:

- Metadata
- Authentication (optional)
- Discovery
- Fetch
- Parse
- Normalize
- Health Check

Plugins must be independently deployable.

## Package

TypeScript contracts live in `@openeventhub/plugin-sdk`.

Runtime plugins under `plugins/<name>/` ship:

| File | Purpose |
|------|---------|
| `plugin.json` | Manifest (`pluginType`, `name`, `version`, `main`) |
| `index.js` | ESM module exporting `createPlugin()` |

The crawler loads every directory that contains `plugin.json` and registers
`metadata.pluginType` for `Source.pluginType` lookup.
