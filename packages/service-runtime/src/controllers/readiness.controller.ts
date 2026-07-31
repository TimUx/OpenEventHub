import { Controller, Get, Inject } from '@nestjs/common';
import { createReadinessResult } from '@openeventhub/shared';

import {
  SERVICE_RUNTIME_OPTIONS,
  type ServiceRuntimeModuleOptions,
} from '../service-runtime.options.js';

const DEFAULT_READINESS_CHECKS = { runtime: 'ok' } as const;

@Controller()
export class ReadinessController {
  constructor(
    @Inject(SERVICE_RUNTIME_OPTIONS)
    private readonly options: ServiceRuntimeModuleOptions,
  ) {}

  @Get('ready')
  async getReady() {
    const checks = this.options.readinessChecks
      ? await this.options.readinessChecks()
      : DEFAULT_READINESS_CHECKS;

    return createReadinessResult(this.options.serviceName, this.options.version, checks);
  }
}
