import { Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import { metricsRegistry } from './metrics-registry.js';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const started = process.hrtime.bigint();
    const path = request.path || request.url?.split('?')[0] || 'unknown';

    // Skip probe noise for cardinality; still count business routes.
    if (path === '/health' || path === '/ready' || path === '/metrics') {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const durationNs = Number(process.hrtime.bigint() - started);
          metricsRegistry.observeHttpRequest(
            request.method,
            path,
            response.statusCode || 200,
            durationNs / 1e9,
          );
        },
        error: () => {
          const durationNs = Number(process.hrtime.bigint() - started);
          metricsRegistry.observeHttpRequest(
            request.method,
            path,
            response.statusCode || 500,
            durationNs / 1e9,
          );
        },
      }),
    );
  }
}
