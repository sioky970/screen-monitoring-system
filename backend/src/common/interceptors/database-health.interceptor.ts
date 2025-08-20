import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Observable, throwError, from } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { DATABASE_HEALTH_KEY, DATABASE_SYNC_KEY } from '../decorators/database-health.decorator';

@Injectable()
export class DatabaseHealthInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DatabaseHealthInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const requiresHealthCheck = this.reflector.getAllAndOverride<boolean>(
      DATABASE_HEALTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiresSyncCheck = this.reflector.getAllAndOverride<boolean>(
      DATABASE_SYNC_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果不需要检查，直接继续
    if (!requiresHealthCheck && !requiresSyncCheck) {
      return next.handle();
    }

    // 执行数据库健康检查
    return from(this.performHealthCheck(requiresHealthCheck, requiresSyncCheck)).pipe(
      switchMap(() => {
        return next.handle().pipe(
          tap(() => {
            // 请求成功后的日志
            if (requiresHealthCheck || requiresSyncCheck) {
              this.logger.debug('数据库健康检查通过，请求处理成功');
            }
          }),
          catchError((error) => {
            this.logger.error('请求处理失败:', error.message);
            return throwError(() => error);
          }),
        );
      }),
      catchError((error) => {
        this.logger.error('数据库健康检查失败:', error.message);
        return throwError(() => new ServiceUnavailableException('数据库服务不可用'));
      }),
    );
  }

  /**
   * 执行数据库健康检查
   */
  private async performHealthCheck(
    requiresHealthCheck: boolean,
    requiresSyncCheck: boolean,
  ): Promise<void> {
    try {
      if (requiresHealthCheck) {
        await this.checkDatabaseConnection();
      }

      if (requiresSyncCheck) {
        await this.checkDatabaseSync();
      }
    } catch (error) {
      this.logger.error('数据库健康检查失败:', error.message);
      throw error;
    }
  }

  /**
   * 检查数据库连接
   */
  private async checkDatabaseConnection(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      throw new Error('数据库连接未初始化');
    }

    try {
      await this.dataSource.query('SELECT 1');
      this.logger.debug('数据库连接检查通过');
    } catch (error) {
      this.logger.error('数据库连接检查失败:', error.message);
      throw new Error('数据库连接失败');
    }
  }

  /**
   * 检查数据库同步状态
   */
  private async checkDatabaseSync(): Promise<void> {
    try {
      const entities = this.dataSource.entityMetadatas;
      
      for (const entity of entities) {
        const tableName = entity.tableName;
        const tableExists = await this.checkTableExists(tableName);
        
        if (!tableExists) {
          throw new Error(`表 '${tableName}' 不存在，数据库同步可能未完成`);
        }
      }
      
      this.logger.debug('数据库同步状态检查通过');
    } catch (error) {
      this.logger.error('数据库同步检查失败:', error.message);
      throw error;
    }
  }

  /**
   * 检查表是否存在
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const dbType = this.dataSource.options.type;
      
      let query: string;
      if (dbType === 'sqlite') {
        query = `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`;
      } else if (dbType === 'mysql') {
        const database = (this.dataSource.options as any).database;
        query = `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${database}' AND TABLE_NAME = '${tableName}'`;
      } else {
        // 其他数据库类型的处理
        return true; // 暂时跳过检查
      }
      
      const result = await this.dataSource.query(query);
      return result.length > 0;
    } catch (error) {
      this.logger.error(`检查表 '${tableName}' 是否存在时出错:`, error.message);
      return false;
    }
  }
}