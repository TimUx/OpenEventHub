# AI Configuration

> Sprache: Deutsch (primär) · [English](en/AI_CONFIGURATION.md)

## Prinzipien

- Provider-Zugangsdaten und Modellauswahl werden im **Admin Center**
  (AI Settings) verwaltet, nicht über Umgebungsvariablen der Anwendung.
- Prompts bleiben zentral unter `prompts/` und sind versioniert.
- Der aktive Provider kann ohne Codeänderungen oder Redeploys gewechselt werden.
- Ollama (oder jeder OpenAI-kompatible Endpunkt) ist für OpenEventHub ein **normaler HTTP-URL** —
  Host, LAN, VPN oder Cloud. Es gibt keine feste Kopplung an einen bestimmten Stack oder Hostnamen.

## Standard: Local Ollama

Compose kann einen **Ollama**-Dienst mitstarten (`http://ollama:11434`, Profil `ollama`,
kein Host-Port; Netz `edge`+`internal`). Steuerung:

| Variable | Bedeutung |
|----------|-----------|
| `OLLAMA_DEPLOY=1` (Default) | Gebündeltes `oeh-ollama` (+ `ollama-pull`) starten |
| `OLLAMA_DEPLOY=0` | Kein OEH-Ollama; externes Ollama / anderer LLM-Endpunkt nutzen |

### Externes Ollama / beliebiger OpenAI-kompatibler Endpunkt

Empfohlen: Ollama (oder Proxy) so veröffentlichen, dass er **über das Außennetz** erreichbar ist,
und in Admin → KI-Einstellungen (bzw. Seed über `OLLAMA_BASE_URL`) eine normale URL setzen.

| Situation | Beispiel-URL | Hinweis |
|-----------|--------------|---------|
| Host-Port `0.0.0.0:11434` (empfohlen lokal) | `http://host.docker.internal:11434/v1` | App-Services haben `extra_hosts: host.docker.internal:host-gateway` |
| LAN-/Server-IP oder Hostname | `http://192.168.1.50:11434/v1` | Beliebiger erreichbarer Host |
| Remote / Reverse-Proxy | `https://llm.example.com/v1` | Wie ChatGPT-kompatible Gateways |

**Wichtig:** Bind nur auf `127.0.0.1:11434` ist aus anderen Containern **nicht** erreichbar.
Dann entweder auf `0.0.0.0` (oder eine LAN-Adresse) publishen — oder optional (unten) ein gemeinsames Docker-Netz.

Seed und Admin-Profil **Local Ollama** verwenden `OLLAMA_BASE_URL` / `OLLAMA_MODEL`.
Nach Umstellung ggf. Admin → KI-Einstellungen prüfen oder `db:seed` erneut ausführen.

Beim Seed wird das Profil angelegt bzw. aktualisiert (`timeoutMs` mindestens 180 000) und als
aktiver Provider gesetzt, sofern noch keiner aktiv ist.

Compose zieht das Default-Modell nur bei `OLLAMA_DEPLOY=1` über `ollama-pull`.
Override: `OLLAMA_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_IMAGE` in `.env`.

### Optional: gemeinsames Docker-Netz

Wer Ollama absichtlich nur intern (ohne Host-Port) betreibt, kann ein **eigenes** externes
Docker-Netz anlegen und Ollama + OpenEventHub dort verbinden:

```bash
# .env
OLLAMA_DEPLOY=0
OLLAMA_EXTERNAL_NETWORK=mein-llm-net
OLLAMA_BASE_URL=http://ollama:11434/v1   # Container-DNS-Name im gemeinsamen Netz
```

`scripts/oeh-compose.sh` hängt dann `docker-compose.ollama-external.yml` an und verbindet
`api` + `ai-service` mit diesem Netz. Das ist eine **individuelle** Betriebsvariante — nicht
Voraussetzung und nicht an einen bestimmten Fremd-Stack gebunden.

### GPU (NVIDIA) — nur gebündeltes Ollama

Voraussetzung: [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)
und ein funktionierender Test wie `docker run --rm --gpus all nvidia/cuda:12.8.0-base-ubuntu24.04 nvidia-smi`.

| `OLLAMA_GPU` | Verhalten |
|--------------|-----------|
| `auto` (Default) | GPU-Overlay, wenn Docker eine `nvidia`-Runtime meldet |
| `1` / `true` | GPU erzwingen |
| `0` / `false` | nur CPU |

Wirksam nur mit `OLLAMA_DEPLOY=1`. `scripts/oeh-compose.sh` hängt dann
`docker/compose/docker-compose.ollama-gpu.yml` an.

Swarm: Ollama ist **nicht** im Basis-Stack; optional  
`docker/stack/docker-stack.ollama.yml` (+ ggf. `docker-stack.ollama-gpu.yml`).

Admin → KI-Einstellungen: Profile **anlegen, bearbeiten, löschen**, aktiv setzen und testen.
Der Profil-Test öffnet sofort einen Dialog mit Warteanzeige und zeigt danach Erfolg oder Fehler.

## Unterstützte Provider

| Type | Product examples | API style |
|------|------------------|-----------|
| `openai` | ChatGPT / OpenAI API | OpenAI Chat Completions |
| `anthropic` | Claude | Anthropic Messages |
| `google` | Gemini | Google Generative Language |
| `azure_openai` | Azure OpenAI | OpenAI-compatible |
| `openrouter` | OpenRouter | OpenAI-compatible |
| `ollama` | Ollama (gebündelt, Host, LAN oder Remote) | OpenAI-compatible (`/v1`) |
| `custom_openai` | Any OpenAI-compatible gateway | OpenAI-compatible |

## Admin-Einstellungen

Betreiber konfigurieren:

- Benannte Provider-Profile (Base URL, API-Key, Modell, Timeouts, enabled)
- CRUD im Admin Center (`/ai-settings`)
- Welches Profil für die Event Intelligence Engine **aktiv** ist
- Optionale Header / Organization-IDs pro Profil

API-Keys werden verschlüsselt at rest gespeichert.

## Runtime

`ai-service` lädt bei der Verarbeitung von BullMQ-`ai`-Jobs das aktive Profil
aus PostgreSQL und instanziiert den passenden Adapter.
