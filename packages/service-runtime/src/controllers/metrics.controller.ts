import { Controller, Get, Header, Inject } from '@nestjs/common';

import { escapePrometheusLabel, formatNodeVersionInfo } from '../prometheus.js';
import {
  SERVICE_RUNTIME_OPTIONS,
  type ServiceRuntimeModuleOptions,
} from '../service-runtime.options.js';

@Controller()
export class MetricsController {
  private readonly startTimeMs = Date.now();

  constructor(
    @Inject(SERVICE_RUNTIME_OPTIONS)
    private readonly options: ServiceRuntimeModuleOptions,
  ) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  getMetrics(): string {
    const uptimeSeconds = (Date.now() - this.startTimeMs) / 1000;
    const service = escapePrometheusLabel(this.options.serviceName);
    const version = escapePrometheusLabel(this.options.version);

    return [
      '# HELP process_uptime_seconds Uptime of the process in seconds.',
      '# TYPE process_uptime_seconds gauge',
      `process_uptime_seconds ${uptimeSeconds.toFixed(3)}`,
      '# HELP nodejs_version_info Node.js version info.',
      '# TYPE nodejs_version_info gauge',
      formatNodeVersionInfo(process.version),
      '# HELP oeh_service_info OpenEventHub service identity.',
      '# TYPE oeh_service_info gauge',
      `oeh_service_info{service="${service}",version="${version}"} 1`,
      '',
    ].join('\n');
  }
}
