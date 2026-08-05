import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { ReadinessCheckResult } from '@openeventhub/shared';
import request from 'supertest';

import { ServiceRuntimeModule } from './service-runtime.module.js';
import type { ServiceRuntimeModuleOptions } from './service-runtime.options.js';

async function createApp(options: ServiceRuntimeModuleOptions): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [ServiceRuntimeModule.register(options)],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('ServiceRuntimeModule probes', () => {
  let app: INestApplication;

  before(async () => {
    app = await createApp({
      serviceName: 'api',
      version: '0.1.0',
    });
  });

  after(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns an ok health payload', async () => {
      const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/health')
        .expect(200);

      const body = response.body as {
        status: string;
        service: string;
        version: string;
        timestamp: string;
      };

      assert.equal(body.status, 'ok');
      assert.equal(body.service, 'api');
      assert.equal(body.version, '0.1.0');
      assert.ok(Date.parse(body.timestamp));
    });
  });

  describe('GET /ready', () => {
    it('returns ok with default runtime check when no checks are configured', async () => {
      const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/ready')
        .expect(200);

      const body = response.body as ReadinessCheckResult;

      assert.equal(body.status, 'ok');
      assert.equal(body.service, 'api');
      assert.equal(body.version, '0.1.0');
      assert.deepEqual(body.checks, { runtime: 'ok' });
    });
  });

  describe('GET /metrics', () => {
    it('returns Prometheus text exposition with required metrics', async () => {
      const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/metrics')
        .expect(200);

      assert.match(response.headers['content-type'] ?? '', /text\/plain/);
      assert.match(response.text, /^# TYPE process_uptime_seconds gauge/m);
      assert.match(response.text, /^process_uptime_seconds \d+\.\d{3}$/m);
      assert.match(response.text, /^# TYPE process_resident_memory_bytes gauge/m);
      assert.match(response.text, /^process_resident_memory_bytes \d+$/m);
      assert.match(response.text, /^# TYPE nodejs_version_info gauge/m);
      assert.match(response.text, /^nodejs_version_info\{version="/m);
      assert.match(response.text, /^# TYPE oeh_service_info gauge/m);
      assert.match(response.text, /^oeh_service_info\{service="api",version="0\.1\.0"\} 1$/m);
    });
  });
});

describe('ServiceRuntimeModule readiness checks', () => {
  let app: INestApplication;

  before(async () => {
    app = await createApp({
      serviceName: 'worker',
      version: '0.2.0',
      readinessChecks: () =>
        Promise.resolve({
          postgres: 'ok',
          redis: 'degraded',
        }),
    });
  });

  after(async () => {
    await app.close();
  });

  it('aggregates custom readiness checks', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/ready')
      .expect(200);

    const body = response.body as ReadinessCheckResult;

    assert.equal(body.status, 'degraded');
    assert.equal(body.service, 'worker');
    assert.equal(body.version, '0.2.0');
    assert.deepEqual(body.checks, {
      postgres: 'ok',
      redis: 'degraded',
    });
  });

  it('marks readiness error when a check fails', async () => {
    await app.close();

    app = await createApp({
      serviceName: 'worker',
      version: '0.2.0',
      readinessChecks: () =>
        Promise.resolve({
          postgres: 'error',
          redis: 'ok',
        }),
    });

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/ready')
      .expect(200);

    const body = response.body as ReadinessCheckResult;

    assert.equal(body.status, 'error');
    assert.deepEqual(body.checks, {
      postgres: 'error',
      redis: 'ok',
    });
  });
});
