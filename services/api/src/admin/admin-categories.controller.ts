import {
  BadRequestException,
  Body,
  ConflictException,
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
import { AdminRole, CategoryRepository } from '@openeventhub/database';
import { Prisma } from '@prisma/client';

import { AuditService } from '../audit/audit.service.js';
import { AdminJwtAuthGuard, type AdminJwtPayload } from '../auth/admin-jwt.guard.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { slugifyLabel } from './slugify.js';

@ApiTags('admin-categories')
@ApiBearerAuth()
@Controller('api/v1/admin/categories')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin, AdminRole.moderator)
export class AdminCategoriesController {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
  list() {
    return this.categories.list();
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      slug?: string;
      parentId?: string | null;
    },
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    const name = body.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }
    const slug = (body.slug?.trim() || slugifyLabel(name)).toLowerCase();
    if (body.parentId) {
      const parent = await this.categories.findById(body.parentId);
      if (!parent) {
        throw new BadRequestException('parentId not found');
      }
    }
    try {
      const category = await this.categories.create({
        name,
        slug,
        parentId: body.parentId ?? null,
      });
      this.audit.record({
        action: 'category.create',
        actorId: admin.sub,
        actorRole: admin.role,
        resourceType: 'category',
        resourceId: category.id,
      });
      return category;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`Slug already in use: ${slug}`);
      }
      throw err;
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      slug?: string;
      parentId?: string | null;
    },
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    const existing = await this.categories.findById(id);
    if (!existing) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    if (body.parentId !== undefined && body.parentId !== null) {
      await this.assertValidParent(id, body.parentId);
    }

    if (body.slug !== undefined) {
      const slug = body.slug.trim().toLowerCase();
      if (!slug) {
        throw new BadRequestException('slug must not be empty');
      }
      const clash = await this.categories.findBySlug(slug);
      if (clash && clash.id !== id) {
        throw new ConflictException(`Slug already in use: ${slug}`);
      }
    }

    try {
      const category = await this.categories.update(id, {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.slug !== undefined ? { slug: body.slug.trim().toLowerCase() } : {}),
        ...(body.parentId !== undefined ? { parentId: body.parentId } : {}),
      });
      this.audit.record({
        action: 'category.update',
        actorId: admin.sub,
        actorRole: admin.role,
        resourceType: 'category',
        resourceId: category.id,
      });
      return category;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Slug already in use');
      }
      throw err;
    }
  }

  @Delete(':id')
  @Roles(AdminRole.admin)
  async remove(@Param('id') id: string, @CurrentAdmin() admin: AdminJwtPayload) {
    const existing = await this.categories.findById(id);
    if (!existing) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    const children = await this.categories.countChildren(id);
    if (children > 0) {
      throw new ConflictException('Category has child categories; reassign or delete them first');
    }
    const category = await this.categories.delete(id);
    this.audit.record({
      action: 'category.delete',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'category',
      resourceId: category.id,
    });
    return category;
  }

  private async assertValidParent(id: string, parentId: string): Promise<void> {
    if (parentId === id) {
      throw new BadRequestException('Category cannot be its own parent');
    }
    const parent = await this.categories.findById(parentId);
    if (!parent) {
      throw new BadRequestException('parentId not found');
    }
    let current: string | null = parent.parentId;
    const seen = new Set<string>([parentId]);
    while (current) {
      if (current === id) {
        throw new BadRequestException('Parent would create a cycle');
      }
      if (seen.has(current)) {
        break;
      }
      seen.add(current);
      const node = await this.categories.findById(current);
      current = node?.parentId ?? null;
    }
  }
}
