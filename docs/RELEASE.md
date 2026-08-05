# Release-Prozess

> Sprache: Deutsch (primär) · [English](en/RELEASE.md)

OpenEventHub nutzt **Semantic Versioning** und **Keep a Changelog**.
Milestone 10 automatisiert GitHub Releases und GHCR-Image-Publish für SemVer-Tags.

## Quellen der Wahrheit

| Artefakt | Rolle |
|----------|-------|
| `CHANGELOG.md` | Menschenlesbare Release-Notes (Keep a Changelog) |
| Root-`package.json` `version` | Plattform-SemVer für den Milestone |
| Service-`package.json`-Versionen | Mit dem Milestone, der sie ausliefert, angehoben |
| `docs/ROADMAP.md` | Milestone-Status (`planned` → `done`) |
| `architecture/reviews/mN-*.md` | Architecture-/Code-Review-Note zum Milestone |
| `docs/VERSIONING.md` | **EventVersion**-Domain-Historie — nicht Paket-SemVer |

## Wann ein Release schneiden

Nachdem ein Roadmap-Milestone seine Exit-Kriterien erfüllt:

1. Code und Tests grün (`tools:check` / CI)
2. Verbindliche Docs aktualisiert
3. Review-Note unter `architecture/reviews/`
4. `CHANGELOG.md`-Abschnitt für die neue Version
5. Versionsfelder angehoben (Root + berührte Services)
6. Conventional Commit auf `main` (oder PR-Merge), z. B. `feat(scope): … (vX.Y.Z)`
7. Annotiertes Tag und Push:
   ```bash
   git tag -a "v$(node -p "require('./package.json').version")" -m "v$(node -p "require('./package.json').version")"
   git push origin "v$(node -p "require('./package.json').version")"
   ```

`release.yml` erzeugt den GitHub-Release-Body aus dem passenden `CHANGELOG.md`-Abschnitt und veröffentlicht Container-Images.

## SemVer-Zuordnung (Conventional Commits)

| Commit-Typ | Typischer Bump |
|------------|----------------|
| `feat` | MINOR |
| `fix` | PATCH |
| Breaking Change (`BREAKING CHANGE:` / `!`) | MAJOR |
| Nur Docs/Chore-Milestone-Packaging | MINOR, wenn es ein Roadmap-Paket ausliefert; sonst PATCH |

Milestones M1–M11 erhöhen normalerweise die **MINOR**- (oder MAJOR bei Breaking) als
benannte Pakete (`v0.10.0` für M10 usw.).

## Changelog-Disziplin

Für jeden Versionsabschnitt in `CHANGELOG.md`:

- Release datieren (`YYYY-MM-DD`)
- Gruppieren unter `### Added` / `### Changed` / `### Fixed` / `### Removed`
- Für Operatoren und Contributors schreiben (was gelandet ist und warum es zählt)
- Verhalten an Docs knüpfen, wenn nicht offensichtlich (API-Routen, Env-Keys, Plugins)

Docs **nicht** abschwächen, um unvollständigen Code abzubilden — den Code reparieren.

## Release-Notes-Checkliste

- [ ] `CHANGELOG.md` aktualisiert
- [ ] Root- + relevante Service-Versionen stimmen überein
- [ ] Milestone in `docs/ROADMAP.md` als `done` markiert
- [ ] Review-Datei vorhanden
- [ ] README „Current status“ zeigt auf den neuen Milestone
- [ ] Compose-Default-Image-Tags aktualisiert, wenn Services ausgeliefert werden
- [ ] `npm run validate:compose` (und `validate:stack`, wenn Stack geändert)
- [ ] CI auf `main` grün
- [ ] Tag `vX.Y.Z` gepusht (löst Image-Publish aus)

## Image-Registry

Veröffentlicht durch `.github/workflows/release.yml` nach `ghcr.io/<owner>/openeventhub-<service>`.
Details: `docs/CI_CD.md`.
