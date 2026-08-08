import { Body, Controller, Get, Put, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AdminRole,
  CategoryImportAllowlistRepository,
  CategoryRepository,
} from '@openeventhub/database';

import { AuditService } from '../audit/audit.service.js';
import { AdminJwtAuthGuard, type AdminJwtPayload } from '../auth/admin-jwt.guard.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

@ApiTags('admin-category-import-allowlist')
@ApiBearerAuth()
@Controller('api/v1/admin/category-import-allowlist')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin, AdminRole.moderator)
export class AdminCategoryImportAllowlistController {
  constructor(
    private readonly allowlist: CategoryImportAllowlistRepository,
    private readonly categories: CategoryRepository,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
  async get() {
    const categories = await this.allowlist.listCategories();
    return {
      categoryIds: categories.map((row) => row.id),
      categories,
    };
  }

  @Put()
  async put(@Body() body: { categoryIds?: string[] }, @CurrentAdmin() admin: AdminJwtPayload) {
    const categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds : [];
    for (const id of categoryIds) {
      const category = await this.categories.findById(id);
      if (!category) {
        throw new BadRequestException(`Unknown categoryId: ${id}`);
      }
    }
    const saved = await this.allowlist.setCategoryIds(categoryIds);
    const categories = await this.allowlist.listCategories();
    this.audit.record({
      action: 'category_import_allowlist.update',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'category_import_allowlist',
      resourceId: 'singleton',
      metadata: { categoryIds: saved },
    });
    return { categoryIds: saved, categories };
  }
}
