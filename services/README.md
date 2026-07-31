# Service placeholders

Application services are introduced in Milestone 2 (Architecture Skeleton).
Each directory below will become an independently built and deployed container.

| Directory      | Service                   | Introduced |
| -------------- | ------------------------- | ---------- |
| `api/`         | NestJS REST & GraphQL API | M2 / M6    |
| `frontend/`    | Public Next.js portal     | M2 / M7    |
| `admin/`       | Admin Next.js app         | M2 / M8    |
| `scheduler/`   | Crawl scheduler           | M2 / M5    |
| `worker/`      | BullMQ workers            | M2 / M5    |
| `crawler/`     | Crawler runtime           | M2 / M5    |
| `ai-service/`  | Event Intelligence Engine | M2 / M4    |
| `ocr-service/` | Tesseract OCR             | M2 / M5    |
| `search/`      | Search indexer            | M2 / M5    |

Do not add business logic here until the owning milestone begins.
