import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'screen-monitor:',
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  // 连接超时配置
  connectTimeout: 10000, // 10秒连接超时
  commandTimeout: 5000, // 5秒命令超时
  // 重连配置
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // 连接池配置
  lazyConnect: true, // 延迟连接
}));
