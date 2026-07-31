# ADR 0004: Replace MinIO with SeaweedFS

- Status: Accepted
- Date: 2026-07-31
- Supersedes: MinIO references in ADR 0001 (infra choice only)

## Context

OpenEventHub needs S3-compatible object storage for crawler raw payloads,
OCR inputs, and event media. The original stack used MinIO.

MinIO’s community edition upstream was archived (read-only) in April 2026 and
is no longer a safe default for new open-source deployments (no maintained
community release channel / security posture).

## Decision

1. Use **SeaweedFS** (`chrislusf/seaweedfs`) as the self-hosted object store.
2. Expose the **S3 API** (port 8333) as the application integration surface.
3. Name the Compose/Stack service **`object-storage`** (provider-agnostic DNS).
4. Store object references in the database as **`object_key`** (not vendor-specific names).
5. Prefer AWS SDK / S3 clients in application code — never MinIO-specific SDKs.

## Consequences

### Positive

- Actively maintained upstream (Apache-2.0), aligned with OpenEventHub’s license
- S3 compatibility for crawler/OCR/media without vendor lock-in to MinIO APIs
- Single-node `weed mini` is sufficient for Compose; Swarm can scale volumes later

### Negative

- Existing MinIO volumes are not automatically migrated (dev stacks recreate data)
- Operators must learn SeaweedFS ops instead of MinIO Console workflows

## Alternatives considered

| Alternative     | Why not now                                                          |
| --------------- | -------------------------------------------------------------------- |
| Garage          | Strong option, but AGPL; SeaweedFS matches project Apache-2.0 better |
| RustFS          | Still early/alpha for production default                             |
| Ceph RGW        | Too heavy for current milestone footprint                            |
| Keep MinIO fork | Supply-chain / maintenance risk vs. living upstream                  |
