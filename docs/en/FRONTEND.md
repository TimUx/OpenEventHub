# Frontend

> Language: English · [Deutsch (primary)](../FRONTEND.md)

Stack:
- Next.js
- React
- TailwindCSS
- shadcn/ui
- TanStack Query

## Visual language

Flat UI (FestSchmiede-inspired):
- solid primary/accent (default blue `#1565c0`), secondary/teal (`#00838f`), success green (`#2e7d32`)
- selectable accent colors via a palette icon in the header; menu shows swatch + name (only WCAG AA-safe pairs for light/dark)
- light/dark mode and accent persist in the browser (`oeh-theme`, `oeh-accent`)
- language and appearance as compact icon buttons (like dark/light), no chip dropdowns
- no background gradients; light grey + white surfaces
- Roboto / sans, bold headings
- rounded buttons (`12px`, uniform height `44px` / `h-11` matching inputs), flat icons, soft card shadows
- solid primary app bar (contrast text on accent) with a flat brand mark before the app name; favicon under `/brand/`
- **Responsive:** bottom navigation on phones/tablets (`< lg`), desktop nav from large breakpoints; touch targets ≥ 44px; safe-area insets (notch); 16px inputs to avoid iOS zoom
- **PWA:** web app manifest, install icons (192/512 + maskable), Apple touch icon, service worker (`/sw.js`) for shell caching; “Add to Home Screen” over HTTPS

Views:
- Home
- Event list (display modes: list, details, tiles)
- Calendar (day, week, month, year)
- Map
- Event detail
- Search results
- Public submission (event / source → moderation queue)

Event actions (list, tiles, details, and detail page):
- **Show on map** / **Add to calendar** — icon buttons with hover tooltips (`title`/`aria-label`)
- Public lists do not show a status like “PUBLISHED” (visible = published)
- **Bulk export / subscription:** under “Add to calendar” as a collapsible advanced panel (collapsed by default); filtered matches as `.ics` or online feed (`/calendar.ics` / `/api/v1/calendar.ics`, `webcal://`)

## UI languages

- Supported locales: **`de`** (default), **`en`**
- Resolution: cookie `oeh_locale` → browser `Accept-Language` → default **German**
- Manual override via language icon in the header (sets cookie; click toggles DE ↔ EN)
- Messages: `services/frontend/src/i18n/messages/{de,en}.ts`

## Mobile & PWA

- Viewport: `device-width`, `viewport-fit=cover`, theme color
- Navigation: fixed bottom bar with icons below `lg`; desktop uses the header nav
- Calendar month grid: compact cells with event counts on narrow screens; event chips from `sm`
- Map: heights use `dvh` so the bottom bar does not cover the map
- Manifest: `/manifest.webmanifest` (Next.js `app/manifest.ts`)
- Service worker: registered only in production builds (`PwaRegister`); API/health routes are not cached
- Ops: public HTTPS URL (`NEXT_PUBLIC_SITE_URL`); install prompt appears after manifest + SW

## Display modes

### Events
- **List** — compact rows
- **Details** — expanded rows with summary/description
- **Tiles** — card grid
- Filters and sorting as a collapsible panel (collapsed by default): category, region, date range (from/to), sort by (start date/title), ascending/descending — active filters show a badge on the toggle

### Calendar
- **Day** / **Week** / **Month** / **Year**
- Navigation including “Today”; clicking a day opens day view

Selected modes persist in the browser (`oeh_view_*`).

## Map

- Embedded OpenStreetMap (Leaflet)
- Markers for all published events with venue coordinates
- Search + filters (category, region, date); markers and list follow the filter
- Auto-zoom (`fitBounds`) to current matches, with padding and max zoom
- Deep link: `/map?event=<id>` selects the marker (from list/detail actions)

## Submit

Public forms at `/submit`:
- **Event** — title, time range, venue, description (optional email)
- **Source** — name, URL, plugin type (`rss` / `html` / `ics`), optional cron

Submissions go through `POST /api/v1/submissions` / `POST /api/v1/source-submissions` into the moderation queue (Admin → Moderation). They are not published immediately.

## Screenshots

![Frontend home](../assets/screenshots/frontend-home.png)

*Home*

![Event list](../assets/screenshots/frontend-events.png)

*Event list*

![Event detail](../assets/screenshots/frontend-event-detail.png)

*Event detail*

![Calendar](../assets/screenshots/frontend-calendar.png)

*Calendar*

![Map](../assets/screenshots/frontend-map.png)

*Map*

![Submit](../assets/screenshots/frontend-submit.png)

*Public submission*

![Search](../assets/screenshots/frontend-search.png)

*Search*

![Home (mobile)](../assets/screenshots/frontend-home-mobile.png)

*Home (phone / bottom navigation)*
