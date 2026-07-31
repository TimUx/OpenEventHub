# ai-service

Event Intelligence Engine container.

## Responsibilities (M4)

- Consume BullMQ `ai` jobs
- Load versioned prompts from `prompts/`
- Call LLM providers configured in Admin (OpenAI, Anthropic, Gemini, Azure, OpenRouter, Ollama, custom)
- Run extraction → classification → deterministic confidence scoring
- Persist `AIAnalysis` when `eventId` is present on the job

## Configuration

| Variable | Purpose |
|----------|---------|
| `PROMPTS_DIR` | Absolute path to prompt catalog |
| `REDIS_*` | BullMQ connection |
| `DATABASE_URL` | PostgreSQL (loads active AI provider profile) |
| `SETTINGS_ENCRYPTION_KEY` | Decrypts API keys stored by Admin |

AI provider credentials are **not** configured via `AI_*` env vars.
Configure them in Admin → AI Settings (ADR 0006).

See ADR 0005/0006 and `docs/EVENT_INTELLIGENCE_ENGINE.md` / `docs/AI_CONFIGURATION.md`.
