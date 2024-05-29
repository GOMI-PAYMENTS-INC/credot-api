import { RedisService } from '@liaoliaots/nestjs-redis';
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class CustomRedisService {
  private client: Redis;
  constructor(private readonly redisService: RedisService) {
    this.client = this.redisService.getClient();
  }

  async get(key: string): Promise<any> {
    return await this.client.get(key);
  }

  async set(key: string, value: any, seconds?: number): Promise<void> {
    if (!seconds) {
      await this.client.set(key, value);
      return;
    }

    await this.client.set(key, value, 'EX', seconds);
  }

  async setnx(key: string, value: any): Promise<void> {
    await this.client.setnx(key, value);
  }

  async increment(key: string, value: number): Promise<number> {
    return this.client.incrby(key, value);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async expire(key: string, seconds = 10) {
    await this.client.expire(key, seconds);
  }
}
