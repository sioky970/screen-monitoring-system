import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';

// 配置
import { typeormConfig } from './config/typeorm.config';
import { redisConfig } from './config/redis.config';
import { minioConfig } from './config/minio.config';

// 通用模块
import { CommonModule } from './common/common.module';

// 业务模块
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { SecurityModule } from './modules/security/security.module';
import { WhitelistModule } from './modules/whitelist/whitelist.module';
import { SystemModule } from './modules/system/system.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FilesModule } from './modules/files/files.module';

import { JwtGlobalAuthGuard } from './modules/auth/guards/jwt-global.guard';
import { StaticFilterMiddleware } from './common/middleware/static-filter.middleware';
import { LogFilterExceptionFilter } from './common/filters/log-filter.filter';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [typeormConfig, redisConfig, minioConfig],
    }),

    // 数据库连接
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => configService.get('typeorm'),
      inject: [ConfigService],
    }),

    // 定时任务
    ScheduleModule.forRoot(),

    // 限流
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 100,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 1000,
      },
    ]),

    // 通用模块
    CommonModule,

    // 业务模块
    AuthModule,
    ClientsModule,
    SecurityModule,
    WhitelistModule,
    SystemModule,
    NotificationsModule,
    FilesModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtGlobalAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: LogFilterExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 注册静态文件过滤中间件，应用到所有路由
    consumer.apply(StaticFilterMiddleware).forRoutes('*');
  }
}
