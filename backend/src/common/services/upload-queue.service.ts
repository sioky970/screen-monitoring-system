import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

interface UploadTask {
  id: string;
  clientId: string;
  buffer: Buffer;
  timestamp: Date;
  resolve: (result: any) => void;
  reject: (error: any) => void;
  retryCount: number;
  maxRetries: number;
}

@Injectable()
export class UploadQueueService extends EventEmitter {
  private readonly logger = new Logger(UploadQueueService.name);
  private readonly queue: UploadTask[] = [];
  private readonly processing = new Set<string>();
  private readonly maxConcurrent: number = 10; // 最大并发上传数
  private readonly maxQueueSize: number = 1000; // 最大队列长度
  private isProcessing = false;

  constructor() {
    super();
    this.startProcessing();
  }

  /**
   * 添加上传任务到队列
   */
  async addUploadTask(
    clientId: string,
    buffer: Buffer,
    uploadFunction: (buffer: Buffer) => Promise<any>,
    maxRetries: number = 3,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // 检查队列大小
      if (this.queue.length >= this.maxQueueSize) {
        reject(new Error('Upload queue is full. Please try again later.'));
        return;
      }

      const task: UploadTask = {
        id: `${clientId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clientId,
        buffer,
        timestamp: new Date(),
        resolve,
        reject,
        retryCount: 0,
        maxRetries,
      };

      this.queue.push(task);
      this.logger.debug(`Added upload task to queue: ${task.id}, queue size: ${this.queue.length}`);

      // 触发处理
      this.processQueue();
    });
  }

  /**
   * 开始处理队列
   */
  private startProcessing() {
    this.isProcessing = true;
    this.processQueue();

    // 定期清理超时任务
    setInterval(() => {
      this.cleanupExpiredTasks();
    }, 30000); // 30秒清理一次
  }

  /**
   * 处理队列中的任务
   */
  private async processQueue() {
    if (!this.isProcessing) return;

    while (this.queue.length > 0 && this.processing.size < this.maxConcurrent) {
      const task = this.queue.shift();
      if (!task) continue;

      this.processing.add(task.id);
      this.processTask(task);
    }
  }

  /**
   * 处理单个任务
   */
  private async processTask(task: UploadTask) {
    try {
      this.logger.debug(`Processing upload task: ${task.id}`);

      // 这里需要在调用时传入具体的上传函数
      // 由于我们需要访问MinioService，这个方法需要在调用时提供上传逻辑
      const result = await this.executeUpload(task);

      task.resolve(result);
      this.logger.debug(`Upload task completed: ${task.id}`);
    } catch (error) {
      this.logger.error(`Upload task failed: ${task.id}, error: ${error.message}`);

      // 重试逻辑
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        this.logger.debug(`Retrying upload task: ${task.id}, attempt: ${task.retryCount}`);

        // 延迟重试
        setTimeout(
          () => {
            this.queue.unshift(task); // 重新加入队列头部
            this.processQueue();
          },
          Math.min(1000 * Math.pow(2, task.retryCount), 10000),
        ); // 指数退避，最大10秒
      } else {
        task.reject(error);
      }
    } finally {
      this.processing.delete(task.id);
      this.processQueue(); // 继续处理下一个任务
    }
  }

  /**
   * 执行上传（需要在MinioService中实现具体逻辑）
   */
  private async executeUpload(_task: UploadTask): Promise<any> {
    // 这个方法会被MinioService重写
    throw new Error('Upload function not implemented');
  }

  /**
   * 清理过期任务
   */
  private cleanupExpiredTasks() {
    const now = new Date();
    const expiredTasks = this.queue.filter(task => {
      const age = now.getTime() - task.timestamp.getTime();
      return age > 300000; // 5分钟过期
    });

    expiredTasks.forEach(task => {
      const index = this.queue.indexOf(task);
      if (index > -1) {
        this.queue.splice(index, 1);
        task.reject(new Error('Upload task expired'));
        this.logger.warn(`Removed expired upload task: ${task.id}`);
      }
    });
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      queueSize: this.queue.length,
      processing: this.processing.size,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize,
    };
  }

  /**
   * 停止处理队列
   */
  stop() {
    this.isProcessing = false;
    this.logger.log('Upload queue processing stopped');
  }

  /**
   * 重新开始处理队列
   */
  start() {
    this.isProcessing = true;
    this.processQueue();
    this.logger.log('Upload queue processing started');
  }
}
