# Milestone 4 Review — AI Engine

Date: 2026-07-31
Version: 0.4.1
Status: Accepted for completion; next is M5 Crawler Framework

## Architecture review

- ADR 0005 OpenAI-compatible provider port applied
- ADR 0006 admin-managed AI configuration (supersedes ADR 0005 §3)
- Prompts only under `prompts/` with id+version metadata
- Pipeline: extraction → classification → deterministic confidence
- BullMQ queue `ai` consumed by `ai-service`
- Providers configured in Admin → AI Settings (DB profiles, encrypted keys)
- Native adapters: OpenAI-compatible, Anthropic (Claude), Google Gemini

## Code review

- Shared `@openeventhub/ai-core` ports/adapters/crypto
- Hexagonal ports: `LlmProvider`, `PromptRepository`
- Fake provider used only at the port boundary in tests
- Optional `AIAnalysis` persistence when `eventId` is present
- Admin JWT auth + `/api/v1/admin/ai/*` CRUD/test endpoints

## Verification

| Check                                            | Result |
| ------------------------------------------------ | ------ |
| Unit/pipeline tests (`@openeventhub/ai-service`) | pass   |
| Lint / typecheck                                 | pass   |
| Compose validation                               | pass   |

## Follow-ups (M5+)

- Wire crawler/OCR outputs into AI jobs
- Deduplication / geocoding stages after classification
