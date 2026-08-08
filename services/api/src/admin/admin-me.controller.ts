import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { AdminRole, AdminUserRepository } from '@openeventhub/database';
import bcrypt from 'bcryptjs';

import { AuditService } from '../audit/audit.service.js';
import { AdminJwtAuthGuard, type AdminJwtPayload } from '../auth/admin-jwt.guard.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

@ApiTags('admin-me')
@ApiBearerAuth()
@Controller('api/v1/admin/me')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
export class AdminMeController {
  constructor(
    private readonly users: AdminUserRepository,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async get(@CurrentAdmin() admin: AdminJwtPayload) {
    const user = await this.users.findById(admin.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Patch()
  async update(
    @Body()
    body: {
      email?: string;
      currentPassword?: string;
      password?: string;
    },
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    const authUser = await this.users.findAuthById(admin.sub);
    if (!authUser) {
      throw new NotFoundException('User not found');
    }

    const wantsEmail = body.email !== undefined;
    const wantsPassword = Boolean(body.password);
    if (!wantsEmail && !wantsPassword) {
      throw new BadRequestException('Nothing to update');
    }

    const currentPassword = body.currentPassword ?? '';
    if (!currentPassword) {
      throw new BadRequestException('currentPassword is required');
    }
    if (!(await bcrypt.compare(currentPassword, authUser.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    let user = await this.users.findById(admin.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (wantsEmail) {
      const email = body.email!.trim().toLowerCase();
      if (!email || !email.includes('@')) {
        throw new BadRequestException('Valid email required');
      }
      const conflict = await this.users.findByEmail(email);
      if (conflict && conflict.id !== admin.sub) {
        throw new BadRequestException('User already exists');
      }
      user = await this.users.updateEmail(admin.sub, email);
    }

    if (wantsPassword) {
      if (!body.password || body.password.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters');
      }
      const passwordHash = await bcrypt.hash(body.password, 12);
      user = await this.users.updatePassword(admin.sub, passwordHash);
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    this.audit.record({
      action: 'user.profile_update',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'admin_user',
      resourceId: user.id,
      metadata: {
        emailChanged: wantsEmail,
        passwordChanged: wantsPassword,
      },
    });

    return {
      user: { id: user.id, email: user.email, role: user.role },
      accessToken,
      tokenType: 'Bearer',
    };
  }
}
