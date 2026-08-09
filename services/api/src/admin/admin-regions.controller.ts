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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole, RegionRepository, RegionType } from '@openeventhub/database';
import type { RegionHierarchyNode } from '@openeventhub/shared';
import { Prisma } from '@prisma/client';

import { AuditService } from '../audit/audit.service.js';
import { AdminJwtAuthGuard, type AdminJwtPayload } from '../auth/admin-jwt.guard.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { RegionLookupService } from '../geocoding/region-lookup.service.js';
import { slugifyLabel } from './slugify.js';

const REGION_TYPES = new Set<string>(Object.values(RegionType));

@ApiTags('admin-regions')
@ApiBearerAuth()
@Controller('api/v1/admin/regions')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin, AdminRole.moderator)
export class AdminRegionsController {
  constructor(
    private readonly regions: RegionRepository,
    private readonly lookup: RegionLookupService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
  list() {
    return this.regions.list();
  }

  @Get('lookup')
  @Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
  async lookupPlaces(@Query('q') q?: string) {
    const query = q?.trim() ?? '';
    if (query.length < 2) {
      return { query, candidates: [] };
    }
    try {
      return await this.lookup.lookup(query);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`Place lookup failed: ${message}`);
    }
  }

  @Post('from-lookup')
  async createFromLookup(
    @Body()
    body: {
      chain?: RegionHierarchyNode[];
      candidateId?: string;
      label?: string;
      lat?: number | null;
      lon?: number | null;
    },
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    const chain = Array.isArray(body.chain) ? body.chain : [];
    if (chain.length === 0) {
      throw new BadRequestException('chain is required');
    }
    for (const node of chain) {
      if (!node?.name?.trim() || !node.type || !REGION_TYPES.has(node.type)) {
        throw new BadRequestException('Invalid chain node');
      }
    }

    const coordinates =
      typeof body.lat === 'number' &&
      typeof body.lon === 'number' &&
      Number.isFinite(body.lat) &&
      Number.isFinite(body.lon)
        ? { latitude: body.lat, longitude: body.lon }
        : null;

    const result = await this.lookup.createFromChain(chain, coordinates);
    this.audit.record({
      action: 'region.create_chain',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'region',
      resourceId: result.leaf.id,
      metadata: {
        candidateId: body.candidateId ?? null,
        label: body.label ?? null,
        createdIds: result.createdIds,
        chain: chain.map((n) => `${n.type}:${n.name}`),
      },
    });
    return {
      leaf: result.leaf,
      regions: result.regions,
      createdCount: result.createdIds.length,
    };
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      slug?: string;
      type: RegionType;
      parentId?: string | null;
      isoCode?: string | null;
    },
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    const name = body.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }
    if (!body.type || !REGION_TYPES.has(body.type)) {
      throw new BadRequestException(`Invalid type: ${body.type}`);
    }
    const slug = (body.slug?.trim() || slugifyLabel(name)).toLowerCase();
    if (body.parentId) {
      const parent = await this.regions.findById(body.parentId);
      if (!parent) {
        throw new BadRequestException('parentId not found');
      }
    }
    try {
      const region = await this.regions.create({
        name,
        slug,
        type: body.type,
        parentId: body.parentId ?? null,
        isoCode: body.isoCode?.trim() || null,
      });
      this.audit.record({
        action: 'region.create',
        actorId: admin.sub,
        actorRole: admin.role,
        resourceType: 'region',
        resourceId: region.id,
      });
      return region;
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
      type?: RegionType;
      parentId?: string | null;
      isoCode?: string | null;
    },
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    const existing = await this.regions.findById(id);
    if (!existing) {
      throw new NotFoundException(`Region ${id} not found`);
    }

    if (body.type !== undefined && !REGION_TYPES.has(body.type)) {
      throw new BadRequestException(`Invalid type: ${body.type}`);
    }

    if (body.parentId !== undefined && body.parentId !== null) {
      await this.assertValidParent(id, body.parentId);
    }

    if (body.slug !== undefined) {
      const slug = body.slug.trim().toLowerCase();
      if (!slug) {
        throw new BadRequestException('slug must not be empty');
      }
      const clash = await this.regions.findBySlug(slug);
      if (clash && clash.id !== id) {
        throw new ConflictException(`Slug already in use: ${slug}`);
      }
    }

    try {
      const region = await this.regions.update(id, {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.slug !== undefined ? { slug: body.slug.trim().toLowerCase() } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.parentId !== undefined ? { parentId: body.parentId } : {}),
        ...(body.isoCode !== undefined ? { isoCode: body.isoCode?.trim() || null } : {}),
      });
      this.audit.record({
        action: 'region.update',
        actorId: admin.sub,
        actorRole: admin.role,
        resourceType: 'region',
        resourceId: region.id,
      });
      return region;
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
    const existing = await this.regions.findById(id);
    if (!existing) {
      throw new NotFoundException(`Region ${id} not found`);
    }
    const children = await this.regions.countChildren(id);
    if (children > 0) {
      throw new ConflictException('Region has child regions; reassign or delete them first');
    }
    const region = await this.regions.delete(id);
    this.audit.record({
      action: 'region.delete',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'region',
      resourceId: region.id,
    });
    return region;
  }

  private async assertValidParent(id: string, parentId: string): Promise<void> {
    if (parentId === id) {
      throw new BadRequestException('Region cannot be its own parent');
    }
    const parent = await this.regions.findById(parentId);
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
      const node = await this.regions.findById(current);
      current = node?.parentId ?? null;
    }
  }
}
