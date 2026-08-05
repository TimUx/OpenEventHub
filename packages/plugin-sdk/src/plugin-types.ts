import type { ExtractedEventFields, HealthStatus } from '@openeventhub/shared';

export interface PluginMetadata {
  readonly pluginType: string;
  readonly name: string;
  readonly version: string;
}

export interface PluginInitializeContext {
  readonly pluginType: string;
  readonly sourceConfig: unknown;
}

export interface DiscoveryResult {
  readonly urls: readonly string[];
}

export interface FetchResult {
  readonly content: Buffer;
  readonly mimeType: string;
}

export interface ParseResult {
  // Plugin-specific intermediate representation.
  readonly payload: unknown;
}

export interface NormalizeResult {
  readonly events: readonly ExtractedEventFields[];
}

export interface PluginContext {
  readonly pluginType: string;
  readonly sourceUrl: string;
  readonly sourceConfig: unknown;
  readonly crawlJobId: string;
}

export interface PluginHealthResult {
  readonly status: HealthStatus;
  readonly details?: Record<string, unknown>;
}

export interface CrawlPlugin {
  readonly metadata: PluginMetadata;

  discover(context: PluginContext): Promise<DiscoveryResult>;
  fetch(context: PluginContext): Promise<FetchResult>;
  parse(fetchResult: FetchResult): Promise<ParseResult>;
  normalize(parseResult: ParseResult): Promise<NormalizeResult>;
  emit(normalized: NormalizeResult): Promise<readonly ExtractedEventFields[]>;

  initialize(context: PluginInitializeContext): Promise<void>;
  healthCheck(): Promise<PluginHealthResult>;
}

export interface PluginManifest {
  readonly pluginType: string;
  readonly version: string;
  readonly name: string;
  /**
   * Relative path to the plugin module entrypoint (ESM).
   * Loaded by the worker via dynamic `import()`.
   */
  readonly main: string;
}

