-- Category import allowlist: operator-selected category roots for ingest filtering
CREATE TABLE "category_import_allowlist" (
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_import_allowlist_pkey" PRIMARY KEY ("category_id")
);

ALTER TABLE "category_import_allowlist"
  ADD CONSTRAINT "category_import_allowlist_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
