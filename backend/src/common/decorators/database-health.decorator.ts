import { SetMetadata } from '@nestjs/common';

/**
 * 数据库健康检查装饰器
 * 用于标记需要数据库健康检查的控制器方法
 */
export const DATABASE_HEALTH_KEY = 'database_health';
export const DatabaseHealth = () => SetMetadata(DATABASE_HEALTH_KEY, true);

/**
 * 数据库同步检查装饰器
 * 用于标记需要检查数据库同步状态的方法
 */
export const DATABASE_SYNC_KEY = 'database_sync';
export const DatabaseSync = () => SetMetadata(DATABASE_SYNC_KEY, true);