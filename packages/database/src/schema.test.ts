import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('prisma schema', () => {
  it('validates against the Prisma schema grammar', () => {
    execSync('npx prisma validate', {
      cwd: packageRoot,
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL:
          process.env.DATABASE_URL ??
          'postgresql://openeventhub:openeventhub_change_me@localhost:15432/openeventhub',
      },
    });
  });
});
