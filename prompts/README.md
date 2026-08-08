# Prompts

All LLM prompts for OpenEventHub live in this directory.

## Rules (binding)

- Prompts must never be embedded in application source code
- Every AI task references a prompt by id and version
- Prompt changes are reviewable and auditable

## Layout

```
prompts/
  <prompt-id>/
    <semver>/
      meta.json    # id, version, task, responseFormat
      system.md    # system message
      user.md      # user template with {{variables}}
```

## Catalog (M4+)

| Prompt ID              | Version | Task                     |
| ---------------------- | ------- | ------------------------ |
| `event-extraction`     | `1.0.2` | LLM extraction           |
| `event-classification` | `1.0.2` | Category / region / tags |

Older versions under each prompt id remain available for audit. Active versions are selected in the AI service pipeline.

Confidence scoring is deterministic (see `docs/CONFIDENCE_SCORE.md`) and does not use an LLM prompt.
