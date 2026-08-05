import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import { MetricsRegistry } from './metrics-registry.js';

describe('MetricsRegistry', () => {
  let registry: MetricsRegistry;

  beforeEach(() => {
    registry = new MetricsRegistry();
  });

  it('renders counters and gauges', () => {
    registry.incrementCounter('oeh_failed_imports_total', { plugin: 'rss' });
    registry.setGauge('oeh_queue_length', { queue: 'crawl' }, 3);

    const text = registry.render();
    assert.match(text, /oeh_failed_imports_total\{plugin="rss"\} 1/);
    assert.match(text, /oeh_queue_length\{queue="crawl"\} 3/);
  });

  it('renders HTTP histogram series', () => {
    registry.observeHttpRequest('GET', '/api/v1/events', 200, 0.12);
    const text = registry.render();
    assert.match(
      text,
      /oeh_http_requests_total\{method="GET",route="\/api\/v1\/events",status="200"\} 1/,
    );
    assert.match(text, /oeh_http_request_duration_seconds_count\{/);
    assert.match(text, /oeh_http_request_duration_seconds_sum\{/);
  });
});
