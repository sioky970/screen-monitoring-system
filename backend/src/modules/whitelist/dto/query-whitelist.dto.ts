import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryWhitelistDto {
  @ApiProperty({
    description: '页码',
    example: 1,
    required: false,
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: '每页大小',
    example: 20,
    required: false,
    minimum: 1,
    maximum: 100,
    default: 20
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiProperty({
    description: '搜索关键词（地址或标签）',
    example: '1A1z',
    required: false
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: '地址类型过滤',
    example: 'BTC',
    required: false
  })
  @IsOptional()
  @IsString()
  addressType?: string;

  @ApiProperty({
    description: '地址分类过滤',
    example: '公司钱包',
    required: false
  })
  @IsOptional()
  @IsString()
  category?: string;
}