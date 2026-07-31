import type { AiProviderProfile, AiProviderType, PrismaClient } from '@prisma/client';
import {
  apiKeyHint,
  createLlmProvider,
  decryptSecret,
  encryptSecret,
  type AiProviderProfileConfig,
  type LlmProvider,
  requireEncryptionKey,
} from '@openeventhub/ai-core';

export type PublicAiProviderProfile = Omit<AiProviderProfile, 'apiKeyEncrypted'> & {
  hasApiKey: boolean;
};

export class AiSettingsRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly encryptionKey = requireEncryptionKey(),
  ) {}

  async listProfiles(): Promise<PublicAiProviderProfile[]> {
    const rows = await this.prisma.aiProviderProfile.findMany({ orderBy: { name: 'asc' } });
    return rows.map((row) => this.toPublic(row));
  }

  async getProfile(id: string): Promise<AiProviderProfile | null> {
    return this.prisma.aiProviderProfile.findUnique({ where: { id } });
  }

  async createProfile(input: {
    name: string;
    type: AiProviderType;
    baseUrl?: string | null;
    apiKey?: string | null;
    model: string;
    organizationId?: string | null;
    projectId?: string | null;
    extraHeaders?: Record<string, string>;
    timeoutMs?: number;
    enabled?: boolean;
  }): Promise<PublicAiProviderProfile> {
    const apiKey = input.apiKey?.trim() || null;
    const row = await this.prisma.aiProviderProfile.create({
      data: {
        name: input.name,
        type: input.type,
        baseUrl: input.baseUrl ?? null,
        apiKeyEncrypted: apiKey ? encryptSecret(apiKey, this.encryptionKey) : null,
        apiKeyHint: apiKey ? apiKeyHint(apiKey) : null,
        model: input.model,
        organizationId: input.organizationId ?? null,
        projectId: input.projectId ?? null,
        extraHeaders: input.extraHeaders ?? {},
        timeoutMs: input.timeoutMs ?? 60_000,
        enabled: input.enabled ?? true,
      },
    });
    return this.toPublic(row);
  }

  async updateProfile(
    id: string,
    input: {
      name?: string;
      baseUrl?: string | null;
      apiKey?: string | null;
      model?: string;
      organizationId?: string | null;
      projectId?: string | null;
      extraHeaders?: Record<string, string>;
      timeoutMs?: number;
      enabled?: boolean;
    },
  ): Promise<PublicAiProviderProfile> {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.baseUrl !== undefined) data.baseUrl = input.baseUrl;
    if (input.model !== undefined) data.model = input.model;
    if (input.organizationId !== undefined) data.organizationId = input.organizationId;
    if (input.projectId !== undefined) data.projectId = input.projectId;
    if (input.extraHeaders !== undefined) data.extraHeaders = input.extraHeaders;
    if (input.timeoutMs !== undefined) data.timeoutMs = input.timeoutMs;
    if (input.enabled !== undefined) data.enabled = input.enabled;
    if (input.apiKey !== undefined) {
      const apiKey = input.apiKey?.trim() || null;
      data.apiKeyEncrypted = apiKey ? encryptSecret(apiKey, this.encryptionKey) : null;
      data.apiKeyHint = apiKey ? apiKeyHint(apiKey) : null;
    }

    const row = await this.prisma.aiProviderProfile.update({ where: { id }, data });
    return this.toPublic(row);
  }

  async deleteProfile(id: string): Promise<void> {
    await this.prisma.aiProviderProfile.delete({ where: { id } });
  }

  async getRuntimeSettings() {
    return this.prisma.aiRuntimeSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton' },
      update: {},
      include: { activeProviderProfile: true },
    });
  }

  async setActiveProfile(profileId: string | null) {
    return this.prisma.aiRuntimeSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', activeProviderProfileId: profileId },
      update: { activeProviderProfileId: profileId },
      include: { activeProviderProfile: true },
    });
  }

  toProviderConfig(row: AiProviderProfile): AiProviderProfileConfig {
    const headers = asStringRecord(row.extraHeaders);
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      baseUrl: row.baseUrl,
      apiKey: row.apiKeyEncrypted
        ? decryptSecret(row.apiKeyEncrypted, this.encryptionKey)
        : null,
      model: row.model,
      organizationId: row.organizationId,
      projectId: row.projectId,
      extraHeaders: headers,
      timeoutMs: row.timeoutMs,
    };
  }

  async resolveActiveLlmProvider(): Promise<{ provider: LlmProvider; profile: AiProviderProfile }> {
    const settings = await this.getRuntimeSettings();
    if (!settings.activeProviderProfile || !settings.activeProviderProfile.enabled) {
      throw new Error('No active AI provider configured in Admin → AI Settings');
    }
    const config = this.toProviderConfig(settings.activeProviderProfile);
    return {
      provider: createLlmProvider(config),
      profile: settings.activeProviderProfile,
    };
  }

  private toPublic(row: AiProviderProfile): PublicAiProviderProfile {
    const { apiKeyEncrypted: _, ...rest } = row;
    return {
      ...rest,
      hasApiKey: Boolean(row.apiKeyEncrypted),
    };
  }
}

function asStringRecord(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      result[key] = entry;
    }
  }
  return result;
}
