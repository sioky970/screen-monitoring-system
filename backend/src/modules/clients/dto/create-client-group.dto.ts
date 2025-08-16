import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { Matches } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientGroupDto {
  @ApiProperty({ description: '分组名称' })
  @IsString()
  @IsNotEmpty({ message: '分组名称不能为空' })
  @MaxLength(100, { message: '分组名称不能超过100个字符' })
  name: string;

  @ApiPropertyOptional({ description: '分组描述' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '分组描述不能超过500个字符' })
  description?: string;

  @ApiPropertyOptional({ description: '分组颜色（#RRGGBB）', default: '#1890ff' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/i, { message: '颜色格式应为#RRGGBB' })
  color?: string;
}