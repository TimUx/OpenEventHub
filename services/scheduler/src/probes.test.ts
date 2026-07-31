import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './app.module.js';

interface HealthBody {
  service: string;
  status: string;
}

describe('scheduler probes', () => {
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
    const body = response.body as HealthBody;
    assert.equal(body.service, 'scheduler');
    assert.equal(body.status, 'ok');
  });

  it('GET /metrics exposes prometheus text', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/metrics')
      .expect(200);
    assert.match(response.text, /oeh_service_info/);
  });
});
