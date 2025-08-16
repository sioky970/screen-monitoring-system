import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ClientAuthDto {
  @ApiProperty({
    description: '客户端UID（首次请求可为空）',
    required: false,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @IsOptional()
  @IsUUID(4, { message: 'UID格式不正确' })
  uid?: string;

  @ApiProperty({
    description: '客户端编号',
    required: false,
    example: 'CLIENT-001'
  })
  @IsOptional()
  @IsString()
  clientNumber?: string;

  @ApiProperty({
    description: '客户端名称',
    required: false,
    example: '办公室电脑-001'
  })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiProperty({
    description: '计算机名称',
    required: false,
    example: 'DESKTOP-ABC123'
  })
  @IsOptional()
  @IsString()
  computerName?: string;

  @ApiProperty({
    description: '登录用户名',
    required: false,
    example: 'john.doe'
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({
    description: 'IP地址',
    required: false,
    example: '192.168.1.100'
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({
    description: 'MAC地址',
    required: false,
    example: '00:11:22:33:44:55'
  })
  @IsOptional()
  @IsString()
  macAddress?: string;

  @ApiProperty({
    description: '操作系统版本',
    required: false,
    example: 'Windows 11 Pro'
  })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiProperty({
    description: '客户端程序版本',
    required: false,
    example: '1.0.0'
  })
  @IsOptional()
  @IsString()
  clientVersion?: string;

  @ApiProperty({
    description: '屏幕分辨率',
    required: false,
    example: '1920x1080'
  })
  @IsOptional()
  @IsString()
  screenResolution?: string;
}

export class ClientAuthResponseDto {
  @ApiProperty({
    description: '客户端UID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  uid: string;

  @ApiProperty({
    description: '是否为新注册的客户端',
    example: true
  })
  isNewClient: boolean;

  @ApiProperty({
    description: '客户端信息',
    type: 'object'
  })
  client: any;

  @ApiProperty({
    description: '消息',
    example: '客户端认证成功'
  })
  message: string;
}