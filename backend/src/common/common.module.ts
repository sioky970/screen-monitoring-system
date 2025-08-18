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
            connectTimeout: redisConfig.connectTimeout || 10000,
            keepAlive: 30000, // 30秒保活
            noDelay: true, // 禁用Nagle算法，减少延迟
            reconnectStrategy: (retries) => {
              // 优化的指数退避重连策略
              if (retries > 10) {
                console.log('Redis重连次数过多，停止重连');
                return false; // 停止重连
              }
              const delay = Math.min(retries * 100, 3000);
              console.log(`Redis重连第${retries}次，延迟${delay}ms`);
              return delay;
            },
          },
          commandsQueueMaxLength: 2000, // 增加命令队列长度
          password: redisConfig.password,
          database: redisConfig.db,
          // 启用离线队列
          enableOfflineQueue: false,
          // 设置重试策略
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
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