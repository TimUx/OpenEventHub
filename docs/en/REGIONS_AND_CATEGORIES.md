# Regions & categories

> Language: English · [Deutsch (primary)](../REGIONS_AND_CATEGORIES.md)

## Maintenance model

| Aspect | Behaviour |
|--------|-----------|
| Starters | Seed (`db:seed`) creates regions (e.g. Deutschland → Bayern → München) and a **curated flat rural category catalog** (Kirmes, Schützenfest, Dorffest, Konzert, …) |
| Crawls / AI | **Places/tags:** find-or-create. **Categories:** map onto existing catalog entries only (DE/EN aliases); no auto-creation of new categories |
| Places | No full gazetteer required — Kommunen/Orte appear from classification (`municipality` / `place` / `region` / `district`) and optionally venues |
| Ops | Admin Center under **Categories** and **Regions**; **region create** via place lookup (OpenStreetMap/Nominatim) also creates missing parents; ambiguous names require a choice; DEV category reset: `bash scripts/reset-categories.sh`; region repair: `bash scripts/repair-dev-regions.sh` |

Filters stay moderatable: newly created entries show up in Admin and can be cleaned up or merged.

## Region hierarchy

Country (Land)
→ State (Bundesland)
→ District (Landkreis)
→ **Kommune** (administrative municipality or town)
→ **Ort** (village / district / locality)

Example: `Deutschland › Hessen › Schwalm-Eder-Kreis › Willingshausen › Merzhausen`

On crawl auto-create:

| Classification field | RegionType (DB) | UI label | Parent |
|----------------------|-----------------|----------|--------|
| *(country)* | `country` | Country / Land | — |
| `region` | `state` | State | Country when present |
| `district` | `district` | District | State |
| `municipality` | `municipality` | Kommune | District |
| `place` | `suburb` | Ort | Kommune (else district) |

Note: DB enum keeps `city` / `suburb` for compatibility; `city` is treated as Kommune, `suburb` as Ort.

### Place lookup in Admin (hierarchy create)

Under Admin → Regions → **Add region**, the API searches Germany
(OpenStreetMap Nominatim, `countrycodes=de`):

1. Enter a name (e.g. `Wasenberg`)
2. Suggested chain: `Deutschland › Hessen › Schwalm-Eder-Kreis › Willingshausen › Wasenberg`
3. Multiple hits (e.g. `Merzhausen`, `Neustadt`) require a selection
4. **Create hierarchy** find-or-creates missing nodes (reuse same name/type under the same parent)

API: `GET /api/v1/admin/regions/lookup?q=…`, `POST /api/v1/admin/regions/from-lookup`
(`{ chain: [{ type, name, isoCode }] }`). Optional `NOMINATIM_BASE_URL` /
`NOMINATIM_USER_AGENT`.

## Coverage scope

Under Admin → **Import settings**, operators set a **coverage area** (one or more region
roots). The region catalog itself stays under Admin → Regions.

- A selected **district** includes all child Kommunen and Orte — they need not be checked individually.
- Extra places outside that tree (e.g. Alsfeld in Vogelsbergkreis plus Schwalm-Eder-Kreis) are selected separately.
- **Empty** coverage = no geo filter (previous behaviour).
- On AI ingest, new events with a recognized place **outside** coverage are not created. Events without place signals may still be ingested (moderation).

## Category import allowlist

Under Admin → **Import settings**, operators set a **category allowlist** (one or more
category roots). The category catalog remains under Admin → Categories.

- A selected **parent** includes all child categories.
- **Empty** allowlist = no category filter (previous behaviour).
- On AI ingest, new events with a resolved catalog category **outside** the allowlist
  are not created. Events without a resolvable category may still be ingested (moderation).

## Categories

On **fresh install**, `db:seed` / `bash scripts/db-seed.sh` creates exactly the curated
starter catalog (source: `packages/shared` → `DEFAULT_EVENT_CATEGORIES`):

- Kirmes
- Schützenfest
- Dorffest
- Konzert
- Tag der Offenen Tür
- Sportveranstaltung
- Vereinsveranstaltung
- Markt
- Feuerwehrfest
- Theater
- Weihnachtsmarkt
- Sonstiges

Additional categories are added **only manually** in the Admin Center. The AI does not invent
new categories; it maps labels onto the existing catalog (including aliases).
