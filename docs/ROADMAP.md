# Roadmap

> Sprache: Deutsch (primär) · [English](en/ROADMAP.md)

Diese Roadmap ist der verbindliche Entwicklungsplan für OpenEventHub.
Sie leitet sich aus den Dokumentationspaketen und dem aktuellen Repository-Stand ab
(Dokumentation vollständig; Anwendungs-Meilensteine M1–M11 umgesetzt).

Status-Legende: `planned` · `in_progress` · `done`

---

## Aktueller Stand (2026-08-05)

| Bereich | Status |
|------|--------|
| Vision / Architektur / Daten / KI / Plugins / API / Frontend / Ops-Docs | vollständig |
| Anwendungscode | M1–M11 umgesetzt |
| Docker Compose / Stack | Compose + Produktions-Swarm-Stack |
| Prisma / Datenbank | M3 abgeschlossen (`@openeventhub/database`) |
| AI Engine | M4 abgeschlossen (`ai-service`, Admin AI Settings) |
| Crawler Framework | M5 abgeschlossen (Plugin-SDK, HTML/RSS/ICS, Scheduler, OCR) |
| Public API | M6 abgeschlossen (`/api/v1`, GraphQL, OpenAPI, Rate Limits) |
| Frontend / Admin | M7–M8 abgeschlossen |
| CI/CD | M10–M11 Quality Gates + SemVer-Release + Ops-Validierung |
| Plugins / Prompts | erste Plugins + Prompt-Katalog |
| Developer- / Cursor-Guidance | M9–M10 abgeschlossen |
| Ops / Production Hardening | M11 abgeschlossen (Monitoring, Backup, Swarm) |

---

## Prioritätsreihenfolge

1. Container-First-Fundament etablieren, das ohne Host-Abhängigkeiten läuft
2. Service-Grenzen und gemeinsame Contracts festlegen (Architektur)
3. Dokumentiertes Domänenmodell persistieren (Prisma + Migrationen)
4. KI- und Crawler-Pipelines hinter Queues aufbauen
5. Versionierte Public APIs bereitstellen
6. Öffentliches Frontend und Admin ausliefern
7. Ops härten (Monitoring, Backup, Moderations-Workflows)
8. Developer- / Cursor-Guidance für Mitwirkende abschließen

Niemals mehrere große Meilensteine parallel umsetzen.

---

## Meilensteinplan

### M1 — Foundation (`Package 01`) · `done`

**Ziel:** Professionelle Monorepo- und Infrastruktur-Basis. `docker compose up` startet die Kern-Daten-/Edge-Services mit Healthchecks. Noch keine Business-Logik.

**Deliverables**

- Git-Repository, Conventional Commits, SemVer (`0.1.0`)
- Monorepo-Layout gemäß Container-Architektur
- Gemeinsame TypeScript- / ESLint- / Prettier-Baseline
- Docker Compose: Traefik, PostgreSQL, Redis, SeaweedFS
- Docker-Stack-Skelett für Swarm
- Umgebungs-Templates, Skripte, Healthcheck-Konventionen
- CI-Skelett (Lint / Compose validieren)
- Cursor-Rules gemäß verbindlicher Dokumentation
- ADR-0001 (Monorepo & Container-First-Fundament)
- README / CHANGELOG / CONTRIBUTING / LICENSE

**Exit-Kriterien**

- `docker compose` bringt die Infrastruktur in einen healthy-Zustand
- Kein Host-Node/DB nötig, um die Infrastruktur zu betreiben
- Docs beschreiben Start und Erweiterung

---

### M2 — Architecture Skeleton (`Package 02`) · `done`

**Ziel:** Service-Grenzen als lauffähige Container mit Health/Ready/Metrics und Shared Libraries — weiterhin ohne Domänen-Features.

**Deliverables**

- NestJS-API-Shell (`/health`, `/ready`, `/metrics`)
- Worker- / Scheduler- / Crawler- / AI- / OCR- / Search-Shells
- Next.js-Frontend- + Admin-Shells
- Shared Packages: Config, Logging, Messaging-Contracts
- Interne Docker-Netzwerk-Verdrahtung über Traefik
- ADRs für Kommunikation (HTTP vs. BullMQ) und Hexagon-Ports

**Exit-Kriterien**

- Full-Stack-Compose startet alle Anwendungscontainer
- Services melden healthy; noch keine Domänen-Endpoints

