# Admin Center

> Language: English · [Deutsch (primary)](../ADMIN_CENTER.md)

## Dashboard
- System status
- Crawl overview
- AI status
- Queue status (counts)
- Recent imports
- Error summary (counts only) with a link to the **Error log**

## Error log
- Tabular list of current failures including reasons
- Sources: BullMQ (`failedReason`), failed crawl jobs, source `lastError`

## Management
- Sources (create / edit / enable / disable / delete; plugin types
  `html` / `rss` / `ics` / `toubiz`; update interval via dropdown; optional custom cron)
- Events (edit, change status, delete; updates create EventVersion)
- Categories (manual create / edit / delete; AI find-or-creates missing labels and links them)
- Regions (manual create / edit / delete; AI may find-or-create places/hierarchy)
- Moderation
- Users & Roles
- AI Settings (create / edit / delete provider profiles; default: Local Ollama; profile test opens a dialog with a waiting indicator)
- Scheduler (plain-language intervals + next run; configured under Sources)

## UI languages

- Supported locales: **`de`** (default), **`en`**
- Resolution: cookie `oeh_locale` → browser `Accept-Language` → default **German**
- Language switcher in admin chrome (same cookie as public portal)
- Messages: `services/admin/src/i18n/messages/{de,en}.ts`

## Visual language

Flat UI matching the public portal (primary-blue app bar, rounded buttons, no background gradients).

## Screenshots

![Admin login](../assets/screenshots/admin-login.png)

*Admin login*

![Admin dashboard](../assets/screenshots/admin-dashboard.png)

*Admin dashboard*

![Sources](../assets/screenshots/admin-sources.png)

*Sources management*

![Moderation](../assets/screenshots/admin-moderation.png)

*Moderation*

![AI Settings](../assets/screenshots/admin-ai-settings.png)

*AI Settings*

![Error log](../assets/screenshots/admin-logs.png)

*Error log*
