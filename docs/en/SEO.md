# SEO

> Language: English · [Deutsch (primary)](../SEO.md)

Search engines should be able to discover and index the public portal. Implementation lives in the frontend service (`services/frontend`) and uses Next.js metadata, a sitemap, and structured data.

## Public URLs

| Path | Indexed | Notes |
|------|---------|--------|
| `/` | yes | Home with Organization/WebSite JSON-LD |
| `/events` | yes | Event list |
| `/events/[id]` | yes | Detail + Event JSON-LD |
| `/calendar` | yes | Interactive UI + server-rendered event links |
| `/map` | yes | Interactive UI + server-rendered event links |
| `/submit` | yes | Lower sitemap priority |
| `/search` | **no** | `noindex`, excluded from sitemap (filter/query URLs) |
| `/health`, `/ready`, `/metrics` | **no** | disallowed in `robots.txt` |

## Sitemap & robots

- **`/sitemap.xml`** — Next.js `app/sitemap.ts`
  - Static routes with priority / change frequency
  - Up to 500 published events
  - `revalidate = 3600` (hourly refresh)
- **`/robots.txt`** — Next.js `app/robots.ts`
  - `Allow: /`
  - `Disallow` for health/metrics and search routes
  - Points to the sitemap under the configured site URL

The canonical base URL comes from `NEXT_PUBLIC_SITE_URL` / `getSiteUrl()`. In production this must be the public domain (not an internal hostname).

## Metadata

- Root layout: `metadataBase`, title template, Open Graph (site name, locale, brand image)
- Pages: `pageMetadata()` in `lib/seo.ts` sets title, description, canonical, robots, Open Graph, and Twitter card
- Event detail: title/description from the event; `noindex` on 404
- Search: intentionally `index: false`

## Structured data (JSON-LD)

- **WebSite + Organization** on the homepage (`SiteJsonLd`), including `SearchAction` → `/search?q={search_term_string}`
- **Event** on detail pages (`EventJsonLd`): time, place/geo, categories as keywords, Schema.org status

## Crawlable content

Calendar and map UIs are client-side. The server also renders a list of links to event details (`CrawlableEventList`) so crawlers without JavaScript can reach events.

## Operations checklist

1. Set `NEXT_PUBLIC_SITE_URL` to the public HTTPS URL
2. After deploy, verify `https://<domain>/robots.txt` and `https://<domain>/sitemap.xml`
3. Submit the sitemap in Search Console / Bing Webmaster Tools
4. Spot-check: event detail HTML includes `<script type="application/ld+json">` with `"@type":"Event"`
