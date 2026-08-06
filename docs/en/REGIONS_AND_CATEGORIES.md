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
→ State
→ District
→ Municipality
→ City
→ District/Suburb

On crawl auto-create typically: `region` → State, `municipality` → Municipality, `district` → District (under the matched/created parent).

## Categories

Categories are hierarchical and configurable.
Events may belong to multiple categories.
AI subcategories are created under the first main category when new.
