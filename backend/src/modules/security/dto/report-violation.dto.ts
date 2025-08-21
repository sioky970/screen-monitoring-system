import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class ReportViolationDto {
  @ApiProperty({
    description: '客户端唯一ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsUUID()
  clientId: string;

  @ApiProperty({
    description: '违规类型',
    example: 'BLOCKCHAIN_ADDRESS',
  })
  @IsNotEmpty()
  @IsString()
  violationType: string;

  @ApiProperty({
    description: '违规内容',
    example: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  })
  @IsNotEmpty()
  @IsString()
  violationContent: string;

  @ApiProperty({
    description: '违规发生的时间戳 (ISO 8601)',
    example: '2025-08-21T10:00:00.000Z',
  })
  @IsNotEmpty()
  @IsString()
  timestamp: string;

  @ApiPropertyOptional({
    description: '其他附加数据 (JSON 字符串)',
    example: '{"clipboardContent":"..."}',
  })
  @IsOptional()
  @IsString()
  additionalData?: string;
}

