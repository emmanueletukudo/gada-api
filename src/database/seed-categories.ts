import { EventCategory } from '../events/entities/event-category.entity';
import { DataSource } from 'typeorm';

export const initialCategories = [
  { slug: 'community', name: 'Community', displayOrder: 1 },
  { slug: 'art_culture', name: 'Art & Culture', displayOrder: 2 },
  { slug: 'sport_wellness', name: 'Sports & Wellness', displayOrder: 3 },
  { slug: 'career_business', name: 'Career & Business', displayOrder: 4 },
  {
    slug: 'spirituality_religion',
    name: 'Spirituality & Religion',
    displayOrder: 5,
  },
  { slug: 'food_drink', name: 'Food & Drink', displayOrder: 6 },
  { slug: 'music', name: 'Music', displayOrder: 7 },
  { slug: 'rave_concert', name: 'Rave & Concert', displayOrder: 8 },
  { slug: 'tech', name: 'Tech', displayOrder: 9 },
  { slug: 'fashion', name: 'Fashion', displayOrder: 10 },
  {
    slug: 'trade_fairs',
    name: 'Exhibitions & Trade Fairs',
    displayOrder: 11,
  },
];

export async function seedCategories(dataSource: DataSource): Promise<void> {
  const categoryRepo = dataSource.getRepository(EventCategory);

  for (const cat of initialCategories) {
    await categoryRepo.upsert(
      {
        slug: cat.slug,
        name: cat.name,
        displayOrder: cat.displayOrder,
        isActive: true,
      },
      ['slug'],
    );
  }

  console.log('✅ Event categories successfully seeded');
}
