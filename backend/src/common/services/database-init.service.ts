import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeDatabase();
  }

  /**
   * 初始化数据库
   * 确保数据库连接正常，并根据配置同步表结构
   */
  private async initializeDatabase(): Promise<void> {
    try {
      this.logger.log('🔄 开始初始化数据库...');

      // 检查数据库连接
      if (!this.dataSource.isInitialized) {
        this.logger.log('📡 正在建立数据库连接...');
        await this.dataSource.initialize();
        this.logger.log('✅ 数据库连接建立成功');
      }

      // 获取同步配置
      const shouldSynchronize = this.configService.get<boolean>('DB_SYNCHRONIZE', false);
      const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
      
      this.logger.log(`🔧 当前环境: ${nodeEnv}`);
      this.logger.log(`🔄 数据库同步设置: ${shouldSynchronize ? '启用' : '禁用'}`);

      if (shouldSynchronize) {
        this.logger.log('🔄 开始同步数据库表结构...');
        
        // 同步数据库表结构
        await this.dataSource.synchronize();
        
        this.logger.log('✅ 数据库表结构同步完成');
        
        // 验证表结构
        await this.validateTableStructure();
      } else {
        this.logger.log('⚠️  数据库同步已禁用，跳过表结构同步');
        
        // 即使不同步，也要验证基本连接
        await this.validateConnection();
      }

      this.logger.log('🎉 数据库初始化完成');
    } catch (error) {
      this.logger.error('❌ 数据库初始化失败:', error.message);
      this.logger.error('详细错误信息:', error.stack);
      
      // 在开发环境下，数据库初始化失败应该终止应用
      if (this.configService.get('NODE_ENV') === 'development') {
        process.exit(1);
      }
      
      throw error;
    }
  }

  /**
   * 验证数据库连接
   */
  private async validateConnection(): Promise<void> {
    try {
      await this.dataSource.query('SELECT 1');
      this.logger.log('✅ 数据库连接验证成功');
    } catch (error) {
      this.logger.error('❌ 数据库连接验证失败:', error.message);
      throw error;
    }
  }

  /**
   * 验证表结构
   */
  private async validateTableStructure(): Promise<void> {
    try {
      const entities = this.dataSource.entityMetadatas;
      this.logger.log(`📊 验证 ${entities.length} 个实体的表结构...`);

      for (const entity of entities) {
        const tableName = entity.tableName;
        
        // 检查表是否存在
        const tableExists = await this.checkTableExists(tableName);
        
        if (tableExists) {
          this.logger.log(`✅ 表 '${tableName}' 存在且结构正确`);
        } else {
          this.logger.warn(`⚠️  表 '${tableName}' 不存在`);
        }
      }

      this.logger.log('✅ 表结构验证完成');
    } catch (error) {
      this.logger.error('❌ 表结构验证失败:', error.message);
      throw error;
    }
  }

  /**
   * 检查表是否存在
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const dbType = this.configService.get('DB_TYPE', 'mysql');
      
      let query: string;
      if (dbType === 'sqlite') {
        query = `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`;
      } else {
        // MySQL
        const database = this.configService.get('DB_DATABASE');
        query = `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${database}' AND TABLE_NAME = '${tableName}'`;
      }
      
      const result = await this.dataSource.query(query);
      return result.length > 0;
    } catch (error) {
      this.logger.error(`检查表 '${tableName}' 是否存在时出错:`, error.message);
      return false;
    }
  }

  /**
   * 获取数据库信息
   */
  async getDatabaseInfo(): Promise<any> {
    try {
      const dbType = this.configService.get('DB_TYPE', 'mysql');
      const entities = this.dataSource.entityMetadatas;
      
      const info = {
        type: dbType,
        isConnected: this.dataSource.isInitialized,
        entityCount: entities.length,
        entities: entities.map(entity => ({
          name: entity.name,
          tableName: entity.tableName,
          columnCount: entity.columns.length,
        })),
      };

      if (dbType === 'mysql') {
        info['host'] = this.configService.get('DB_HOST');
        info['port'] = this.configService.get('DB_PORT');
        info['database'] = this.configService.get('DB_DATABASE');
      } else {
        info['database'] = this.configService.get('DB_DATABASE', './database.sqlite');
      }

      return info;
    } catch (error) {
      this.logger.error('获取数据库信息失败:', error.message);
      throw error;
    }
  }
}