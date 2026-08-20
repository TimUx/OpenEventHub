# AI Configuration

> Language: English · [Deutsch (primary)](../AI_CONFIGURATION.md)

## Principles

- Provider credentials and model selection are managed in the **Admin Center**
  (AI Settings), not via application environment variables.
- Prompts remain centralized under `prompts/` and are versioned.
- The active provider can be changed without code changes or redeploys.
- Ollama (or any OpenAI-compatible endpoint) is a **normal HTTP URL** for OpenEventHub —
  host, LAN, VPN, or cloud. There is no hard coupling to a particular stack or hostname.

## Default: Local Ollama

Compose can start an **Ollama** service (`http://ollama:11434`, profile `ollama`,
no host port; `edge`+`internal`). Control:

| Variable | Meaning |
|----------|---------|
| `OLLAMA_DEPLOY=1` (default) | Start bundled `oeh-ollama` (+ `ollama-pull`) |
| `OLLAMA_DEPLOY=0` | Skip OEH Ollama; use an external Ollama / other LLM endpoint |

### External Ollama / any OpenAI-compatible endpoint

Recommended: publish Ollama (or a proxy) so it is reachable on the **outer network**, then set a
normal URL in Admin → AI Settings (or via seed `OLLAMA_BASE_URL`).

| Situation | Example URL | Notes |
|-----------|-------------|-------|
| Host port `0.0.0.0:11434` (recommended locally) | `http://host.docker.internal:11434/v1` | App services include `extra_hosts: host.docker.internal:host-gateway` |
| LAN / server IP or hostname | `http://192.168.1.50:11434/v1` | Any reachable host |
| Remote / reverse proxy | `https://llm.example.com/v1` | Same pattern as other OpenAI-compatible gateways |
| Bundled Compose `oeh-ollama` (`OLLAMA_DEPLOY=1`) | `http://ollama:11434/v1` | Hostname `ollama` only on the OEH Compose network |

**Important — hostname `ollama`:** Resolves only when the Compose `ollama` service is running
(`OLLAMA_DEPLOY=1`) or you attach Ollama via `OLLAMA_EXTERNAL_NETWORK`.
With an external Ollama (e.g. `ownai-ollama` published only on host port 11434),
`http://ollama:11434/v1` causes AI queue failures (`fetch failed` / `ENOTFOUND ollama`).
Use **`http://host.docker.internal:11434/v1`** and the model actually loaded
(Admin → AI Settings → provider test).

**Important:** Binding only to `127.0.0.1:11434` is **not** reachable from other containers.
Either publish on `0.0.0.0` (or a LAN address) — or optionally (below) join a shared Docker network.

Seed and the Admin **Local Ollama** profile use `OLLAMA_BASE_URL` / `OLLAMA_MODEL`
(default URL without env: `http://host.docker.internal:11434/v1`).
After switching, check Admin → AI Settings or re-run `db:seed`.

Seed creates/updates the profile (`timeoutMs` at least 180 000) and sets it active when
no active provider is configured yet.

Compose pulls the default model via `ollama-pull` only when `OLLAMA_DEPLOY=1`.
Override with `OLLAMA_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_IMAGE` in `.env`.

### Optional: shared Docker network

If you intentionally run Ollama internal-only (no host port), create **your own** external
Docker network and attach both Ollama and OpenEventHub:

```bash
# .env
OLLAMA_DEPLOY=0
OLLAMA_EXTERNAL_NETWORK=my-llm-net
OLLAMA_BASE_URL=http://ollama:11434/v1   # container DNS name on the shared network
```

`scripts/oeh-compose.sh` then appends `docker-compose.ollama-external.yml` and attaches
`api` + `ai-service` to that network. This is an **optional** ops choice — not required and
not tied to any particular third-party stack.

### GPU (NVIDIA) — bundled Ollama only

Requires the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)
and a working test such as `docker run --rm --gpus all nvidia/cuda:12.8.0-base-ubuntu24.04 nvidia-smi`.

| `OLLAMA_GPU` | Behaviour |
|--------------|-----------|
| `auto` (default) | GPU overlay when Docker reports an `nvidia` runtime |
| `1` / `true` | Force GPU |
| `0` / `false` | CPU only |

Applies only with `OLLAMA_DEPLOY=1`. `scripts/oeh-compose.sh` then appends
`docker/compose/docker-compose.ollama-gpu.yml`.

Swarm: Ollama is **not** in the base stack; optionally add  
`docker/stack/docker-stack.ollama.yml` (+ `docker-stack.ollama-gpu.yml` if needed).

Admin → AI Settings: **create, edit, delete** profiles, set active, and test.
The profile test opens a dialog immediately with a waiting indicator, then shows success or failure.

## Supported providers

| Type | Product examples | API style |
|------|------------------|-----------|
| `openai` | ChatGPT / OpenAI API | OpenAI Chat Completions |
| `anthropic` | Claude | Anthropic Messages |
| `google` | Gemini | Google Generative Language |
| `azure_openai` | Azure OpenAI | OpenAI-compatible |
| `openrouter` | OpenRouter | OpenAI-compatible |
| `ollama` | Ollama (bundled, host, LAN, or remote) | OpenAI-compatible (`/v1`) |
| `custom_openai` | Any OpenAI-compatible gateway | OpenAI-compatible |

## Admin settings

Operators configure:

- Named provider profiles (base URL, API key, model, timeouts, enabled)
- CRUD in Admin Center (`/ai-settings`)
- Which profile is **active** for the Event Intelligence Engine
- Optional per-profile headers / organization ids

API keys are stored encrypted at rest.

## Runtime

`ai-service` loads the active profile from PostgreSQL when processing BullMQ `ai`
jobs and instantiates the matching adapter.
