import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: RedisClientType,
  ) {}

  async onModuleInit() {
    await this.redisClient.connect();
  }

  async get(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }

  async set(
    key: string,
    value: string,
    ttl?: number,
  ): Promise<void> {
    if (ttl) {
      await this.redisClient.setEx(key, ttl, value);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redisClient.exists(key);
    return result === 1;
  }

  async hget(key: string, field: string): Promise<string | undefined> {
    return await this.redisClient.hGet(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.redisClient.hSet(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.redisClient.hGetAll(key);
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.redisClient.hDel(key, field);
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    await this.redisClient.sAdd(key, members);
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    await this.redisClient.sRem(key, members);
  }

  async smembers(key: string): Promise<string[]> {
    return await this.redisClient.sMembers(key);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    return await this.redisClient.sIsMember(key, member);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redisClient.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return await this.redisClient.ttl(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.redisClient.keys(pattern);
  }

  async flushdb(): Promise<void> {
    await this.redisClient.flushDb();
  }
}