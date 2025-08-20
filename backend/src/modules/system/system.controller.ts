import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('📈 系统管理')
@Controller('system')
export class SystemController {
  constructor(
    private readonly systemService: SystemService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get('logs')
  @ApiOperation({ summary: '获取系统日志' })
  @ApiResponse({ status: 200, description: '成功获取系统日志' })
  findLogs() {
    return this.systemService.findLogs();
  }

  @Get('database/status')
  @Public()
  @ApiOperation({ 
    summary: '获取数据库状态', 
    description: '获取数据库连接状态、表结构信息和同步配置' 
  })
  @ApiResponse({ 
    status: 200, 
    description: '成功获取数据库状态信息',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: '数据库类型' },
        isConnected: { type: 'boolean', description: '是否已连接' },
        synchronize: { type: 'boolean', description: '是否启用同步' },
        entityCount: { type: 'number', description: '实体数量' },
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '实体名称' },
              tableName: { type: 'string', description: '表名' },
              columnCount: { type: 'number', description: '列数量' }
            }
          }
        }
      }
    }
  })
  async getDatabaseStatus() {
    try {
      const dbType = this.configService.get('DB_TYPE', 'mysql');
      const entities = this.dataSource.entityMetadatas;
      const synchronize = this.configService.get('DB_SYNCHRONIZE', 'true') === 'true';
      
      // 测试数据库连接
      let isConnected = false;
      try {
        await this.dataSource.query('SELECT 1');
        isConnected = true;
      } catch (error) {
        isConnected = false;
      }
      
      const info = {
        type: dbType,
        isConnected,
        synchronize,
        entityCount: entities.length,
        entities: entities.map(entity => ({
          name: entity.name,
          tableName: entity.tableName,
          columnCount: entity.columns.length,
        })),
        timestamp: new Date().toISOString(),
      };

      if (dbType === 'mysql') {
        info['host'] = this.configService.get('DB_HOST');
        info['port'] = this.configService.get('DB_PORT');
        info['database'] = this.configService.get('DB_DATABASE');
      } else {
        info['database'] = this.configService.get('DB_DATABASE', './database.sqlite');
      }

      return {
        success: true,
        data: info,
        message: '数据库状态获取成功'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: '获取数据库状态失败'
      };
    }
  }
}
