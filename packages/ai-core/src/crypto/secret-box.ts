import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const PREFIX = 'oeh-v1';

export function deriveSettingsKey(secret: string): Buffer {
  return scryptSync(secret, 'openeventhub-settings', 32);
}

export function encryptSecret(plaintext: string, encryptionKey: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptSecret(payload: string, encryptionKey: Buffer): string {
  const [prefix, ivB64, tagB64, dataB64] = payload.split(':');
  if (prefix !== PREFIX || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted secret payload');
  }
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function apiKeyHint(apiKey: string): string {
  if (apiKey.length <= 4) {
    return '****';
  }
  return `****${apiKey.slice(-4)}`;
}

export function requireEncryptionKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const secret = env.SETTINGS_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error('SETTINGS_ENCRYPTION_KEY must be set (min 16 characters)');
  }
  return deriveSettingsKey(secret);
}
