import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ServiceRuntimeModule } from '@openeventhub/service-runtime';
import request from 'supertest';

describe('api probes', () => {
  let app: INestApplication;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ServiceRuntimeModule.register({
          serviceName: 'api',
          version: '0.4.1',
        }),
      ],
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
    const body = response.body as { service: string; status: string };
    assert.equal(body.service, 'api');
    assert.equal(body.status, 'ok');
  });
});