---

### M3 — Data Model (`Package 03`) · `done`

**Ziel:** Prisma-Schema gemäß `DATA_MODEL.md` / `DATABASE_SCHEMA.md` mit Migrationen, Versionierung und Repositories.

**Deliverables**

- Prisma-Schema für Event, EventVersion, Source, Crawl*, AIAnalysis usw.
- Initiale Migration + Seed für Regionen/Kategorien
- Database-Package im Besitz der API (andere über API-/Queue-Contracts)
- Unit-/Integrationstests für Repositories

**Exit-Kriterien**

- Migrationen laufen sauber in Compose
- Kein Raw-SQL im Anwendungscode

---

### M4 — AI Engine (`Package 04`) · `done`

**Ziel:** Austauschbarer OpenAI-kompatibler AI-Service mit zentralen Prompts.

**Deliverables**

- AI-Service mit Provider-Abstraktion (OpenAI, Azure, OpenRouter, Ollama-ready)
- Zentraler `prompts/`-Katalog
- Pipeline-Stufen: Extraktion, Klassifikation, Confidence
- Queue-Consumer für AI-Jobs
- Tests mit Provider-Fakes an der Port-Grenze (keine Business-Mocks)

**Exit-Kriterien**

- Provider-Wechsel nur über Env
- Keine Prompts im Anwendungscode eingebettet

---

### M5 — Crawler Framework (`Package 05`) · `done`

**Ziel:** Plugin-First Discovery-/Fetch-/Parse-Pipeline mit Scheduler + Workers.

**Deliverables**

- Plugin-SDK (`packages/plugin-sdk`)
- BullMQ-Queues: Discovery, Crawl, OCR, AI, Geocoding, Search, Notifications
- Scheduler-Service + Crawler-Worker
- Erste Plugins: HTML, RSS, ICS
- OCR-Service (Tesseract) + SeaweedFS/S3-Rohspeicher
- Plugin-Auto-Registration

**Exit-Kriterien**

- Neuer Quellentyp = nur neues Plugin (keine Core-Änderungen)
- End-to-End-Crawl einer Fixture-Quelle in den Rohspeicher

---

### M6 — Public API (`Package 06`) · `done`

**Ziel:** Versioniertes REST + GraphQL mit OpenAPI/Swagger, JWT, RBAC, Rate Limits.

**Deliverables**

- `/api/v1`-Ressourcen aus `REST_ENDPOINTS.md`
- GraphQL-Schema
- Auth (JWT), RBAC, Audit-Log-Hooks
- OpenAPI 3.1 + Swagger UI
- Contract-Tests

**Exit-Kriterien**

- Dokumentierte Endpoints implementiert und getestet
- Rate Limiting und Health-Endpoints live

---

### M7 — Frontend (`Package 07`) · `done`

**Ziel:** Öffentliches Portal: Liste, Kalender, Karte, Suche, SEO.

**Deliverables**

- Next.js + Tailwind + shadcn/ui
- Views aus `FRONTEND.md` / `SEARCH_UI.md` / `SEO.md`
- Dark Mode, a11y, Schema.org, OpenGraph
- Integration gegen die API

**Exit-Kriterien**

- Responsives Portal gegen echte API-Daten
- SEO-Metadaten auf Event-Seiten

---

### M8 — Administration (`Package 08`) · `done`

**Ziel:** Admin-Center für Betrieb und Moderation.

**Deliverables**

- Dashboard, Quellen, Crawler, Scheduler, KI, Benutzer/Rollen, Moderation
- Logs / Queue-Sichtbarkeit
- RBAC-geschützte Admin-Routen

**Exit-Kriterien**

- Operatoren können Quellen und Moderation ohne DB-Zugriff verwalten

---

### M9 — Developer Experience (`Package 09`) · `done`

**Ziel:** Contributor-tauglicher Developer Guide passend zum laufenden System.

**Deliverables**

- Aktualisierte `DEVELOPER_GUIDE.md`, Plugin-Guides, lokale (Compose-)Workflows
- Beispiel-Plugin-Walkthrough gegen Code verifiziert
- Changelog-Disziplin und Release-Notes-Prozess

---

### M10 — Cursor & Quality Gates (`Package 10`) · `done`

**Ziel:** Dokumentationsgetriebene Entwicklung in IDE und CI durchsetzen.

