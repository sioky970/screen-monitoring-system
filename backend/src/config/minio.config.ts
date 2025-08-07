import { registerAs } from '@nestjs/config';

export const minioConfig = registerAs('minio', () => ({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
  bucketName: process.env.MINIO_BUCKET || 'monitoring-screenshots',
  region: process.env.MINIO_REGION || 'us-east-1',
}));