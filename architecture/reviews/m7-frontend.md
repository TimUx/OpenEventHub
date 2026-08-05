# Milestone 7 Review — Frontend

Date: 2026-08-05
Version: 0.7.0
Status: Accepted for completion; next is M8 Administration

## Architecture review

- Next.js App Router portal under `services/frontend`
- Server components fetch via `API_INTERNAL_URL`; browser via `NEXT_PUBLIC_API_BASE_URL`
- TanStack Query for interactive calendar, map, and search
- SEO: metadata API, OpenGraph, JSON-LD Event, `/sitemap.xml`, `/robots.txt`
- No core API changes required — portal is a consumer only

## Code review

- shadcn-style primitives (`button`, `input`, `card`, `badge`) with teal/ink theme
- Dark mode via `class` strategy + localStorage preference
- Search covers free text, category, region, date filter, and relevance/date sort
- Map is a geographic overview until venue geocoding lands (OSM links)

## Verification

| Check               | Result                   |
| ------------------- | ------------------------ |
| Frontend unit tests | pass (tsx)               |
| Compose config      | frontend 0.7.0 + API env |

## Follow-ups (M8+)

- Admin center for sources, moderation, ops
- Map pins once venues are geocoded
- Richer SEARCH_UI filters (radius, organizer) when API supports them
