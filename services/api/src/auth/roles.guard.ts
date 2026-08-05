import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AdminRole } from '@openeventhub/database';
import type { Request } from 'express';

import type { AdminJwtPayload } from './admin-jwt.guard.js';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { admin?: AdminJwtPayload }>();
    if (!request.admin) {
      throw new UnauthorizedException('Missing authenticated admin');
    }

    if (!required.includes(request.admin.role as AdminRole)) {
      throw new ForbiddenException(`Requires one of roles: ${required.join(', ')}`);
    }

    return true;
  }
}
