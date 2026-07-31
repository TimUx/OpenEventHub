-- Rename vendor-specific MinIO columns to provider-agnostic object_key (ADR 0004).

ALTER TABLE "crawl_results" RENAME COLUMN "minio_key" TO "object_key";
ALTER TABLE "media" RENAME COLUMN "minio_key" TO "object_key";
