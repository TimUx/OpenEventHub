# AI Configuration

> Language: English · [Deutsch (primary)](../AI_CONFIGURATION.md)

## Principles

- Provider credentials and model selection are managed in the **Admin Center**
  (AI Settings), not via application environment variables.
- Prompts remain centralized under `prompts/` and are versioned.
- The active provider can be changed without code changes or redeploys.

## Default: Local Ollama

Compose can start an **Ollama** service (`http://ollama:11434`, profile `ollama`,
no host port; `edge`+`internal`). Control:

| Variable | Meaning |
|----------|---------|
| `OLLAMA_DEPLOY=1` (default) | Start bundled `oeh-ollama` (+ `ollama-pull`) |
| `OLLAMA_DEPLOY=0` | Skip OEH Ollama; use an external instance (e.g. your own stack / Open WebUI) |

For external Ollama set `OLLAMA_BASE_URL` reachable **from containers**:

- **Recommended when the port is bound to `127.0.0.1` only:** join a shared Docker network  
  `OLLAMA_EXTERNAL_NETWORK=ownai-net` and e.g. `OLLAMA_BASE_URL=http://ownai-ollama:11434/v1`  
  (`scripts/oeh-compose.sh` appends `docker-compose.ollama-external.yml`)
- Host bind `0.0.0.0:11434`: `http://host.docker.internal:11434/v1`  
  (app services include `extra_hosts: host.docker.internal:host-gateway`)

Seed and the Admin **Local Ollama** profile use `OLLAMA_BASE_URL` / `OLLAMA_MODEL`.
After switching, check Admin → AI Settings or re-run `db:seed`.

Seed creates/updates the profile (`timeoutMs` at least 180 000) and sets it active when
no active provider is configured yet.

Compose pulls the default model via `ollama-pull` only when `OLLAMA_DEPLOY=1`.
Override with `OLLAMA_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_IMAGE` in `.env`.

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
| `ollama` | Local Ollama (optional Compose profile / optional Swarm overlay; or external network) | OpenAI-compatible (`/v1`) |
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
