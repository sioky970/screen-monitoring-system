import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: RedisClientType,
  ) {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.redisClient.on('connect', () => {
      this.logger.log('Redis客户端连接成功');
      this.isConnected = true;
    });

    this.redisClient.on('ready', () => {
      this.logger.log('Redis客户端准备就绪');
    });

    this.redisClient.on('error', (error) => {
      this.logger.error('Redis连接错误:', error.message);
      this.isConnected = false;
    });

    this.redisClient.on('end', () => {
      this.logger.warn('Redis连接已断开');
      this.isConnected = false;
    });

    this.redisClient.on('reconnecting', () => {
      this.logger.log('Redis正在重连...');
    });
  }

  async onModuleInit() {
    try {
      await this.redisClient.connect();
      this.logger.log('Redis服务初始化完成');
    } catch (error) {
      this.logger.error('Redis初始化失败:', error.message);
      // 不抛出错误，让应用继续运行
    }
  }

  async onModuleDestroy() {
    try {
      await this.redisClient.quit();
      this.logger.log('Redis连接已关闭');
    } catch (error) {
      this.logger.error('关闭Redis连接时出错:', error.message);
    }
  }

  private async ensureConnection(): Promise<boolean> {
    if (!this.isConnected) {
      try {
        await this.redisClient.connect();
        return true;
      } catch (error) {
        this.logger.error('重连Redis失败:', error.message);
        return false;
      }
    }
    return true;
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!(await this.ensureConnection())) {
        this.logger.warn(`Redis未连接，无法执行GET操作: ${key}`);
        return null;
      }
      return await this.redisClient.get(key);
    } catch (error) {
      this.logger.error(`Redis GET操作失败 [${key}]:`, error.message);
      return null;
    }
  }

  async set(
    key: string,
    value: string,
    ttl?: number,
  ): Promise<void> {
    try {
      if (!(await this.ensureConnection())) {
        this.logger.warn(`Redis未连接，无法执行SET操作: ${key}`);
        return;
      }
      if (ttl) {
        await this.redisClient.setEx(key, ttl, value);
      } else {
        await this.redisClient.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Redis SET操作失败 [${key}]:`, error.message);
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!(await this.ensureConnection())) {
        this.logger.warn(`Redis未连接，无法执行DEL操作: ${key}`);
        return;
      }
      await this.redisClient.del(key);
    } catch (error) {
      this.logger.error(`Redis DEL操作失败 [${key}]:`, error.message);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!(await this.ensureConnection())) {
        this.logger.warn(`Redis未连接，无法执行EXISTS操作: ${key}`);
        return false;
      }
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis EXISTS操作失败 [${key}]:`, error.message);
      return false;
    }
  }

  async hget(key: string, field: string): Promise<string | undefined> {
    try {
      if (!(await this.ensureConnection())) {
        this.logger.warn(`Redis未连接，无法执行HGET操作: ${key}.${field}`);
        return undefined;
      }
      return await this.redisClient.hGet(key, field);
    } catch (error) {
      this.logger.error(`Redis HGET操作失败 [${key}.${field}]:`, error.message);
      return undefined;
    }
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    try {
      if (!(await this.ensureConnection())) {
        this.logger.warn(`Redis未连接，无法执行HSET操作: ${key}.${field}`);
        return;
      }
      await this.redisClient.hSet(key, field, value);
    } catch (error) {
      this.logger.error(`Redis HSET操作失败 [${key}.${field}]:`, error.message);
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      if (!(await this.ensureConnection())) {
        this.logger.warn(`Redis未连接，无法执行HGETALL操作: ${key}`);
        return {};
      }
      return await this.redisClient.hGetAll(key);
    } catch (error) {
      this.logger.error(`Redis HGETALL操作失败 [${key}]:`, error.message);
      return {};
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    try {
      if (!(await this.ensureConnection())) {
        this.logger.warn(`Redis未连接，无法执行HDEL操作: ${key}.${field}`);
        return;
      }
      await this.redisClient.hDel(key, field);
    } catch (error) {
      this.logger.error(`Redis HDEL操作失败 [${key}.${field}]:`, error.message);
    }
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    try {
      if (!(await this.ensureConnection())) {
        this.logger.warn(`Redis未连接，无法执行SADD操作: ${key}`);
        return;
      }
      await this.redisClient.sAdd(key, members);
    } catch (error) {
      this.logger.error(`Redis SADD操作失败 [${key}]:`, error.message);
    }
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    try {
      if (!(await this.ensureConnection())) {
        this.logger.warn(`Redis未连接，无法执行SREM操作: ${key}`);
        return;
      }
      await this.redisClient.sRem(key, members);
    } catch (error) {
      this.logger.error(`Redis SREM操作失败 [${key}]:`, error.message);
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      if (!(await this.ensureConnection())) {
        this.logger.warn(`Redis未连接，无法执行SMEMBERS操作: ${key}`);
        return [];
      }
      return await this.redisClient.sMembers(key);
    } catch (error) {
      this.logger.error(`Redis SMEMBERS操作失败 [${key}]:`, error.message);
      return [];
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    try {
      if (!(await this.ensureConnection())) {
        this.logger.warn(`Redis未连接，无法执行SISMEMBER操作: ${key}`);
        return false;
      }
      return await this.redisClient.sIsMember(key, member);
    } catch (error) {
      this.logger.error(`Redis SISMEMBER操作失败 [${key}]:`, error.message);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      if (!(await this.ensureConnection())) {
        this.logger.warn(`Redis未连接，无法执行EXPIRE操作: ${key}`);
        return;
      }
      await this.redisClient.expire(key, seconds);
    } catch (error) {
      this.logger.error(`Redis EXPIRE操作失败 [${key}]:`, error.message);
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      if (!(await this.ensureConnection())) {
        this.logger.warn(`Redis未连接，无法执行TTL操作: ${key}`);
        return -1;
      }
      return await this.redisClient.ttl(key);
    } catch (error) {
      this.logger.error(`Redis TTL操作失败 [${key}]:`, error.message);
      return -1;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      if (!(await this.ensureConnection())) {
        this.logger.warn(`Redis未连接，无法执行KEYS操作: ${pattern}`);
        return [];
      }
      return await this.redisClient.keys(pattern);
    } catch (error) {
      this.logger.error(`Redis KEYS操作失败 [${pattern}]:`, error.message);
      return [];
    }
  }

  async flushdb(): Promise<void> {
    try {
      if (!(await this.ensureConnection())) {
        this.logger.warn(`Redis未连接，无法执行FLUSHDB操作`);
        return;
      }
      await this.redisClient.flushDb();
    } catch (error) {
      this.logger.error(`Redis FLUSHDB操作失败:`, error.message);
    }
  }
}