import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EventRepository } from '@openeventhub/database';

@ApiTags('search')
@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly events: EventRepository) {}

  @Get()
  @ApiOperation({ summary: 'Search published events' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  search(@Query('q') q = '', @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.events.searchPublished({
      q,
      ...(limit ? { limit: Number(limit) } : {}),
      ...(offset ? { offset: Number(offset) } : {}),
    });
  }
}
