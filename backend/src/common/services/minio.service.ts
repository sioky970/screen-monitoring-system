import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient, BucketItem, CopyConditions } from 'minio';
import * as crypto from 'crypto';
import { Readable } from 'stream';

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
  private readonly logger = new Logger(MinioService.name);
  private readonly bucketName: string;
  private readonly uploadSemaphore: Map<string, Promise<any>> = new Map();
  private readonly maxConcurrentUploads = 20; // 最大并发上传数
  private currentUploads = 0;

  constructor(
    @Inject('MINIO_CLIENT')
    private readonly minioClient: MinioClient | null,
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.get('minio.bucketName');
    if (this.minioClient) {
      this.ensureBucketExists();
    } else {
      this.logger.log('MinIO已禁用，跳过初始化');
    }
  }

  private async ensureBucketExists(): Promise<void> {
    if (!this.minioClient) {
      this.logger.log('MinIO已禁用，跳过bucket检查');
      return;
    }

    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`✅ MinIO bucket created: ${this.bucketName}`);

        // 设置bucket策略为公共读取
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };

        try {
          await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
          this.logger.log(`✅ MinIO bucket policy set for: ${this.bucketName}`);
        } catch (policyError) {
          this.logger.warn(`⚠️ Failed to set bucket policy: ${policyError.message}`);
        }
      } else {
        this.logger.log(`✅ MinIO bucket exists: ${this.bucketName}`);
      }
    } catch (error) {
      this.logger.error(`❌ MinIO bucket creation error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async uploadFile(
    file: Buffer,
    originalName: string,
    contentType: string,
    folder = '',
    forceOverwrite = false,
  ): Promise<UploadResult> {
    if (!this.minioClient) {
      throw new Error('MinIO已禁用，无法上传文件');
    }

    // 并发控制
    if (this.currentUploads >= this.maxConcurrentUploads) {
      throw new Error(
        `Too many concurrent uploads. Current: ${this.currentUploads}, Max: ${this.maxConcurrentUploads}`,
      );
    }

    const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.currentUploads++;

    try {
      this.logger.debug(`Starting upload ${uploadId}, concurrent uploads: ${this.currentUploads}`);

      let key: string;
      let fileHash: string;

      if (forceOverwrite) {
        // 强制覆盖模式：使用固定的文件名
        const _ext = originalName.split('.').pop() || '';
        key = folder ? `${folder}/${originalName}` : originalName;
        fileHash = crypto.createHash('md5').update(file).digest('hex');
      } else {
        // 普通模式：使用hash去重
        fileHash = crypto.createHash('md5').update(file).digest('hex');
        const ext = originalName.split('.').pop() || '';
        key = folder
          ? `${folder}/${Date.now()}-${fileHash}.${ext}`
          : `${Date.now()}-${fileHash}.${ext}`;

        // 检查文件是否已存在（去重）
        const existingUrl = await this.checkFileExists(fileHash, folder);
        if (existingUrl) {
          this.logger.debug(`File already exists, returning existing URL: ${existingUrl}`);
          return {
            url: existingUrl,
            key: `${folder}/${fileHash}.${ext}`,
            bucket: this.bucketName,
            etag: 'existing',
            size: file.length,
            contentType,
          };
        }
      }

      const metadata = {
        'Content-Type': contentType,
        'X-Original-Name': originalName,
        'X-Upload-Time': new Date().toISOString(),
        'X-File-Hash': fileHash,
      };

      // 使用流式上传减少内存占用
      const stream = new Readable();
      stream.push(file);
      stream.push(null);

      const uploadInfo = await this.minioClient.putObject(
        this.bucketName,
        key,
        stream,
        file.length,
        metadata,
      );

      const url = await this.getFileUrl(key);

      this.logger.debug(`Upload completed ${uploadId}: ${key}`);

      return {
        url,
        key,
        bucket: this.bucketName,
        etag: uploadInfo.etag,
        size: file.length,
        contentType,
      };
    } catch (error) {
      this.logger.error(`Upload failed ${uploadId}: ${error.message}`, error.stack);
      throw error;
    } finally {
      this.currentUploads--;
      this.logger.debug(`Upload finished ${uploadId}, concurrent uploads: ${this.currentUploads}`);
    }
  }

  // 检查文件是否已存在（基于hash去重）
  private async checkFileExists(fileHash: string, folder: string): Promise<string | null> {
    if (!this.minioClient) {
      return null;
    }

    try {
      const objects = this.minioClient.listObjects(this.bucketName, folder, true);

      for await (const obj of objects) {
        // 检查metadata中的hash
        try {
          const stat = await this.minioClient.statObject(this.bucketName, obj.name);
          if (stat.metaData && stat.metaData['x-file-hash'] === fileHash) {
            return await this.getFileUrl(obj.name);
          }
        } catch (statError) {
          // 忽略单个文件的stat错误
          continue;
        }
      }

      return null;
    } catch (error) {
      this.logger.warn(`Failed to check file existence: ${error.message}`);
      return null; // 如果检查失败，继续上传
    }
  }

  // 混合存储策略的截图上传
  async uploadScreenshot(
    clientId: string,
    screenshot: Buffer,
    isSecurityAlert = false,
  ): Promise<{
    currentUrl: string;
    alertUrl?: string;
    isArchived: boolean;
  }> {
    if (!this.minioClient) {
      throw new Error('MinIO已禁用，无法上传截图');
    }

    // 使用互斥锁确保同一客户端的上传操作是原子的
    const mutexKey = `upload_${clientId}`;

    if (this.uploadSemaphore.has(mutexKey)) {
      await this.uploadSemaphore.get(mutexKey);
    }

    const uploadPromise = this.performScreenshotUpload(clientId, screenshot, isSecurityAlert);
    this.uploadSemaphore.set(mutexKey, uploadPromise);

    try {
      const result = await uploadPromise;
      return result;
    } finally {
      this.uploadSemaphore.delete(mutexKey);
    }
  }

  // 执行实际的截图上传
  private async performScreenshotUpload(
    clientId: string,
    screenshot: Buffer,
    isSecurityAlert: boolean,
  ): Promise<{
    currentUrl: string;
    alertUrl?: string;
    isArchived: boolean;
  }> {
    // 1. 总是覆盖当前截图（固定URL）
    const currentResult = await this.uploadCurrentScreenshot(clientId, screenshot);

    let alertUrl: string | undefined;

    // 2. 如果是安全告警，额外保存一份历史截图
    if (isSecurityAlert) {
      const alertResult = await this.uploadAlertScreenshot(clientId, screenshot);
      alertUrl = alertResult.url;

      // 3. 异步清理过期的告警截图（保留30天）
      setImmediate(() => this.cleanupOldAlerts(clientId, 30));
    }

    return {
      currentUrl: currentResult.url,
      alertUrl,
      isArchived: isSecurityAlert,
    };
  }

  // 上传当前截图（固定URL，会覆盖）
  private async uploadCurrentScreenshot(
    clientId: string,
    screenshot: Buffer,
  ): Promise<UploadResult> {
    const folder = `screenshots/${clientId}`;
    return this.uploadFile(screenshot, 'current.jpg', 'image/jpeg', folder, true);
  }

  // 上传告警截图（历史保存）
  private async uploadAlertScreenshot(clientId: string, screenshot: Buffer): Promise<UploadResult> {
    const folder = `screenshots/${clientId}/alerts`;
    const filename = `alert_${Date.now()}.jpg`;
    return this.uploadFile(screenshot, filename, 'image/jpeg', folder, false);
  }

  // 清理过期的告警截图
  private async cleanupOldAlerts(clientId: string, retentionDays: number): Promise<void> {
    if (!this.minioClient) {
      return;
    }

    try {
      const alertFolder = `screenshots/${clientId}/alerts/`;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const objects = this.minioClient.listObjects(this.bucketName, alertFolder, true);
      const deleteList: string[] = [];

      for await (const obj of objects) {
        if (obj.lastModified && obj.lastModified < cutoffDate) {
          deleteList.push(obj.name);
        }
      }

      if (deleteList.length > 0) {
        await this.minioClient.removeObjects(this.bucketName, deleteList);
        this.logger.log(
          `Cleaned up ${deleteList.length} expired alert screenshots for client ${clientId}`,
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup old alerts for client ${clientId}: ${error.message}`);
    }
  }

  // 获取客户端当前截图的固定URL
  async getCurrentScreenshotUrl(clientId: string): Promise<string> {
    const key = `screenshots/${clientId}/current.jpg`;
    return this.getFileUrl(key);
  }

  // 获取客户端的告警截图列表
  async getAlertScreenshots(
    clientId: string,
    limit = 50,
  ): Promise<
    Array<{
      url: string;
      timestamp: Date;
      key: string;
    }>
  > {
    if (!this.minioClient) {
      return [];
    }

    try {
      const alertFolder = `screenshots/${clientId}/alerts/`;
      const objects = this.minioClient.listObjects(this.bucketName, alertFolder, true);
      const screenshots: Array<{ url: string; timestamp: Date; key: string }> = [];

      for await (const obj of objects) {
        if (screenshots.length >= limit) break;

        screenshots.push({
          url: await this.getFileUrl(obj.name),
          timestamp: obj.lastModified || new Date(),
          key: obj.name,
        });
      }

      // 按时间倒序排列（最新的在前）
      return screenshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      this.logger.warn(`Failed to get alert screenshots for client ${clientId}: ${error.message}`);
      return [];
    }
  }

  async getFileUrl(key: string, _expiry = 60 * 60 * 24): Promise<string> {
    // 通过 Nginx 代理（或自定义CDN）对外暴露的公共访问地址
    const base = this.configService.get('minio.publicBaseUrl', '/storage');
    const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const normalizedKey = key.startsWith('/') ? key.slice(1) : key;
    // 返回相对或绝对的公共URL，形如：/storage/<key>
    // 注意：不包含bucket名称，因为代理会处理路由到正确的bucket
    return `${normalizedBase}/${normalizedKey}`;
  }

  async getFile(key: string): Promise<Buffer> {
    if (!this.minioClient) {
      throw new Error('MinIO已禁用，无法获取文件');
    }

    const stream = await this.minioClient.getObject(this.bucketName, key);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.minioClient) {
      throw new Error('MinIO已禁用，无法删除文件');
    }

    await this.minioClient.removeObject(this.bucketName, key);
  }

  async listFiles(prefix = '', maxKeys = 1000): Promise<BucketItem[]> {
    if (!this.minioClient) {
      return [];
    }

    const files: BucketItem[] = [];
    const stream = this.minioClient.listObjectsV2(this.bucketName, prefix, true);

    return new Promise((resolve, reject) => {
      stream.on('data', obj => {
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
    if (!this.minioClient) {
      throw new Error('MinIO已禁用，无法获取文件信息');
    }

    return await this.minioClient.statObject(this.bucketName, key);
  }

  async copyFile(sourceKey: string, destKey: string): Promise<void> {
    if (!this.minioClient) {
      throw new Error('MinIO已禁用，无法复制文件');
    }

    const copySource = `/${this.bucketName}/${sourceKey}`;
    const conditions = new CopyConditions();
    await this.minioClient.copyObject(this.bucketName, destKey, copySource, conditions);
  }

  getBucketName(): string {
    return this.bucketName;
  }
}