import { registerAs } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export const typeormConfig = registerAs('typeorm', (): DataSourceOptions => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  const dbType = process.env.DB_TYPE || 'mysql';
  
  // 数据库同步策略：
  // 1. 开发环境：默认启用同步
  // 2. 生产环境：通过环境变量控制，默认启用（确保表结构完美适配）
  // 3. 可通过 DB_SYNCHRONIZE 环境变量强制控制
  const shouldSynchronize = process.env.DB_SYNCHRONIZE === 'true' || 
    (process.env.DB_SYNCHRONIZE !== 'false' && (isDevelopment || isProduction));

  // 支持SQLite和MySQL数据库
  if (dbType === 'sqlite') {
    return {
      type: 'sqlite',
      database: process.env.DB_DATABASE || './database.sqlite',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      synchronize: shouldSynchronize,
      migrationsRun: false,
      logging: isDevelopment
        ? ['error', 'schema', 'warn', 'info', 'log']
        : ['error'],
      namingStrategy: new SnakeNamingStrategy(),
    };
  }

  // MySQL 配置
  return {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'screen_monitoring',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: shouldSynchronize,
    migrationsRun: false, // 不自动运行迁移，手动控制
    logging: isDevelopment
      ? ['error', 'schema', 'warn', 'info', 'log']
      : ['error'],
    timezone: '+08:00',
    charset: 'utf8mb4',
    namingStrategy: new SnakeNamingStrategy(), // 使用蛇形命名策略，统一为下划线
    extra: {
      connectionLimit: 50,
      idleTimeout: 300000,
      acquireTimeout: 60000,
      timeout: 60000,
    },
  };
});

// DataSource will be created by TypeORM module