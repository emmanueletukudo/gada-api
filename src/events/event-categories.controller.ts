import { Controller, Get, Param } from '@nestjs/common';
import { EventCategoriesService } from './event-categories.service';

@Controller('event-categories')
export class EventCategoriesController {
  constructor(private readonly service: EventCategoriesService) {}

  @Get()
  async findAll() {
    const categories = await this.service.findAllActive();

    return categories.map((cat) => ({
      id: cat.id,
      value: cat.slug,
      label: cat.name,
      iconUrl: cat.iconUrl,
    }));
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    return await this.service.findBySlug(slug);
  }
}
