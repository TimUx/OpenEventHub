import { Module, type DynamicModule } from '@nestjs/common';

import { HealthController } from './controllers/health.controller.js';
import { MetricsController } from './controllers/metrics.controller.js';
import { ReadinessController } from './controllers/readiness.controller.js';
import {
  SERVICE_RUNTIME_OPTIONS,
  type ServiceRuntimeModuleOptions,
} from './service-runtime.options.js';

@Module({})
export class ServiceRuntimeModule {
  static register(options: ServiceRuntimeModuleOptions): DynamicModule {
    return {
      module: ServiceRuntimeModule,
      controllers: [HealthController, ReadinessController, MetricsController],
      providers: [
        {
          provide: SERVICE_RUNTIME_OPTIONS,
          useValue: options,
        },
      ],
    };
  }
}
