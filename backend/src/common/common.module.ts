import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Redis from 'redis';
import { Client as MinioClient } from 'minio';

// 服务提供者
import { RedisService } from './services/redis.service';
import { MinioService } from './services/minio.service';
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
          },
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
        });
      },
      inject: [ConfigService],
    },

    // 服务
    RedisService,
    MinioService,
    CryptoService,
    DateService,
  ],
  exports: [
    'REDIS_CLIENT',
    'MINIO_CLIENT',
    RedisService,
    MinioService,
    CryptoService,
    DateService,
  ],
})
export class CommonModule {}