# Milestone 4 Review — AI Engine

Date: 2026-07-31
Version: 0.4.0
Status: Accepted for completion; next is M5 Crawler Framework

## Architecture review

- ADR 0005 OpenAI-compatible provider port applied
- Prompts only under `prompts/` with id+version metadata
- Pipeline: extraction → classification → deterministic confidence
- BullMQ queue `ai` consumed by `ai-service`
- Provider selected via env only

## Code review

- Hexagonal ports: `LlmProvider`, `PromptRepository`
- Fake provider used only at the port boundary in tests
- Optional `AIAnalysis` persistence when `eventId` is present

## Verification

| Check                                            | Result |
| ------------------------------------------------ | ------ |
| Unit/pipeline tests (`@openeventhub/ai-service`) | pass   |
| Lint / typecheck                                 | pass   |
| Compose validation                               | pass   |

## Follow-ups (M5+)

- Wire crawler/OCR outputs into AI jobs
- Deduplication / geocoding stages after classification
