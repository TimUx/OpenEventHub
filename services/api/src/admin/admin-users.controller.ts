import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole, AdminUserRepository } from '@openeventhub/database';
import bcrypt from 'bcryptjs';

import { AuditService } from '../audit/audit.service.js';
import { AdminJwtAuthGuard, type AdminJwtPayload } from '../auth/admin-jwt.guard.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

@ApiTags('admin-users')
@ApiBearerAuth()
@Controller('api/v1/admin/users')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin)
export class AdminUsersController {
  constructor(
    private readonly users: AdminUserRepository,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  async create(
    @Body() body: { email: string; password: string; role?: AdminRole },
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    if (!body.email?.trim() || !body.password || body.password.length < 8) {
      throw new BadRequestException('Email and password (min 8 chars) required');
    }
    const existing = await this.users.findByEmail(body.email);
    if (existing) {
      throw new BadRequestException('User already exists');
    }
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await this.users.create({
      email: body.email,
      passwordHash,
      role: body.role ?? AdminRole.moderator,
    });
    this.audit.record({
      action: 'user.create',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'admin_user',
      resourceId: user.id,
    });
    return user;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { email?: string; role?: AdminRole; password?: string },
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    const existing = await this.users.findById(id);
    if (!existing) {
      throw new NotFoundException(`User ${id} not found`);
    }
    let user = existing;

    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      if (!email || !email.includes('@')) {
        throw new BadRequestException('Valid email required');
      }
      const conflict = await this.users.findByEmail(email);
      if (conflict && conflict.id !== id) {
        throw new BadRequestException('User already exists');
      }
      user = await this.users.updateEmail(id, email);
    }

    if (body.role) {
      user = await this.users.updateRole(id, body.role);
    }
    if (body.password) {
      if (body.password.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters');
      }
      const passwordHash = await bcrypt.hash(body.password, 12);
      user = await this.users.updatePassword(id, passwordHash);
    }
    this.audit.record({
      action: 'user.update',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'admin_user',
      resourceId: user.id,
      metadata: {
        email: body.email,
        role: body.role,
        passwordChanged: Boolean(body.password),
      },
    });
    return user;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentAdmin() admin: AdminJwtPayload) {
    if (id === admin.sub) {
      throw new BadRequestException('Cannot delete your own account');
    }
    const count = await this.users.count();
    if (count <= 1) {
      throw new BadRequestException('Cannot delete the last admin user');
    }
    const existing = await this.users.findById(id);
    if (!existing) {
      throw new NotFoundException(`User ${id} not found`);
    }
    const user = await this.users.delete(id);
    this.audit.record({
      action: 'user.delete',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'admin_user',
      resourceId: user.id,
    });
    return user;
  }
}
