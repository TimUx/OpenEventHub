#!/usr/bin/env bash
# Scaffold M2 NestJS service shells from a single template.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="0.1.0"

# name|port|checks (comma-separated: postgres,redis,object-storage,runtime)
SERVICES=(
  "api|3000|postgres,redis"
  "scheduler|3001|postgres,redis"
  "worker|3002|redis"
  "crawler|3003|redis,object-storage"
  "ai-service|3004|redis"
  "ocr-service|3005|redis,object-storage"
  "search|3006|postgres,redis"
)

create_service() {
  local name="$1"
  local port="$2"
  local checks="$3"
  local dir="${ROOT_DIR}/services/${name}"
  local pkg_name="@openeventhub/${name}"

  mkdir -p "${dir}/src"

  cat > "${dir}/package.json" <<EOF
{
  "name": "${pkg_name}",
  "version": "${VERSION}",
  "private": true,
  "description": "OpenEventHub ${name} service shell",
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js",
    "start:dev": "tsx watch src/main.ts",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "node --import tsx --import reflect-metadata --test src/**/*.test.ts"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.12",
    "@nestjs/core": "^11.0.12",
    "@nestjs/platform-express": "^11.0.12",
    "@openeventhub/service-runtime": "${VERSION}",
    "@openeventhub/shared": "${VERSION}",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.2"
  },
  "devDependencies": {
    "@nestjs/testing": "^11.0.12",
    "@types/express": "^5.0.1",
    "@types/supertest": "^6.0.3",
    "supertest": "^7.1.0",
    "tsx": "^4.19.3"
  }
}
EOF

  cat > "${dir}/tsconfig.json" <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts", "dist", "node_modules"],
  "references": [
    { "path": "../../packages/shared" },
    { "path": "../../packages/service-runtime" }
  ]
}
EOF

  # Build readiness checks source snippet
  local check_entries=""
  IFS=',' read -ra CHECK_ARR <<< "${checks}"
  for check in "${CHECK_ARR[@]}"; do
    case "${check}" in
      postgres)
        check_entries+="    postgres: await probeTcp(process.env.POSTGRES_HOST ?? 'postgres', Number(process.env.POSTGRES_PORT_INTERNAL ?? 5432)),"$'\n'
        ;;
      redis)
        check_entries+="    redis: await probeTcp(process.env.REDIS_HOST ?? 'redis', Number(process.env.REDIS_PORT_INTERNAL ?? 6379)),"$'\n'
        ;;
      object-storage)
        check_entries+="    objectStorage: await probeTcp(process.env.OBJECT_STORAGE_HOST ?? 'object-storage', Number(process.env.OBJECT_STORAGE_PORT_INTERNAL ?? 8333)),"$'
'
        ;;
      runtime)
        check_entries+="    runtime: 'ok',"$'\n'
        ;;
    esac
  done

  cat > "${dir}/src/probe-tcp.ts" <<'EOF'
import net from 'node:net';

import type { HealthStatus } from '@openeventhub/shared';

export async function probeTcp(host: string, port: number, timeoutMs = 2000): Promise<HealthStatus> {
  return await new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (status: HealthStatus) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(status);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish('ok'));
    socket.once('timeout', () => finish('error'));
    socket.once('error', () => finish('error'));
    socket.connect(port, host);
  });
}
EOF

  cat > "${dir}/src/app.module.ts" <<EOF
import { Module } from '@nestjs/common';
import { ServiceRuntimeModule } from '@openeventhub/service-runtime';

import { probeTcp } from './probe-tcp.js';

const SERVICE_NAME = '${name}';
const SERVICE_VERSION = process.env.SERVICE_VERSION ?? '${VERSION}';

@Module({
  imports: [
    ServiceRuntimeModule.register({
      serviceName: SERVICE_NAME,
      version: SERVICE_VERSION,
      readinessChecks: async () => ({
${check_entries}      }),
    }),
  ],
})
export class AppModule {}
EOF

  cat > "${dir}/src/main.ts" <<EOF
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { createLogger } from '@openeventhub/service-runtime';

import { AppModule } from './app.module.js';

const SERVICE_NAME = '${name}';
const PORT = Number(process.env.PORT ?? ${port});

async function bootstrap(): Promise<void> {
  const logger = createLogger(SERVICE_NAME);
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  await app.listen(PORT);
  logger.info({ port: PORT }, '${name} service listening');
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
EOF

  cat > "${dir}/src/probes.test.ts" <<EOF
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './app.module.js';

describe('${name} probes', () => {
  let app: INestApplication;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it('GET /health returns service identity', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/health')
      .expect(200);
    assert.equal(response.body.service, '${name}');
    assert.equal(response.body.status, 'ok');
  });

  it('GET /metrics exposes prometheus text', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/metrics')
      .expect(200);
    assert.match(response.text, /oeh_service_info/);
  });
});
EOF

  cat > "${dir}/Dockerfile" <<EOF
# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:22-bookworm-slim
FROM \${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
COPY packages ./packages
COPY services/${name} ./services/${name}
RUN npm ci
RUN npm run build --workspace=@openeventhub/shared \\
  && npm run build --workspace=@openeventhub/service-runtime \\
  && npm run build --workspace=${pkg_name}

FROM \${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${port}
RUN useradd --create-home --uid 10001 oeh
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/services/${name} ./services/${name}
USER oeh
WORKDIR /app/services/${name}
EXPOSE ${port}
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=20s \\
  CMD node -e "fetch('http://127.0.0.1:${port}/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
EOF

  cat > "${dir}/README.md" <<EOF
# ${name}

OpenEventHub \`${name}\` service container.

- Runtime: NestJS + \`@openeventhub/service-runtime\`
- Probes: \`/health\`, \`/ready\`, \`/metrics\`
- Default port: \`${port}\`

Domain features arrive in later milestones.
EOF
}

for entry in "${SERVICES[@]}"; do
  IFS='|' read -r name port checks <<< "${entry}"
  echo "Scaffolding ${name}..."
  create_service "${name}" "${port}" "${checks}"
done

echo "Done."
