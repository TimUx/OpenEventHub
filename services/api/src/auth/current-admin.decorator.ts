import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AdminJwtPayload } from './admin-jwt.guard.js';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminJwtPayload => {
    const request = context.switchToHttp().getRequest<Request & { admin?: AdminJwtPayload }>();
    if (!request.admin) {
      throw new Error('CurrentAdmin used without AdminJwtAuthGuard');
    }
    return request.admin;
  },
);
