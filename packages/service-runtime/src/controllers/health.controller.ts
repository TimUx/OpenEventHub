import { Controller, Get, Inject } from '@nestjs/common';
import { createHealthResult } from '@openeventhub/shared';

import {
  SERVICE_RUNTIME_OPTIONS,
  type ServiceRuntimeModuleOptions,
} from '../service-runtime.options.js';

@Controller()
export class HealthController {
  constructor(
    @Inject(SERVICE_RUNTIME_OPTIONS)
    private readonly options: ServiceRuntimeModuleOptions,
  ) {}

  @Get('health')
  getHealth() {
    return createHealthResult(this.options.serviceName, this.options.version);
  }
}
