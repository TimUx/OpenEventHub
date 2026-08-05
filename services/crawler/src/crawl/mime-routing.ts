/** MIME helpers for crawl → OCR vs AI routing. */

const OCR_MIME_PREFIXES = ['image/'] as const;
const OCR_MIME_EXACT = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/tiff',
  'image/tif',
]);

export function normalizeMimeType(mimeType: string): string {
  return mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
}

export function requiresOcr(mimeType: string): boolean {
  const mime = normalizeMimeType(mimeType);
  if (OCR_MIME_EXACT.has(mime)) {
    return true;
  }
  return OCR_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}
