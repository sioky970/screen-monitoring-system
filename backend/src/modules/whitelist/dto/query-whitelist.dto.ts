import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryWhitelistDto extends PaginationDto {
  @ApiProperty({
    description: '搜索关键词（地址或标签）',
    example: '1A1z',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: '地址类型过滤',
    example: 'BTC',
    required: false,
  })
  @IsOptional()
  @IsString()
  addressType?: string;

  @ApiProperty({
    description: '地址分类过滤',
    example: '公司钱包',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;
}
