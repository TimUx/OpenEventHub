import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryRepository } from '@openeventhub/database';

@ApiTags('categories')
@Controller('api/v1/categories')
export class CategoriesController {
  constructor(private readonly categories: CategoryRepository) {}

  @Get()
  @ApiOperation({ summary: 'List categories' })
  list() {
    return this.categories.list();
  }
}
