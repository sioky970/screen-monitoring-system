import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Redis from 'redis';
import { Client as MinioClient } from 'minio';

// 服务提供者
import { RedisService } from './services/redis.service';
import { MinioService } from './services/minio.service';
import { UploadQueueService } from './services/upload-queue.service';
import { CryptoService } from './services/crypto.service';
import { DateService } from './services/date.service';

@Global()
@Module({
  providers: [
    // Redis客户端
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        return Redis.createClient({
          socket: {
            host: redisConfig.host,
            port: redisConfig.port,
            connectTimeout: redisConfig.connectTimeout,
            keepAlive: 30000, // 30秒保活
            reconnectStrategy: (retries) => {
              // 指数退避重连策略
              const delay = Math.min(retries * 50, 2000);
              return delay;
            },
          },
          commandsQueueMaxLength: 1000,
          password: redisConfig.password,
          database: redisConfig.db,
        });
      },
      inject: [ConfigService],
    },

    // MinIO客户端
    {
      provide: 'MINIO_CLIENT',
      useFactory: (configService: ConfigService) => {
        const minioConfig = configService.get('minio');
        return new MinioClient({
          endPoint: minioConfig.endPoint,
          port: minioConfig.port,
          useSSL: minioConfig.useSSL,
          accessKey: minioConfig.accessKey,
          secretKey: minioConfig.secretKey,
          // 优化连接配置
          region: 'us-east-1',
        });
      },
      inject: [ConfigService],
    },

    // 服务
    RedisService,
    MinioService,
    UploadQueueService,
    CryptoService,
    DateService,
  ],
  exports: [
    'REDIS_CLIENT',
    'MINIO_CLIENT',
    RedisService,
    MinioService,
    UploadQueueService,
    CryptoService,
    DateService,
  ],
})
export class CommonModule {}