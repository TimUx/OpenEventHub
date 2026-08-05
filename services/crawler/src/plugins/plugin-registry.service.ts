import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { CrawlPlugin, PluginManifest } from '@openeventhub/plugin-sdk';
import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';

const SERVICE_NAME = 'crawler';

function resolvePluginsRoot(): string {
  if (process.env.PLUGINS_DIR) return process.env.PLUGINS_DIR;

  // Candidate locations across dev/test/container.
  const candidates = [
    path.resolve(process.cwd(), 'plugins'),
    path.resolve(process.cwd(), '../../plugins'),
    path.resolve(process.cwd(), '../plugins'),
  ];

  // When executed from compiled dist: .../services/crawler/dist/plugins/...
  const here = path.dirname(fileURLToPath(import.meta.url));
  candidates.push(path.resolve(here, '../../../../plugins'));

  for (const candidate of candidates) {
    if (fsSyncExistsDir(candidate)) return candidate;
  }

  // Fall back: the default should still error with a clear message later.
  const fallback = candidates[0];
  if (!fallback) {
    throw new Error('No plugin directory candidates configured');
  }
  return fallback;
}

function fsSyncExistsDir(p: string): boolean {
  try {
    return fsSync.existsSync(p);
  } catch {
    return false;
  }
}

async function loadPluginFromManifest(
  pluginsRoot: string,
  pluginDirName: string,
): Promise<CrawlPlugin> {
  const pluginDir = path.join(pluginsRoot, pluginDirName);
  const manifestPath = path.join(pluginDir, 'plugin.json');
  const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestRaw) as PluginManifest;

  const modulePath = path.resolve(pluginDir, manifest.main);
  const moduleUrl = pathToFileURL(modulePath).href;

  const mod = (await import(moduleUrl)) as {
    createPlugin?: () => CrawlPlugin | Promise<CrawlPlugin>;
    default?: () => CrawlPlugin | Promise<CrawlPlugin>;
  };
  const factory = mod.createPlugin ?? mod.default;
  if (typeof factory !== 'function') {
    throw new Error(
      `Plugin ${manifest.pluginType} at ${modulePath} does not export createPlugin()`,
    );
  }

  const plugin = await factory();
  if (!plugin?.metadata?.pluginType) {
    throw new Error(`Plugin ${manifest.pluginType} did not expose metadata.pluginType`);
  }
  return plugin;
}

@Injectable()
export class PluginRegistryService implements OnModuleInit {
  private readonly logger = new Logger(`${SERVICE_NAME}:plugin-registry`);
  private readonly pluginsByType = new Map<string, CrawlPlugin>();

  getPlugin(pluginType: string): CrawlPlugin {
    const plugin = this.pluginsByType.get(pluginType);
    if (!plugin) {
      throw new Error(`No crawler plugin registered for pluginType='${pluginType}'`);
    }
    return plugin;
  }

  async onModuleInit(): Promise<void> {
    const pluginsRoot = resolvePluginsRoot();
    await this.loadAllPlugins(pluginsRoot);
  }

  private async loadAllPlugins(pluginsRoot: string): Promise<void> {
    const entries = await fs.readdir(pluginsRoot, { withFileTypes: true });
    const pluginDirNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    for (const dirName of pluginDirNames) {
      const manifestPath = path.join(pluginsRoot, dirName, 'plugin.json');
      try {
        // Ensure the manifest exists before attempting to import.
        await fs.access(manifestPath);
        const plugin = await loadPluginFromManifest(pluginsRoot, dirName);
        this.pluginsByType.set(plugin.metadata.pluginType, plugin);
      } catch (err) {
        const code = (err as { code?: string } | undefined)?.code;
        if (code === 'ENOENT') {
          // Ignore non-plugin helper folders.
          continue;
        }
        // Helpful debugging: plugin folders might exist but fail to import/parse.
        this.logger.warn(
          { err },
          `Failed to load plugin '${dirName}' (manifestPath=${manifestPath})`,
        );
      }
    }

    this.logger.log(
      `Loaded ${this.pluginsByType.size} crawler plugin(s): ${[...this.pluginsByType.keys()].join(', ')}`,
    );
  }
}
