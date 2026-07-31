-- Admin users + AI provider profiles managed in Admin Center (ADR 0006)

CREATE TYPE "AiProviderType" AS ENUM ('openai', 'anthropic', 'google', 'azure_openai', 'openrouter', 'ollama', 'custom_openai');
CREATE TYPE "AdminRole" AS ENUM ('admin', 'moderator', 'viewer');

CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

CREATE TABLE "ai_provider_profiles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AiProviderType" NOT NULL,
    "base_url" TEXT,
    "api_key_encrypted" TEXT,
    "api_key_hint" TEXT,
    "model" TEXT NOT NULL,
    "organization_id" TEXT,
    "project_id" TEXT,
    "extra_headers" JSONB NOT NULL DEFAULT '{}',
    "timeout_ms" INTEGER NOT NULL DEFAULT 60000,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_provider_profiles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_provider_profiles_type_idx" ON "ai_provider_profiles"("type");
CREATE INDEX "ai_provider_profiles_enabled_idx" ON "ai_provider_profiles"("enabled");

CREATE TABLE "ai_runtime_settings" (
    "id" TEXT NOT NULL,
    "active_provider_profile_id" UUID,
    "default_temperature" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_runtime_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_runtime_settings_active_provider_profile_id_key" ON "ai_runtime_settings"("active_provider_profile_id");

ALTER TABLE "ai_runtime_settings" ADD CONSTRAINT "ai_runtime_settings_active_provider_profile_id_fkey" FOREIGN KEY ("active_provider_profile_id") REFERENCES "ai_provider_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ai_runtime_settings" ("id", "active_provider_profile_id", "default_temperature", "updated_at")
VALUES ('singleton', NULL, 0, CURRENT_TIMESTAMP);
