import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function mimeTypeFromUrl(url) {
  const ext = path.extname(url.split('?')[0]?.toLowerCase() ?? '');
  switch (ext) {
    case '.html':
    case '.htm':
      return 'text/html; charset=utf-8';
    case '.rss':
      return 'application/rss+xml; charset=utf-8';
    case '.xml':
      return 'application/xml; charset=utf-8';
    case '.ics':
      return 'text/calendar; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

export async function fetchUrlToBuffer(sourceUrl) {
  if (sourceUrl.startsWith('file://')) {
    const filePath = fileURLToPath(sourceUrl);
    const content = await fs.readFile(filePath);
    return { content, mimeType: mimeTypeFromUrl(sourceUrl) };
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${sourceUrl}: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const content = Buffer.from(arrayBuffer);
  const mimeType = response.headers.get('content-type') ?? mimeTypeFromUrl(sourceUrl);
  return { content, mimeType };
}
