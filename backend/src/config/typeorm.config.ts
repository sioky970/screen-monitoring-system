import { registerAs } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export const typeormConfig = registerAs(
  'typeorm',
  (): DataSourceOptions => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // 强制使用 MySQL 数据库
    return {
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'screen_monitoring',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      synchronize: process.env.DB_SYNCHRONIZE === 'true' || isDevelopment,
      migrationsRun: false, // 不自动运行迁移，手动控制
      logging: isDevelopment ? ['query', 'error', 'schema', 'warn', 'info', 'log'] : ['query', 'error'],
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
  },
);

// DataSource will be created by TypeORM module