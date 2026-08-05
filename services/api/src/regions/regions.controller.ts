import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RegionRepository } from '@openeventhub/database';

@ApiTags('regions')
@Controller('api/v1/regions')
export class RegionsController {
  constructor(private readonly regions: RegionRepository) {}

  @Get()
  @ApiOperation({ summary: 'List regions' })
  list() {
    return this.regions.list();
  }
}
