# Regions & categories

> Language: English · [Deutsch (primary)](../REGIONS_AND_CATEGORIES.md)

## Maintenance model

| Aspect | Behaviour |
|--------|-----------|
| Starters | Seed (`db:seed`) creates regions (e.g. Deutschland → Bayern → München) and a **curated flat rural category catalog** (Kirmes, Schützenfest, Dorffest, Konzert, …) |
| Crawls / AI | **Tags:** find-or-create. **Categories:** map onto existing catalog entries only (DE/EN aliases); no auto-creation of new categories. **Places/regions:** catalog match **or** Nominatim-verified settlement/admin chain only — never blind-create from LLM venue/POI labels |
| Places | Ort = village/locality under Kommune. Venue names stay on venues. Missing settlements are created only after a Nominatim hit as a full hierarchy (country → … → leaf) |
| Ops | Admin Center under **Categories** and **Regions**; **region create** via place lookup (OpenStreetMap/Nominatim) also creates missing parents; ambiguous names require a choice; DEV category reset: `bash scripts/reset-categories.sh`; region repair (incl. pseudo-POI places): `bash scripts/repair-dev-regions.sh` |

Filters stay moderatable: newly created entries show up in Admin and can be cleaned up or merged.

## Region hierarchy

Country (Land)
→ State (Bundesland)
→ District (Landkreis)
→ **Kommune** (administrative municipality or town)
→ **Ort** (village / district / locality)

Example: `Deutschland › Hessen › Schwalm-Eder-Kreis › Willingshausen › Merzhausen`

On crawl/AI create (only after catalog match or Nominatim verification):

| Classification field | RegionType (DB) | UI label | Parent |
|----------------------|-----------------|----------|--------|
| *(country)* | `country` | Country / Land | — |
| `region` | `state` | State | Country when present |
| `district` | `district` | District | State |
| `municipality` | `municipality` | Kommune | District |
| `place` | `suburb` | Ort | Kommune (else district) |

Note: DB enum keeps `city` / `suburb` for compatibility; `city` is treated as Kommune, `suburb` as Ort. Venue/building/parking names are **not** created as `place`.

**Venue vs. place vs. address:** `Venue.name` = venue/building (e.g. Schlosskirche — without settlement); `Venue.regionId` → hierarchy place (e.g. Ziegenhain under Schwalmstadt); `Venue.address` = street line only (e.g. Paradeplatz). Ingest/admin/repair normalize to this shape; no separate Prisma “building” column.

### AI ingest region resolve

The AI service resolves `place` → else `municipality` → else `district` → else `region`:

1. Match existing catalog (case-insensitive name, suitable type)
2. Else Nominatim (DE) with a strict settlement/admin filter; find-or-create country→…→leaf chain
3. No hit → `regionId = null` (venue kept); never blind-create from LLM labels

Admin lookup stays broader (operator choice).

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
- Tanzkurs
- Vortrag
- Ausstellung
- Weihnachtsmarkt
- Sonstiges

Additional categories are added **only manually** in the Admin Center. The AI does not invent
new categories; it maps labels onto the existing catalog (including aliases). When signals are
unclear it infers from title/description; if inference is not unambiguous it assigns
**Sonstiges** (or leaves unset if `sonstiges` is missing from the catalog). Moderators can
override categories on the admin event form.
