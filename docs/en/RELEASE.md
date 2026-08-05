# Release process

> Language: English · [Deutsch (primary)](../RELEASE.md)

OpenEventHub uses **Semantic Versioning** and **Keep a Changelog**.
Milestone 10 automates GitHub Releases and GHCR image publish for SemVer tags.

## Sources of truth

| Artifact | Role |
|----------|------|
| `CHANGELOG.md` | Human-readable release notes (Keep a Changelog) |
| Root `package.json` `version` | Platform SemVer for the milestone |
| Service `package.json` versions | Bumped with the milestone that ships them |
| `docs/ROADMAP.md` | Milestone status (`planned` → `done`) |
| `architecture/reviews/mN-*.md` | Architecture / code review note for the milestone |
| `docs/VERSIONING.md` | **EventVersion** domain history — not package SemVer |

## When to cut a release

After a roadmap milestone meets its exit criteria:

1. Code and tests green (`tools:check` / CI)
2. Binding docs updated
3. Review note under `architecture/reviews/`
4. `CHANGELOG.md` section for the new version
5. Version fields bumped (root + touched services)
6. Conventional Commit on `main` (or PR merge), e.g. `feat(scope): … (vX.Y.Z)`
7. Annotated tag and push:
   ```bash
   git tag -a "v$(node -p "require('./package.json').version")" -m "v$(node -p "require('./package.json').version")"
   git push origin "v$(node -p "require('./package.json').version")"
   ```

`release.yml` creates the GitHub Release body from the matching `CHANGELOG.md` section and publishes container images.

## SemVer mapping (Conventional Commits)

| Commit type | Typical bump |
|-------------|--------------|
| `feat` | MINOR |
| `fix` | PATCH |
| Breaking change (`BREAKING CHANGE:` / `!`) | MAJOR |
| Docs/chore-only milestone packaging | MINOR if it ships a roadmap package; else PATCH |

Milestones M1–M11 normally advance the **MINOR** (or MAJOR when breaking) as
named packages (`v0.10.0` for M10, etc.).

## Changelog discipline

For each version section under `CHANGELOG.md`:

- Date the release (`YYYY-MM-DD`)
- Group under `### Added` / `### Changed` / `### Fixed` / `### Removed`
- Write for operators and contributors (what landed and why it matters)
- Link behavior to docs when non-obvious (API routes, env keys, plugins)

Do **not** weaken docs to match incomplete code — fix the code.

## Release notes checklist

- [ ] `CHANGELOG.md` updated
- [ ] Root + relevant service versions match
- [ ] `docs/ROADMAP.md` milestone marked `done`
- [ ] Review file present
- [ ] README “Current status” points at the new milestone
- [ ] Compose default image tags updated when services ship
- [ ] `npm run validate:compose` (and `validate:stack` when Stack changed)
- [ ] CI green on `main`
- [ ] Tag `vX.Y.Z` pushed (triggers image publish)

## Image registry

Published by `.github/workflows/release.yml` to `ghcr.io/<owner>/openeventhub-<service>`.
Details: `docs/CI_CD.md`.
