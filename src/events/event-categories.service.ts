import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventCategory } from './entities/event-category.entity';

@Injectable()
export class EventCategoriesService {
  constructor(
    @InjectRepository(EventCategory)
    private readonly categoryRepo: Repository<EventCategory>,
  ) {}

  async findAllActive(): Promise<EventCategory[]> {
    return await this.categoryRepo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async findBySlug(slug: string): Promise<EventCategory> {
    const category = await this.categoryRepo.findOne({
      where: { slug, isActive: true },
    });
    if (!category) {
      throw new NotFoundException(`Category '${slug}' not found`);
    }
    return category;
  }
}
