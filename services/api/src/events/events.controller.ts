import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { EventsService } from './events.service.js';

@ApiTags('events')
@Controller('api/v1/events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List published events' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  list(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.events.list(
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a published event by id' })
  getById(@Param('id') id: string) {
    return this.events.getById(id);
  }
}
