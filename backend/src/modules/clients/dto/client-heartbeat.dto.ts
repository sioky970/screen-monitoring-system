import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClientHeartbeatDto {
  @ApiProperty({ description: '客户端ID', example: 'client-001' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: '客户端IP地址', example: '192.168.1.100', required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ description: '客户端主机名', example: 'DESKTOP-ABC123', required: false })
  @IsOptional()
  @IsString()
  hostname?: string;

  @ApiProperty({ description: '操作系统信息', example: 'Windows 10', required: false })
  @IsOptional()
  @IsString()
  osInfo?: string;

  @ApiProperty({ description: '客户端版本', example: '1.0.0', required: false })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ description: '额外的客户端信息', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
