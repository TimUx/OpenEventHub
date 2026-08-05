import { escapePrometheusLabel } from '../prometheus.js';

type LabelMap = Readonly<Record<string, string>>;

function labelsKey(labels: LabelMap): string {
  return Object.keys(labels)
    .sort()
    .map((k) => `${k}=${labels[k]}`)
    .join(',');
}

function formatLabels(labels: LabelMap): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) {
    return '';
  }
  return `{${keys.map((k) => `${k}="${escapePrometheusLabel(labels[k] ?? '')}"`).join(',')}}`;
}

/**
 * In-process Prometheus text metrics for OpenEventHub Nest services.
 * Process-local only (not aggregated across replicas).
 */
export class MetricsRegistry {
  private readonly counters = new Map<string, Map<string, number>>();
  private readonly gauges = new Map<string, Map<string, number>>();
  private readonly histogramSums = new Map<string, Map<string, { count: number; sum: number }>>();

  /** Default HTTP latency buckets (seconds). */
  static readonly HTTP_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] as const;

  incrementCounter(name: string, labels: LabelMap = {}, amount = 1): void {
    const byLabels = this.counters.get(name) ?? new Map<string, number>();
    const key = labelsKey(labels);
    byLabels.set(key, (byLabels.get(key) ?? 0) + amount);
    this.counters.set(name, byLabels);
    this.rememberLabels(name, 'counter', labels);
  }

  setGauge(name: string, labels: LabelMap, value: number): void {
    const byLabels = this.gauges.get(name) ?? new Map<string, number>();
    byLabels.set(labelsKey(labels), value);
    this.gauges.set(name, byLabels);
    this.rememberLabels(name, 'gauge', labels);
  }

  observeHistogram(name: string, labels: LabelMap, valueSeconds: number): void {
    const byLabels = this.histogramSums.get(name) ?? new Map();
    const key = labelsKey(labels);
    const current = byLabels.get(key) ?? { count: 0, sum: 0 };
    byLabels.set(key, { count: current.count + 1, sum: current.sum + valueSeconds });
    this.histogramSums.set(name, byLabels);
    this.rememberLabels(name, 'histogram', labels);

    for (const bound of MetricsRegistry.HTTP_BUCKETS) {
      if (valueSeconds <= bound) {
        this.incrementCounter(`${name}_bucket`, { ...labels, le: String(bound) });
      }
    }
    this.incrementCounter(`${name}_bucket`, { ...labels, le: '+Inf' });
  }

  observeHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    const labels = {
      method: method.toUpperCase(),
      route,
      status: String(statusCode),
    };
    this.incrementCounter('oeh_http_requests_total', labels);
    this.observeHistogram('oeh_http_request_duration_seconds', labels, durationSeconds);
  }

  private readonly meta = new Map<string, { type: string; labelSets: LabelMap[] }>();

  private rememberLabels(name: string, type: string, labels: LabelMap): void {
    const existing = this.meta.get(name) ?? { type, labelSets: [] };
    existing.type = type;
    const key = labelsKey(labels);
    if (!existing.labelSets.some((l) => labelsKey(l) === key)) {
      existing.labelSets.push(labels);
    }
    this.meta.set(name, existing);
  }

  render(): string {
    const lines: string[] = [];

    for (const [name, byLabels] of this.counters) {
      if (name.endsWith('_bucket')) {
        continue;
      }
      lines.push(`# HELP ${name} OpenEventHub counter.`);
      lines.push(`# TYPE ${name} counter`);
      for (const [key, value] of byLabels) {
        const labels = this.labelsFromKey(name, key);
        lines.push(`${name}${formatLabels(labels)} ${value}`);
      }
    }

    for (const [name, byLabels] of this.gauges) {
      lines.push(`# HELP ${name} OpenEventHub gauge.`);
      lines.push(`# TYPE ${name} gauge`);
      for (const [key, value] of byLabels) {
        const labels = this.labelsFromKey(name, key);
        lines.push(`${name}${formatLabels(labels)} ${value}`);
      }
    }

    for (const [name, byLabels] of this.histogramSums) {
      lines.push(`# HELP ${name} OpenEventHub histogram (seconds).`);
      lines.push(`# TYPE ${name} histogram`);
      const bucketCounter = this.counters.get(`${name}_bucket`);
      for (const [key, { count, sum }] of byLabels) {
        const labels = this.labelsFromKey(name, key);
        if (bucketCounter) {
          for (const bound of [...MetricsRegistry.HTTP_BUCKETS, '+Inf']) {
            const bKey = labelsKey({ ...labels, le: String(bound) });
            const bucketVal = bucketCounter.get(bKey) ?? 0;
            lines.push(
              `${name}_bucket${formatLabels({ ...labels, le: String(bound) })} ${bucketVal}`,
            );
          }
        }
        lines.push(`${name}_sum${formatLabels(labels)} ${sum.toFixed(6)}`);
        lines.push(`${name}_count${formatLabels(labels)} ${count}`);
      }
    }

    return lines.length > 0 ? `${lines.join('\n')}\n` : '';
  }

  private labelsFromKey(name: string, key: string): LabelMap {
    const meta = this.meta.get(name);
    if (!meta) {
      return {};
    }
    return meta.labelSets.find((l) => labelsKey(l) === key) ?? {};
  }

  /** Test helper — clear all series. */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histogramSums.clear();
    this.meta.clear();
  }
}

export const metricsRegistry = new MetricsRegistry();
