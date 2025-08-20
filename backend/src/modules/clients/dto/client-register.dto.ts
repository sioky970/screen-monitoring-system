import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClientRegisterDto {
  @ApiPropertyOptional({ 
    description: '客户端UID（如果提供且存在则认证，否则注册新客户端）',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '客户端UID不能超过50个字符' })
  uid?: string;

  @ApiProperty({ 
    description: '计算机名称',
    example: 'DESKTOP-ABC123'
  })
  @IsString()
  @MaxLength(100, { message: '计算机名称不能超过100个字符' })
  computerName: string;

  @ApiPropertyOptional({ 
    description: '操作系统信息',
    example: 'Windows 10 Pro'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '操作系统信息不能超过100个字符' })
  osInfo?: string;

  @ApiPropertyOptional({ 
    description: '客户端版本',
    example: '1.0.0'
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: '客户端版本不能超过20个字符' })
  version?: string;

  @ApiPropertyOptional({ 
    description: '用户名',
    example: 'Administrator'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '用户名不能超过50个字符' })
  username?: string;

  @ApiPropertyOptional({ 
    description: 'IP地址',
    example: '192.168.1.100'
  })
  @IsOptional()
  @IsString()
  @MaxLength(45, { message: 'IP地址不能超过45个字符' })
  ipAddress?: string;
}
