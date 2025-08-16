import { IsOptional, IsInt, IsBoolean, Min, Max, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClientConfigDto {
  @ApiProperty({ description: '客户端ID', example: 'uuid-string' })
  clientId: string;

  @ApiProperty({ description: '截图上传间隔（秒）', example: 15, required: false })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(3600)
  @Type(() => Number)
  screenshotInterval?: number;

  @ApiProperty({ description: '心跳间隔（秒）', example: 30, required: false })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(300)
  @Type(() => Number)
  heartbeatInterval?: number;

  @ApiProperty({ description: '白名单同步间隔（秒）', example: 300, required: false })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  @Type(() => Number)
  whitelistSyncInterval?: number;

  @ApiProperty({ description: '图像压缩大小限制（KB）', example: 1024, required: false })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(10240)
  @Type(() => Number)
  imageCompressionLimit?: number;

  @ApiProperty({ description: '图像质量（1-100）', example: 80, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  imageQuality?: number;

  @ApiProperty({ description: '发现违规时是否清空剪贴板', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  clearClipboardOnViolation?: boolean;

  @ApiProperty({ description: '是否启用实时监控', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  enableRealTimeMonitoring?: boolean;

  @ApiProperty({ description: '是否启用剪贴板监控', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  enableClipboardMonitoring?: boolean;

  @ApiProperty({ description: '是否启用区块链地址检测', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  enableBlockchainDetection?: boolean;

  @ApiProperty({ description: '上传失败最大重试次数', example: 3, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  maxRetryAttempts?: number;

  @ApiProperty({ description: '网络请求超时时间（毫秒）', example: 30000, required: false })
  @IsOptional()
  @IsInt()
  @Min(5000)
  @Max(120000)
  @Type(() => Number)
  networkTimeout?: number;

  @ApiProperty({ description: '是否启用自动重连', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  enableAutoReconnect?: boolean;

  @ApiProperty({ description: '重连间隔（毫秒）', example: 5000, required: false })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(60000)
  @Type(() => Number)
  reconnectInterval?: number;

  @ApiProperty({ description: '扩展配置（JSON格式）', example: {}, required: false })
  @IsOptional()
  @IsObject()
  extendedSettings?: Record<string, any>;

  @ApiProperty({ description: '配置是否激活', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: '配置备注', example: '默认配置', required: false })
  @IsOptional()
  remark?: string;
}