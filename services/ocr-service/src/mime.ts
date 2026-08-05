const SUPPORTED = new Set([
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

export function assertSupportedOcrMime(mimeType: string): string {
  const mime = normalizeMimeType(mimeType);
  if (!SUPPORTED.has(mime) && !mime.startsWith('image/')) {
    throw new Error(`OCR file validation failed: unsupported mime type '${mimeType}'`);
  }
  return mime;
}
