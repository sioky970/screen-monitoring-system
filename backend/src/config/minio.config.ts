import { registerAs } from '@nestjs/config';

export const minioConfig = registerAs('minio', () => ({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
  bucketName: process.env.MINIO_BUCKET || 'monitoring-screenshots',
  region: process.env.MINIO_REGION || 'us-east-1',
  // 新增：通过 Nginx 对外暴露的公共访问前缀，既可填完整URL，也可填相对路径
  // 例如："/storage" 或 "https://assets.example.com/storage"
  publicBaseUrl: process.env.MINIO_PUBLIC_BASE_URL || '/storage',
}));
