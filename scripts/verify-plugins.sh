#!/usr/bin/env bash
# Verify plugin manifests and createPlugin() factories under plugins/.
# Matches docs/PLUGIN_SDK.md and services/crawler PluginRegistryService contract.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PLUGINS_DIR="${PLUGINS_DIR:-${ROOT_DIR}/plugins}"

if [[ ! -d "${PLUGINS_DIR}" ]]; then
  echo "Plugins directory not found: ${PLUGINS_DIR}" >&2
  exit 1
fi

node --input-type=module <<'EOF'
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pluginsDir = process.env.PLUGINS_DIR;

const requiredMethods = [
  'initialize',
  'discover',
  'fetch',
  'parse',
  'normalize',
  'emit',
  'healthCheck',
];

const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
const pluginDirs = [];
for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const manifestPath = path.join(pluginsDir, entry.name, 'plugin.json');
  try {
    await fs.access(manifestPath);
    pluginDirs.push(entry.name);
  } catch {
    // skip utils/ and other non-plugin dirs
  }
}

if (pluginDirs.length === 0) {
  console.error('No plugin.json directories found under', pluginsDir);
  process.exit(1);
}

const loaded = [];
for (const dirName of pluginDirs.sort()) {
  const pluginDir = path.join(pluginsDir, dirName);
  const manifestPath = path.join(pluginDir, 'plugin.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

  for (const field of ['pluginType', 'name', 'version', 'main']) {
    if (!manifest[field] || typeof manifest[field] !== 'string') {
      throw new Error(`${dirName}/plugin.json missing string field '${field}'`);
    }
  }

  const modulePath = path.resolve(pluginDir, manifest.main);
  const mod = await import(pathToFileURL(modulePath).href);
  const factory = mod.createPlugin ?? mod.default;
  if (typeof factory !== 'function') {
    throw new Error(`${dirName}: expected createPlugin() or default export factory`);
  }

  const plugin = await factory();
  if (!plugin?.metadata?.pluginType) {
    throw new Error(`${dirName}: factory did not return metadata.pluginType`);
  }
  if (plugin.metadata.pluginType !== manifest.pluginType) {
    throw new Error(
      `${dirName}: metadata.pluginType '${plugin.metadata.pluginType}' != manifest '${manifest.pluginType}'`,
    );
  }

  for (const method of requiredMethods) {
    if (typeof plugin[method] !== 'function') {
      throw new Error(`${dirName}: missing lifecycle method ${method}()`);
    }
  }

  const health = await plugin.healthCheck();
  if (!health?.status) {
    throw new Error(`${dirName}: healthCheck() must return { status }`);
  }

  loaded.push(`${manifest.pluginType}@${manifest.version}`);
}

console.log(`Verified ${loaded.length} plugin(s): ${loaded.join(', ')}`);
EOF
