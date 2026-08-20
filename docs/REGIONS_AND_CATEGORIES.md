# Regionen & Kategorien

> Sprache: Deutsch (primär) · [English](en/REGIONS_AND_CATEGORIES.md)

## Pflege-Modell

| Aspekt | Verhalten |
|--------|-----------|
| Startwerte | Seed (`db:seed`) legt Regionen (z. B. Deutschland → Bayern → München) und einen **kuratierten flachen Kategoriekatalog** für den ländlichen Raum an (Kirmes, Schützenfest, Dorffest, Konzert, …) |
| Crawls / KI | **Orte/Tags:** Find-or-create. **Kategorien:** nur Zuordnung auf bestehende Katalog-Einträge (Alias-Mapping DE/EN); keine Auto-Anlage neuer Kategorien |
| Orte | Kein vollständiger Ortskatalog nötig — Kommunen/Orte entstehen aus der Klassifikation (`municipality` / `place` / `region` / `district`) und optional über Venues |
| Betrieb | Admin Center unter **Kategorien** und **Regionen** zum Nachpflegen, Umbenennen, Hierarchie und Löschen; **Regionen-Anlage** per Ortssuche (OpenStreetMap/Nominatim) legt fehlende Eltern mit an; bei Mehrdeutigkeit Auswahl; DEV-Bereinigung Kategorien: `bash scripts/reset-categories.sh`; Regionen: `bash scripts/repair-dev-regions.sh` |

Filter bleiben moderierbar: neu angelegte Einträge erscheinen in Admin und können bereinigt oder zusammengeführt werden.

## Regionen-Hierarchie

Land
→ Bundesland
→ Landkreis
→ **Kommune** (Gemeinde oder Stadt als Verwaltungseinheit)
→ **Ort** (Dorf / Stadtteil / Ortsteil)

Beispiel: `Deutschland › Hessen › Schwalm-Eder-Kreis › Willingshausen › Merzhausen`

Bei Auto-Anlage aus Crawls:

| Klassifikationsfeld | RegionType (DB) | UI-Bezeichnung | Parent |
|---------------------|-----------------|----------------|--------|
| *(Land)* | `country` | Land | — |
| `region` | `state` | Bundesland | Land (wenn vorhanden) |
| `district` | `district` | Landkreis | Bundesland |
| `municipality` | `municipality` | Kommune | Landkreis |
| `place` | `suburb` | Ort | Kommune (sonst Landkreis) |

Hinweis: DB-Enum behält `city` / `suburb` aus Kompatibilität; `city` wird wie Kommune behandelt, `suburb` ist Ort.

### Ortssuche im Admin (Hierarchie-Anlage)

Unter Admin → Regionen → **Region hinzufügen** sucht die API in Deutschland
(OpenStreetMap Nominatim, `countrycodes=de`):

1. Name eingeben (z. B. `Wasenberg`)
2. Vorschlagskette: `Deutschland › Hessen › Schwalm-Eder-Kreis › Willingshausen › Wasenberg`
3. Bei mehreren Treffern (z. B. `Merzhausen`, `Neustadt`) Auswahlpflicht
4. **Hierarchie anlegen** erzeugt fehlende Knoten per Find-or-create (bestehende Namen/Typen unter demselben Parent werden wiederverwendet)

API: `GET /api/v1/admin/regions/lookup?q=…`, `POST /api/v1/admin/regions/from-lookup`
(`{ chain: [{ type, name, isoCode }] }`). Optional `NOMINATIM_BASE_URL` /
`NOMINATIM_USER_AGENT`.

## Abdeckungsgebiet (Coverage Scope)

Unter Admin → **Import-Einstellungen** wird das **Abdeckungsgebiet** gesetzt (eine oder
mehrere Regionen als Wurzeln). Der Regionen-Katalog selbst bleibt unter Admin → Regionen.

- Ein gewählter **Landkreis** gilt inkl. aller untergeordneten Kommunen und Orte — diese
  müssen nicht einzeln angehakt werden.
- Zusätzliche Orte außerhalb (z. B. Alsfeld im Vogelsbergkreis neben Schwalm-Eder-Kreis)
  werden separat gewählt.
- **Leeres** Abdeckungsgebiet = kein Geo-Filter (wie bisher).
- Beim AI-Ingest werden neue Events mit erkanntem Ort **außerhalb** des Gebiets
  nicht angelegt. Ohne Ortshinweis bleibt die Übernahme möglich (Moderation).

## Kategorie-Allowlist (Import)

Unter Admin → **Import-Einstellungen** kann eine **Kategorie-Allowlist** gesetzt
werden (eine oder mehrere Kategorien als Wurzeln). Der Kategoriekatalog bleibt unter
Admin → Kategorien.

- Eine gewählte **Elternkategorie** gilt inkl. aller Unterkategorien.
- **Leere** Allowlist = kein Kategorie-Filter (wie bisher).
- Beim AI-Ingest werden neue Events mit aufgelöster Katalog-Kategorie **außerhalb**
  der Allowlist nicht angelegt. Ohne auflösbare Kategorie bleibt die Übernahme
  möglich (Moderation).

## Kategorien

Bei **Neuinstallation** legt `db:seed` / `bash scripts/db-seed.sh` genau den kuratierten
Starterkatalog an (Quelle: `packages/shared` → `DEFAULT_EVENT_CATEGORIES`):

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

Weitere Kategorien werden **nur manuell** im Admin Center ergänzt (anlegen / umbenennen /
Hierarchie / löschen). Die KI erfindet keine neuen Kategorien; sie mappt Labels auf den
bestehenden Katalog (inkl. Aliases). Fehlen eindeutige Signale, inferiert sie aus Titel/
Beschreibung; ist die Inferenz nicht eindeutig, wird **Sonstiges** gesetzt (oder keine
Kategorie, falls `sonstiges` im Katalog fehlt). Veranstaltungen können mehreren Kategorien
angehören. Moderatoren überschreiben Kategorien im Admin-Event-Form.
