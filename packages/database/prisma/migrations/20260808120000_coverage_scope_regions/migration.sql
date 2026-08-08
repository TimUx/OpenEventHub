-- Coverage scope: operator-selected region roots for ingest filtering
CREATE TABLE "coverage_scope_regions" (
    "region_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coverage_scope_regions_pkey" PRIMARY KEY ("region_id")
);

ALTER TABLE "coverage_scope_regions"
  ADD CONSTRAINT "coverage_scope_regions_region_id_fkey"
  FOREIGN KEY ("region_id") REFERENCES "regions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
