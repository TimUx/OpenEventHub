import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CrawlPlugin, PluginManifest } from './plugin-types.js';

describe('@openeventhub/plugin-sdk smoke', () => {
  it('exposes plugin contract shapes usable by connectors', () => {
    const manifest: PluginManifest = {
      pluginType: 'rss',
      name: 'RSS Feed Plugin',
      version: '1.0.0',
      main: './index.js',
    };
    assert.equal(manifest.pluginType, 'rss');

    const plugin = {
      metadata: { pluginType: 'rss', name: 'RSS', version: '1.0.0' },
    } as Pick<CrawlPlugin, 'metadata'>;
    assert.equal(plugin.metadata.pluginType, 'rss');
  });
});
