# ADR 0005: Exchangeable OpenAI-Compatible AI Provider

- Status: Accepted (partially superseded)
- Date: 2026-07-31
- Milestone: M4 AI Engine
- Superseded in part by: ADR 0006 (admin-managed provider selection; §3 env vars)

## Context

The Event Intelligence Engine must extract and classify events using LLMs.
Providers must be swappable without code changes (`docs/AI_CONFIGURATION.md`).
Prompts must live only under `prompts/` (`docs` binding rule).

## Decision

1. Define an `LlmProvider` port with `completeChat(messages, options)`.
2. Implement one **OpenAI-compatible** HTTP adapter used for:
   - OpenAI
   - Azure OpenAI (via base URL + API key / deployment path)
   - OpenRouter
   - Ollama (OpenAI-compatible `/v1` endpoint)
3. ~~Select provider solely via environment (`AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`).~~
   **Superseded by ADR 0006:** providers are configured in Admin → AI Settings (DB profiles).
4. Load prompts from the filesystem catalog (`prompts/**/meta.json` + markdown bodies).
5. AI queue (`BullMQ` queue name `ai`) drives the extraction → classification → confidence pipeline.
6. Tests inject a fake `LlmProvider` at the port boundary (no fake business pipeline).

## Consequences

### Positive

- Provider switch without redeploying different code paths
- Auditable prompt versions referenced in `AIAnalysis`
- Clear hexagonal seam for future providers

### Negative

- Azure deployment URL shape must be configured via `AI_BASE_URL` carefully
- Ollama must expose an OpenAI-compatible endpoint

## Alternatives considered

| Alternative                   | Why rejected                             |
| ----------------------------- | ---------------------------------------- |
| Provider-specific SDKs only   | Couples core to vendors                  |
| Prompts in code/env blobs     | Violates centralized prompt rule         |
| Sync HTTP API only (no queue) | Conflicts with event-driven architecture |
