# ai-service

Event Intelligence Engine container.

## Responsibilities (M4)

- Consume BullMQ `ai` jobs
- Load versioned prompts from `prompts/`
- Call OpenAI-compatible LLM providers (OpenAI, Azure, OpenRouter, Ollama)
- Run extraction → classification → deterministic confidence scoring
- Persist `AIAnalysis` when `eventId` is present on the job

## Configuration

| Variable       | Purpose                                         |
| -------------- | ----------------------------------------------- |
| `AI_PROVIDER`  | `openai` \| `azure` \| `openrouter` \| `ollama` |
| `AI_BASE_URL`  | OpenAI-compatible API base URL                  |
| `AI_API_KEY`   | API key (optional for Ollama)                   |
| `AI_MODEL`     | Model id                                        |
| `PROMPTS_DIR`  | Absolute path to prompt catalog                 |
| `REDIS_*`      | BullMQ connection                               |
| `DATABASE_URL` | Prisma persistence for analyses                 |

See ADR 0005 and `docs/EVENT_INTELLIGENCE_ENGINE.md`.
