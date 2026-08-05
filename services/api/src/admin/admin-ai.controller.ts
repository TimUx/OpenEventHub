import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createLlmProvider,
  defaultBaseUrlForType,
  defaultModelForType,
  type AiProviderTypeName,
} from '@openeventhub/ai-core';
import { AdminRole, AiProviderType, AiSettingsRepository } from '@openeventhub/database';

import { AdminJwtAuthGuard } from '../auth/admin-jwt.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

@ApiTags('admin-ai')
@ApiBearerAuth()
@Controller('api/v1/admin/ai')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin, AdminRole.moderator)
export class AdminAiController {
  constructor(private readonly settings: AiSettingsRepository) {}

  @Get('providers')
  listProviders() {
    return this.settings.listProfiles();
  }

  @Get('providers/catalog')
  catalog() {
    const types: AiProviderTypeName[] = [
      'openai',
      'anthropic',
      'google',
      'azure_openai',
      'openrouter',
      'ollama',
      'custom_openai',
    ];
    return types.map((type) => ({
      type,
      defaultBaseUrl: defaultBaseUrlForType(type),
      defaultModel: defaultModelForType(type),
      requiresApiKey: type !== 'ollama',
      label: labelFor(type),
    }));
  }

  @Post('providers')
  createProvider(
    @Body()
    body: {
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
    },
  ) {
    return this.settings.createProfile(body);
  }

  @Patch('providers/:id')
  updateProvider(
    @Param('id') id: string,
    @Body()
    body: {
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
  ) {
    return this.settings.updateProfile(id, body);
  }

  @Delete('providers/:id')
  @HttpCode(204)
  async deleteProvider(@Param('id') id: string): Promise<void> {
    await this.settings.deleteProfile(id);
  }

  @Get('settings')
  async getSettings() {
    const settings = await this.settings.getRuntimeSettings();
    return {
      activeProviderProfileId: settings.activeProviderProfileId,
      defaultTemperature: Number(settings.defaultTemperature),
      activeProvider: settings.activeProviderProfile
        ? {
            id: settings.activeProviderProfile.id,
            name: settings.activeProviderProfile.name,
            type: settings.activeProviderProfile.type,
            model: settings.activeProviderProfile.model,
            enabled: settings.activeProviderProfile.enabled,
            hasApiKey: Boolean(settings.activeProviderProfile.apiKeyEncrypted),
          }
        : null,
    };
  }

  @Put('settings')
  async updateSettings(@Body() body: { activeProviderProfileId?: string | null }) {
    const settings = await this.settings.setActiveProfile(body.activeProviderProfileId ?? null);
    return {
      activeProviderProfileId: settings.activeProviderProfileId,
      defaultTemperature: Number(settings.defaultTemperature),
    };
  }

  @Post('providers/:id/test')
  async testProvider(@Param('id') id: string) {
    const row = await this.settings.getProfile(id);
    if (!row) {
      throw new NotFoundException('Provider profile not found');
    }
    const config = this.settings.toProviderConfig(row);
    const provider = createLlmProvider(config);
    const result = await provider.completeChat({
      temperature: 0,
      messages: [
        { role: 'system', content: 'Reply with the single word pong.' },
        { role: 'user', content: 'ping' },
      ],
    });
    return {
      ok: true,
      provider: result.provider,
      model: result.model,
      sample: result.content.slice(0, 200),
    };
  }
}

function labelFor(type: AiProviderTypeName): string {
  switch (type) {
    case 'openai':
      return 'OpenAI (ChatGPT)';
    case 'anthropic':
      return 'Anthropic (Claude)';
    case 'google':
      return 'Google (Gemini)';
    case 'azure_openai':
      return 'Azure OpenAI';
    case 'openrouter':
      return 'OpenRouter';
    case 'ollama':
      return 'Ollama (local)';
    case 'custom_openai':
      return 'Custom OpenAI-compatible';
  }
}
