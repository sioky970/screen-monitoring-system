import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient, BucketItem } from 'minio';
import * as crypto from 'crypto';

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  etag: string;
  size: number;
  contentType: string;
}

@Injectable()
export class MinioService {
  private readonly bucketName: string;

  constructor(
    @Inject('MINIO_CLIENT')
    private readonly minioClient: MinioClient,
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.get('minio.bucketName');
    this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        console.log(`✅ MinIO bucket created: ${this.bucketName}`);
      }
    } catch (error) {
      console.error('MinIO bucket creation error:', error);
    }
  }

  async uploadFile(
    file: Buffer,
    originalName: string,
    contentType: string,
    folder = '',
  ): Promise<UploadResult> {
    const fileHash = crypto.createHash('md5').update(file).digest('hex');
    const ext = originalName.split('.').pop() || '';
    const key = folder
      ? `${folder}/${Date.now()}-${fileHash}.${ext}`
      : `${Date.now()}-${fileHash}.${ext}`;

    const metadata = {
      'Content-Type': contentType,
      'X-Original-Name': originalName,
      'X-Upload-Time': new Date().toISOString(),
    };

    const uploadInfo = await this.minioClient.putObject(
      this.bucketName,
      key,
      file,
      file.length,
      metadata,
    );

    const url = await this.getFileUrl(key);

    return {
      url,
      key,
      bucket: this.bucketName,
      etag: uploadInfo.etag,
      size: file.length,
      contentType,
    };
  }

  async uploadScreenshot(
    clientId: string,
    screenshot: Buffer,
    timestamp: Date,
  ): Promise<UploadResult> {
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-');
    const folder = `screenshots/${clientId}/${dateStr}`;
    const fileName = `screenshot-${timeStr}.jpg`;

    return await this.uploadFile(
      screenshot,
      fileName,
      'image/jpeg',
      folder,
    );
  }

  async uploadSecurityAlert(
    clientId: string,
    alertId: string,
    screenshot: Buffer,
  ): Promise<UploadResult> {
    const dateStr = new Date().toISOString().split('T')[0];
    const folder = `security/${clientId}/${dateStr}`;
    const fileName = `alert-${alertId}.jpg`;

    return await this.uploadFile(
      screenshot,
      fileName,
      'image/jpeg',
      folder,
    );
  }

  async getFileUrl(key: string, expiry = 60 * 60 * 24): Promise<string> {
    return await this.minioClient.presignedGetObject(
      this.bucketName,
      key,
      expiry,
    );
  }

  async getFile(key: string): Promise<Buffer> {
    const stream = await this.minioClient.getObject(this.bucketName, key);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async deleteFile(key: string): Promise<void> {
    await this.minioClient.removeObject(this.bucketName, key);
  }

  async listFiles(prefix = '', maxKeys = 1000): Promise<BucketItem[]> {
    const files: BucketItem[] = [];
    const stream = this.minioClient.listObjectsV2(
      this.bucketName,
      prefix,
      true,
    );

    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => {
        files.push(obj);
        if (files.length >= maxKeys) {
          stream.destroy();
        }
      });
      stream.on('end', () => resolve(files));
      stream.on('error', reject);
    });
  }

  async getFileInfo(key: string): Promise<any> {
    return await this.minioClient.statObject(this.bucketName, key);
  }

  async copyFile(sourceKey: string, destKey: string): Promise<void> {
    const copySource = `/${this.bucketName}/${sourceKey}`;
    await this.minioClient.copyObject(
      this.bucketName,
      destKey,
      copySource,
    );
  }

  getBucketName(): string {
    return this.bucketName;
  }
}