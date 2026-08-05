import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { EventsService } from '../events/events.service.js';

@ApiTags('search')
@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Search published events' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  search(@Query('q') q = '', @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.events.search(
      q,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
    );
  }
}
