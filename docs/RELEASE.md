# Release process

OpenEventHub uses **Semantic Versioning** and **Keep a Changelog**.
Automated SemVer tagging and image publish land in Milestone 10; until then
releases are documented and versioned manually as part of milestone completion.

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

## SemVer mapping (Conventional Commits)

| Commit type | Typical bump |
|-------------|--------------|
| `feat` | MINOR |
| `fix` | PATCH |
| Breaking change (`BREAKING CHANGE:` / `!`) | MAJOR |
| Docs/chore-only milestone packaging | MINOR if it ships a roadmap package; else PATCH |

Milestones M1–M11 normally advance the **MINOR** (or MAJOR when breaking) as
named packages (`v0.9.0` for M9, etc.).

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

## After M10

CI will enforce SemVer tags and container image publish. Until then, do not claim
automated GitHub Releases — keep `CHANGELOG.md` accurate so M10 can automate from it.
