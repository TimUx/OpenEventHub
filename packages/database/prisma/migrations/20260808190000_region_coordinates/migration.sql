-- Persist coordinates on regions (Nominatim / geocoding pipeline).
ALTER TABLE "regions"
  ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10,7);
