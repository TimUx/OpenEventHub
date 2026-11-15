import { defineConfig } from 'prisma/config';

// Prisma 7 no longer reads .env files; DATABASE_URL comes from the environment
// (Compose, Stack secrets, scripts/db-*.sh). The fallback only lets `prisma generate`
// and `prisma validate` run without a database.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://openeventhub@localhost:5432/openeventhub',
  },
});