**Deliverables**

- Vollständiges Cursor-Rule-Set
- CI: Lint, Unit, Integration, Docker-Build, Security-Scan
- Release-Workflow (SemVer-Tags, Image-Publish)

---

### M11 — Production Hardening · `done`

**Ziel:** Produktionsreife Swarm-Deployment und Betriebsfähigkeit.

**Deliverables**

- Docker Stack mit Secrets, Configs, Rolling Updates
- Monitoring (Prometheus/Grafana/Loki) gemäß `MONITORING.md`
- Backup/Restore gemäß `BACKUP.md`
- Performance- und E2E-Suites

**Exit-Kriterien**

- Swarm-Deploy dokumentiert und verifiziert
- Backup-Restore getestet
- Plattform als produktionsreif betrachtet

---

## Post-M11 — Portal- und Ops-Nachzüge

Nach Abschluss der Roadmap-Pakete M1–M11 wurden folgende Produkt-/Ops-Erweiterungen nachgezogen
(siehe `CHANGELOG.md`, zuletzt **v0.20.0**):

- Flaches Frontend-/Admin-UI (FestSchmiede-inspiriert), wählbare Akzentfarben (WCAG AA), Brand-Mark (Kalender + Hub)
- Event-Aktionen: Karte/Kalender als Icon-Buttons; Filter und Kalender-Export als aufklappbare Panels auf der Veranstaltungsliste
- Kalender-Abonnement (`/calendar.ics`) und Bulk-`.ics`-Export gefilterter Events
- Eingebettete Karte mit Suche, Filtern und Auto-Zoom; Deep-Link `?event=`
- Öffentliche Einreichung von Veranstaltungen und Quellen (Schedule-Presets)
- Admin: Quellen bearbeiten; Kategorien/Regionen/Events CRUD; Fehler-Log; AI Settings Provider-CRUD
- Optional Ollama: `OLLAMA_DEPLOY`, externes Netz (`ownai-net`), NVIDIA-GPU-Overlay; Swarm-Ollama als separates Overlay
- AI-Ingest: Events aus Extraktion anlegen; Taxonomie Find-or-create; ein AI-Job pro Plugin-Event-Kandidat
- Crawl nur **zukünftige/laufende** Termine; Scheduler löscht abgelaufene Events stündlich
- Ganztägige Events (`allDay`): keine erfundenen Uhrzeiten in UI/ICS
- Admin Events: Mehrfachauswahl Status/Löschen; Tabellenfilter/-sortierung (Status, Datum, Ort, Suche, ganztägig); Header-Hinweis auf prüfpflichtige Events
- HTML-Plugin multi-format (`1.3.0`): Tabellen/Listen/Div/JSON-LD/`<time>`/Klartext; Embedded EMS **Toubiz** (alle zukünftigen Termine)
- Dediziertes Plugin `toubiz` (`mein.toubiz.de` / `<toubiz-widget>`)
- Scheduler: ein Tick pro Distinct-Cron; serielle Crawls
- Strikte Docker-Netztrennung (`edge` / `internal`) mit minimalen Host-Ports
- UI-i18n (`de`/`en`) und erweiterte Anzeigemodi (Events/Kalender)
- SEO (Sitemap, robots, JSON-LD, Canonicals) und PWA (Manifest, Service Worker, Install-Icons)
- Responsive Portal-Navigation (Bottom-Bar Smartphone/Tablet)
- Kompakte Header-Icons für Sprache, Akzentfarbe und Dark/Light

---

## Package-Mapping

| Package | Meilenstein |
|---------|-----------|
| 01 Foundation | M1 |
| 02 Architecture | M2 |
| 03 Data Model | M3 |
| 04 AI Engine | M4 |
| 05 Crawler Framework | M5 |
| 06 API | M6 |
| 07 Frontend | M7 |
| 08 Administration | M8 |
| 09 Developer Guide | M9 |
| 10 Cursor Development Guide | M10 |
| Ops / Prod | M11 |

---

## Arbeitsregeln

1. Dokumentation hat immer Vorrang vor Code.
2. Ein Meilenstein nach dem anderen.
3. Nach jedem Meilenstein: Architektur-Review, Code-Review, Docs, Tests.
4. Conventional Commits + SemVer.
5. Keine TODOs, Platzhalter oder toter Code in gemergter Arbeit.
