# Regions & categories

> Language: English · [Deutsch (primary)](../REGIONS_AND_CATEGORIES.md)

## Maintenance model

| Aspect | Behaviour |
|--------|-----------|
| Starters | Seed (`db:seed`) creates an initial hierarchy (e.g. Germany → Bayern → München; Music/Sports/Culture) |
| Crawls / AI | **Find-or-create:** known names are reused; missing categories, tags, and places are created and linked to the event |
| Places | No full gazetteer required — municipalities/cities appear from classification (`municipality` / `region` / `district`) and optionally venues |
| Ops | Admin Center under **Categories** and **Regions** for cleanup, rename, hierarchy, and delete |

Filters stay moderatable: newly created entries show up in Admin and can be cleaned up or merged.

## Region hierarchy

Country
→ State (Bundesland)
→ District (Landkreis / county)
→ Municipality / City
→ Suburb

On crawl auto-create:

| Classification field | RegionType | Parent |
|----------------------|------------|--------|
| `region` | `state` | — |
| `district` | `district` | State |
| `municipality` | `municipality` | District (or State if no county) |

## Coverage scope

Under Admin → Regions, operators set a **coverage area** (one or more region roots).

- A selected **district** includes all child municipalities — they need not be checked individually.
- Extra places outside that tree (e.g. Alsfeld in Vogelsbergkreis plus Schwalm-Eder-Kreis) are selected separately.
- **Empty** coverage = no geo filter (previous behaviour).
- On AI ingest, new events with a recognized place **outside** coverage are not created. Events without place signals may still be ingested (moderation).

## Categories

Categories are hierarchical and configurable.
Events may belong to multiple categories.
AI subcategories are created under the first main category when new.
