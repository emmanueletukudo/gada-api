import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  constructor(@Inject(Redis) private readonly redis: Redis) {}

  async set(
    key: string,
    value: string,
    ttlSeconds: number = 600,
  ): Promise<void> {
    await this.redis.set(key, value, 'EX', ttlSeconds);
  }

 
  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
