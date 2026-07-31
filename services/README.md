# Service containers

| Directory      | Runtime | Port | Milestone |
| -------------- | ------- | ---- | --------- |
| `api/`         | NestJS  | 3000 | M2 / M6   |
| `frontend/`    | Next.js | 3100 | M2 / M7   |
| `admin/`       | Next.js | 3101 | M2 / M8   |
| `scheduler/`   | NestJS  | 3001 | M2 / M5   |
| `worker/`      | NestJS  | 3002 | M2 / M5   |
| `crawler/`     | NestJS  | 3003 | M2 / M5   |
| `ai-service/`  | NestJS  | 3004 | M2 / M4   |
| `ocr-service/` | NestJS  | 3005 | M2 / M5   |
| `search/`      | NestJS  | 3006 | M2 / M5   |

Every service exposes `/health`, `/ready`, and `/metrics` via
`@openeventhub/service-runtime` (NestJS) or App Router handlers (Next.js).
